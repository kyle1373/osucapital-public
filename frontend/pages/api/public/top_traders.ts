// List of hosted events from a specific host

import { NextApiRequest, NextApiResponse } from "next";
import { getTrendingStocks, getUserStocks } from "@lib/server/stock";
import { COOKIES } from "@constants/constants";
import { getUserBySession } from "@lib/server/user";
import { withRateLimit } from "@lib/ratelimiter";
import { getTopTradersToday } from "@lib/server/leaderboard";

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const traders = await getTopTradersToday();
    return res.status(200).json(traders);
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
}

export default withRateLimit(handler)