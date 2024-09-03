/*
This endpoint gets all of the stocks which are stale (aka havent been updated in 24 hours). This is ran by realtime service every 12 hours.
*/

import supabaseAdmin from "@lib/supabase/supabase";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return res.status(401).json({ success: false, error: "Unauthorized access" });

  const authHeader = req.headers.authorization;
  if (
    process.env.NODE_ENV !== "development" &&
    (!process.env.CRON_SECRET ||
      authHeader !== `Bearer ${process.env.CRON_SECRET}`)
  ) {
    return res
      .status(401)
      .json({ success: false, error: "Unauthorized access" });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("stocks")
      .select("stock_id")
      .gt(
        "last_updated",
        new Date(new Date().getTime() - 24 * 60 * 60 * 1000).toISOString()
      );

    if (error) {
      throw new Error(error.message);
    }

    const formattedData = data.map((entry) => entry.stock_id);

    return res.status(200).json(formattedData);
  } catch (e) {
    console.log(e.message || e);
    return res.status(400).json({ success: false, error: e.message || e });
  }
}
