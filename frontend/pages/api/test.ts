import osuClient from "@lib/osuClient";
import { withRateLimit } from "@lib/ratelimiter";
import { getTopTradersToday } from "@lib/server/leaderboard";
import { getTrendingStocks, millisecondsUntilTradingBonus } from "@lib/server/stock";
import { NextApiResponse, NextApiRequest } from "next";

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const data2 = await osuClient.user.details(3973608, "mania")
    return res.status(200).json(data2);
  } catch (e) {
    return res.status(200).json(JSON.stringify(e));
  }
}

export default withRateLimit(handler)