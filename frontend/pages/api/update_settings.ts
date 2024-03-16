import { NextApiRequest, NextApiResponse } from "next";
import { COOKIES } from "@constants/constants";
import { Settings, getUserBySession, updateSettings } from "@lib/server/user";
import { getLatestFriendLeaderboardUsers } from "@lib/server/leaderboard";
import { withRateLimit } from "@lib/ratelimiter";

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const pulledUser = await getUserBySession(req.cookies[COOKIES.userSession]);

  if (!pulledUser) {
    return res.status(500).send({ error: "Not authorized" });
  }

  const settingsJSON: Settings = {};
  if (req.body.show_trades !== null || req.body.show_trades !== undefined) {
    settingsJSON.show_trades = req.body.show_trades;
  }
  try {
    await updateSettings(pulledUser.user_id, settingsJSON);
    return res.status(200).json({ data: "Updated settings" });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
}

export default withRateLimit(handler)
