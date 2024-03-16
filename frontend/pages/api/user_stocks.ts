// List of hosted events from a specific host

import { NextApiRequest, NextApiResponse } from "next";
import { getUserStocks } from "@lib/server/stock";
import { COOKIES } from "@constants/constants";
import { getUserBySession } from "@lib/server/user";
import { withRateLimit } from "@lib/ratelimiter";

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const page = parseInt(req.query.page as string) || 1;
  const user_id = parseInt(req.query.user_id as string)
  if(isNaN(user_id)){
    return res.status(400).send({ error: "Bad request" });
  }
  try {
    const stocks = await getUserStocks(user_id, page);
    return res.status(200).json(stocks);
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
}

export default withRateLimit(handler)