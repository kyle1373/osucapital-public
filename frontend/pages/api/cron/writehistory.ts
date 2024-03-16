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
      .json({ success: false, reason: "Unauthorized access" });
  }

  try {
    const logUserDetails = await supabaseAdmin.rpc("log_user_details");
    if (logUserDetails.error) {
      const error = "ERROR1: " + JSON.stringify(logUserDetails.error)
      throw new Error(error);
    }

    const logStockDetails = await supabaseAdmin.rpc("log_stocks_history");
    if (logStockDetails.error) {
      const error = "ERROR1: " + JSON.stringify(logStockDetails.error)
      throw new Error(error)
    }
    return res
      .status(200)
      .json({ success: true, reason: "Logged users and stocks history" });
  } catch (e) {
    console.log(e.message || e )
    return res.status(400).json({ success: false, reason: e.message || e });
  }
}
