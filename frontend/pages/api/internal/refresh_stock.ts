/*
This endpoint refreshes a stock, and this is called by the realtime service once there is an update present.
*/

import { refreshStock } from "@lib/server/stock";
import supabaseAdmin from "@lib/supabase/supabase";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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
    const stock_id = parseInt(req.body.stock_id as string);
    await refreshStock({ stock_id: stock_id, log_history_if_new: true });

    return res.status(200).json({ data: "Stock has been refreshed!" });
  } catch (e) {
    console.log(e.message || e);
    return res.status(400).json({ success: false, error: e.message || e });
  }
}
