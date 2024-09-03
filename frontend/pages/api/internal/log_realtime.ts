/*
This endpoint logs data into the realtime service. Logs are batched sent by the realtime service whenever they come in
*/

import {
  OsuPlayerQueueItem,
  insertDataIntoRealtime,
} from "@lib/server/realtime";
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
    const osuPlayerItems: OsuPlayerQueueItem[] = req.body;

    validateOsuPlayerItems(osuPlayerItems);
    await insertDataIntoRealtime(osuPlayerItems);

    return res.status(200).json({ data: "Data has been added!" });
  } catch (e) {
    console.log(e.message || e);
    return res.status(400).json({ success: false, error: e.message || e });
  }
}

function validateOsuPlayerItems(items: OsuPlayerQueueItem[]) {
  const isString = (value) => typeof value === "string";
  const isNumber = (value) => typeof value === "number";

  items.forEach((item) => {
    if (!isNumber(item.osu_id)) {
      throw new Error("Invalid osu_id; expected a number.");
    }
    if (!isString(item.osu_country_code)) {
      throw new Error("Invalid osu_country_code; expected to be string.");
    }

    if (!isString(item.osu_picture.old) || !isString(item.osu_picture.new)) {
      throw new Error(
        "Invalid osu_picture; expected old and new to be strings."
      );
    }
    if (!isString(item.osu_username.old) || !isString(item.osu_username.new)) {
      throw new Error(
        "Invalid osu_username; expected old and new to be strings."
      );
    }
    if (!isNumber(item.osu_pp.old) || !isNumber(item.osu_pp.new)) {
      throw new Error("Invalid osu_pp; expected old and new to be numbers.");
    }
    if (!isNumber(item.osu_rank.old) || !isNumber(item.osu_rank.new)) {
      throw new Error("Invalid osu_rank; expected old and new to be numbers.");
    }
    if (
      !isNumber(item.osu_playcount.old) ||
      !isNumber(item.osu_playcount.new)
    ) {
      throw new Error(
        "Invalid osu_playcount; expected old and new to be numbers."
      );
    }
    if (
      !isString(item.prior_update_datetime) ||
      !isString(item.current_update_datetime)
    ) {
      throw new Error("Invalid update datetime; expected strings.");
    }
  });
}
