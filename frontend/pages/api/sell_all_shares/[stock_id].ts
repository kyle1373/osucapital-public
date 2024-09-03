// List of hosted events from a specific host

import { NextApiRequest, NextApiResponse } from "next";
import {
  buyShares,
  calculateStockPrice,
  getUserStocks,
  refreshStock,
  sellShares,
} from "@lib/server/stock";
import { COINS, COOKIES, LIMIT, SETTINGS } from "@constants/constants";
import { getUserBySession } from "@lib/server/user";
import supabaseAdmin from "@lib/supabase/supabase";
import {
  hasDecimalsAfterTwoPlaces,
  isAfterMinutes,
  truncateToTwoDecimals,
} from "@lib/utils";
import osuClient from "@lib/osuClient";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (SETTINGS.SeasonClosed) {
    return res.status(401).send({ error: "Trading not allowed" });
  }
  const stockId = parseInt(req.query.stock_id as string);
  const session = req.cookies[COOKIES.userSession];
  const pulledUser = await getUserBySession(session);

  if (!stockId || isNaN(stockId)) {
    return res.status(400).send({ error: "Bad Request" });
  }

  if (!pulledUser) {
    return res.status(401).send({ error: "Unauthenticated" });
  }

  if (pulledUser.user_id === stockId) {
    return res.status(403).send({ error: "Forbidden" });
  }

  const userId = pulledUser.user_id;
  // pull stock from db
  const pulledStock = await supabaseAdmin
    .from("stocks")
    .select(
      "stock_id, last_updated, share_price, osu_name, osu_picture, osu_rank, osu_pp, osu_rank_history, prevent_trades, is_buyable, is_sellable, prevent_trades, is_banned"
    )
    .eq("stock_id", stockId)
    .single();

  if (pulledStock.error) {
    return res
      .status(400)
      .send({ error: "Error code TRADE1: " + pulledStock.error.message });
  }

  const preventTrades = pulledStock.data.prevent_trades;

  let stockBanned = pulledStock.data.is_banned;

  if (
    isAfterMinutes(
      pulledStock.data.last_updated,
      LIMIT.UpdateStockTradeMinutes
    ) &&
    !pulledStock.data.prevent_trades
  ) {
    // pull from osuClient and update db
    try {
      const { isBanned } = await refreshStock({ stock_id: stockId });
      stockBanned = isBanned;
    } catch (e) {
      return res.status(500).send({
        error: "Error code TRADE2: " + e?.message,
      });
    }
  }

  try {
    const numSharesSold = await supabaseAdmin
      .rpc("sell_all_shares", {
        p_stock_id: stockId,
        p_user_id: userId,
        p_percent_return: stockBanned ? 1 - COINS.BannedSellPenalty : 1,
        p_is_stock_banned: stockBanned ? true : false,
      })
      .single();

    if (numSharesSold.error) {
      throw new Error("Error code TRADE3: " + numSharesSold.error.message);
    }

    return res
      .status(200)
      .send({ data: "Successfully traded " + numSharesSold.data + " shares!" });
  } catch (e) {
    return res.status(400).send({ error: e.message });
  }
}

export default handler;
