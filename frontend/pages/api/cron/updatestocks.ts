// export const maxDuration = 120; // This function can run for a maximum of 120 seconds
// export const dynamic = 'force-dynamic';

// import supabaseAdmin from "@lib/supabase/supabase";
// import { refreshStocks } from "@lib/server/stock";
// import { NextApiRequest, NextApiResponse } from "next";

// export default async function handler(
//   req: NextApiRequest,
//   res: NextApiResponse
// ) {
//   // More here https://vercel.com/docs/cron-jobs/manage-cron-jobs
//   const authHeader = req.headers.authorization;
//   if (
//     process.env.NODE_ENV !== "development" &&
//     (!process.env.CRON_SECRET ||
//       authHeader !== `Bearer ${process.env.CRON_SECRET}`)
//   ) {
//     return res.status(401).json({ success: false });
//   }
//   try {
//     const response = await update();
//     return res.status(200).json({success: true, reason: JSON.stringify(response)});
//   } catch (e) {
//     console.log(e.message || e )
//     return res.status(400).json({success: false, reason: e.message || e });
//   }
// }

// async function update() {
//   const pulledAllStocks = await supabaseAdmin.from("stocks").select("stock_id");
//   if (pulledAllStocks.error) {
//     throw new Error("ERROR2: " + pulledAllStocks.error.message);
//   }

//   const allStockIds = pulledAllStocks.data.map((data) => data.stock_id);
//   await refreshStocks(allStockIds);
//   return "Successfully updated stocks";
// }
