import { NextApiRequest, NextApiResponse } from "next";
import { getUserStocks } from "@lib/server/stock";
import { COOKIES } from "@constants/constants";
import { getUserBySession } from "@lib/server/user";
import { getLatestFriendLeaderboardUsers } from "@lib/server/leaderboard";
import { withRateLimit } from "@lib/ratelimiter";

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const pulledUser = await getUserBySession(req.cookies[COOKIES.userSession])

  if (!pulledUser) {
    return res.status(500).send({ error: "Not authorized" });
  }

  try {
    const friends = await getLatestFriendLeaderboardUsers(pulledUser.user_id)
    return res.status(200).json(friends);
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
}

export default withRateLimit(handler)