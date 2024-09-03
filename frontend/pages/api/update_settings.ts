import { NextApiRequest, NextApiResponse } from "next";
import { COOKIES } from "@constants/constants";
import { Settings, getUserBySession, updateSettings } from "@lib/server/user";

function isValidHexColor(color) {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const pulledUser = await getUserBySession(req.cookies[COOKIES.userSession]);

  if (!pulledUser) {
    return res.status(500).send({ error: "Not authorized" });
  }

  const settingsJSON: Settings = {};
  if (req.body.show_trades !== null || req.body.show_trades !== undefined) {
    settingsJSON.show_trades = req.body.show_trades;
  }
  if (req.body.color_flare !== null && req.body.color_flare !== undefined) {
    if (isValidHexColor(req.body.color_flare)) {
      settingsJSON.color_flare = req.body.color_flare;
    } else {
      return res
        .status(400)
        .send({
          error: "Invalid color format. Color must be a valid hex code.",
        });
    }
  }
  try {
    await updateSettings(pulledUser.user_id, settingsJSON);
    return res.status(200).json({ data: "Settings updated!" });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
}

export default handler;
