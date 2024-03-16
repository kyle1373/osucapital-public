import { NextApiResponse, NextApiRequest } from "next";
import { searchTradersAndStocks } from "@lib/server/search";
import { withRateLimit } from "@lib/ratelimiter";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const query = (req.query.query as string);
  const searchResults = await searchTradersAndStocks(query as string);
  return res.json(searchResults);
};

export default withRateLimit(handler)