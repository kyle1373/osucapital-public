/*
This endpoint removes old realtime logs from the database, and this is called by the realtime service every 24 hours.
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
      .json({ success: false, reason: "Unauthorized access" });
  }

  try {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { error } = await supabaseAdmin
      .from("realtime_logs")
      .delete()
      .lt("created_at", threeDaysAgo.toISOString());

    if (error) {
      console.error("Error deleting old logs:", error.message);
      throw new Error(error.message);
    }

    console.log("Old logs successfully deleted");

    return res
      .status(200)
      .json({ success: true, reason: "Old logs successfully deleted" });
  } catch (e) {
    console.log(e.message || e);
    return res.status(400).json({ success: false, reason: e.message || e });
  }
}
