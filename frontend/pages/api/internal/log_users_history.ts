/*
This endpoint logs the users history (coins, rank, friend rank, etc), and this is called by the realtime service every 24 hours.
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
    const { data, error } = await supabaseAdmin.rpc("log_user_details");
    if (error) {
      throw new Error(error.message);
    }

    return res
      .status(200)
      .json({ data: "Users have been logged successfully" });
  } catch (e) {
    console.log(e.message || e);
    return res.status(400).json({ success: false, error: e.message || e });
  }
}
