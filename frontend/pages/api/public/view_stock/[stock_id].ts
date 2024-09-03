import { NextApiRequest, NextApiResponse } from "next";
import { getStockStats } from "@lib/server/stock";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const stock_id = parseInt(req.query.stock_id as string);

  if (!stock_id || isNaN(stock_id)) {
    return res.status(400).send({ error: "Bad request" });
  }

  try {
    const stock = await getStockStats(stock_id, null);
    return res.json(stock);
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
}

export default handler;
