import osuClient from "@lib/osuClient";
import { getTopTradersToday } from "@lib/server/leaderboard";
import {
  getTrendingStocks,
  millisecondsUntilTradingBonus,
  refreshStock,
} from "@lib/server/stock";
import { NextApiResponse, NextApiRequest } from "next";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV !== "development") {
    return res
      .status(401)
      .json({ success: false, reason: "Unauthorized access" });
  }
  try {
    const data2 = await refreshStock({stock_id: 5212118})

    return res.status(200).json(data2);
  } catch (e) {
    return res.status(200).json(JSON.stringify(e));
  }
}

export default handler;
