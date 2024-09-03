import { NextApiRequest, NextApiResponse } from "next";
import { COOKIES } from "@constants/constants";
import {
  addFriendConnection,
  getUserBySession,
  removeFriendConnection,
} from "@lib/server/user";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ALLOWED_ACTIONS = ["friend", "unfriend"];
  const action = req.body.action;
  const session = req.cookies[COOKIES.userSession];
  const pulledUser = await getUserBySession(session);
  const otherUserId = parseInt(req.query.user_id as string);

  if (!pulledUser) {
    return res.status(401).send({ error: "Not authenticated" });
  }

  if (
    !action ||
    !ALLOWED_ACTIONS.includes(action) ||
    !otherUserId ||
    isNaN(otherUserId)
  ) {
    return res.status(400).send({ error: "Bad request" });
  }

  try {
    switch (action) {
      case "friend":
        await addFriendConnection(pulledUser.user_id, otherUserId);
        return res.status(200).send({ data: "Added friend" });
      case "unfriend":
        await removeFriendConnection(pulledUser.user_id, otherUserId);
        return res.status(200).send({ data: "Removed friend" });
      default:
        return res.status(400).send({ error: "Bad request" });
    }
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
}

export default handler;
