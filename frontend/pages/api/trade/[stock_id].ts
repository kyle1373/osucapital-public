// List of hosted events from a specific host

import { NextApiRequest, NextApiResponse } from "next";
import {
  buyShares,
  calculateStockPrice,
  getUserStocks,
  refreshStock,
  sellShares,
} from "@lib/server/stock";
import { COOKIES, LIMIT, SETTINGS } from "@constants/constants";
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
  const allowedTradeTypes = ["buy", "sell"];
  const stockId = parseInt(req.query.stock_id as string);
  const seenSharePrice = parseFloat(req.body.seen_share_price);
  const numShares = truncateToTwoDecimals(parseFloat(req.body.num_shares));
  const tradeType: "buy" | "sell" = req.body.trade_type;
  const session = req.cookies[COOKIES.userSession];
  const pulledUser = await getUserBySession(session);

  if (
    !stockId ||
    isNaN(stockId) ||
    !numShares ||
    isNaN(numShares) ||
    numShares <= 0 ||
    !seenSharePrice ||
    isNaN(seenSharePrice) ||
    !tradeType ||
    !allowedTradeTypes.includes(tradeType)
  ) {
    return res.status(400).send({ error: "Bad Request" });
  }

  if (!pulledUser) {
    return res.status(401).send({ error: "Unauthenticated" });
  }

  if (pulledUser.user_id === stockId) {
    return res.status(403).send({ error: "Forbidden" });
  }

  // pull stock from db
  const pulledStock = await supabaseAdmin
    .from("stocks")
    .select(
      "stock_id, last_updated, share_price, osu_name, osu_picture, osu_rank, osu_pp, osu_rank_history, prevent_trades, is_buyable, is_sellable"
    )
    .eq("stock_id", stockId)
    .single();

  if (pulledStock.error) {
    return res
      .status(400)
      .send({ error: "Error code TRADE1: " + pulledStock.error.message });
  }

  let canBeBought =
    pulledStock.data.is_buyable && !pulledStock.data.prevent_trades;
  let canBeSold =
    pulledStock.data.is_sellable && !pulledStock.data.prevent_trades;

  let pulledSharePrice = pulledStock.data.share_price as number;
  // if last_updated from db more than LIMIT.tradeStockMinutes
  if (
    isAfterMinutes(
      pulledStock.data.last_updated,
      LIMIT.UpdateStockTradeMinutes
    ) &&
    !pulledStock.data.prevent_trades
  ) {
    // pull from osuClient and update db
    try {
      const { osuUser, stockPrice, canBuyStock, canSellStock } =
        await refreshStock({ stock_id: stockId });
      pulledSharePrice = stockPrice;
      canBeBought = canBuyStock && !pulledStock.data.prevent_trades;
      canBeSold = canSellStock && !pulledStock.data.prevent_trades;
    } catch (e) {
      return res.status(500).send({
        error: "Error code TRADE2: " + e?.message,
      });
    }
  }

  if (!pulledSharePrice || pulledSharePrice !== seenSharePrice) {
    return res
      .status(400)
      .send({ error: "Stock price has changed! Refresh the page." });
  }

  try {
    if (tradeType === "buy") {
      if (!canBeBought) {
        throw new Error("You currently cannot buy this stock");
      }
      await buyShares(pulledUser.user_id, stockId, numShares, pulledSharePrice);
    } else {
      if (!canBeSold) {
        throw new Error("You currently cannot sell this stock");
      }
      await sellShares(
        pulledUser.user_id,
        stockId,
        numShares,
        pulledSharePrice
      );
    }
  } catch (e) {
    return res.status(400).send({ error: e.message });
  }

  return res
    .status(200)
    .send({ data: "Successfully traded " + numShares + " shares!" });
}

export default handler;
