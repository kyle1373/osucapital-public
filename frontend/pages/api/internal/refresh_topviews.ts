/*
This endpoint refreshes the materialized views for top traders today and trending stocks, and this is called by the realtime service every 24 hours.
*/

import { refreshStock, refreshTopViews } from "@lib/server/stock";
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
    await refreshTopViews();

    return res.status(200).json({ data: "Views have been refreshed" });
  } catch (e) {
    console.log(e.message || e);
    return res.status(400).json({ success: false, error: e.message || e });
  }
}
