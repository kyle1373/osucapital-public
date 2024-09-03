import { NextApiRequest, NextApiResponse } from "next";

import { getTopTradersToday } from "@lib/server/leaderboard";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const traders = await getTopTradersToday();
    return res.status(200).json(traders);
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
}

export default handler;
