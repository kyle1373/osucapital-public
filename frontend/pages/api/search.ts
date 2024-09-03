import { NextApiResponse, NextApiRequest } from "next";
import { searchTradersAndStocks } from "@lib/server/search";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const query = req.query.query as string;
  const searchResults = await searchTradersAndStocks(query as string);
  return res.json(searchResults);
};

export default handler;
