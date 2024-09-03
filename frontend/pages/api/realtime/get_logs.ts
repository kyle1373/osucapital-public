import { COOKIES } from "@constants/constants";
import { isUserSubscribed } from "@lib/server/stripe";
import { getUserBySession } from "@lib/server/user";
import supabaseAdmin from "@lib/supabase/supabase";
import { NextApiRequest, NextApiResponse } from "next";
import Joi from "joi";
import osuClient from "@lib/osuClient";
import {
  QueryRealtimeLogsParams,
  queryRealtimeLogs,
} from "@lib/server/realtime";

export type realtimeGetLogsRequestBodyType = {
  profile_changes: boolean;
  pp_changes: boolean;
  playcount_changes: boolean;
  search_query?: string;
  after_log_id?: number;
};

// Joi schema corresponding to the requestBodyType
const requestBodySchema = Joi.object({
  profile_changes: Joi.boolean().required(),
  pp_changes: Joi.boolean().required(),
  playcount_changes: Joi.boolean().required(),
  search_query: Joi.string(),
  after_log_id: Joi.number().integer(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const pulledUser = await getUserBySession(req.cookies[COOKIES.userSession]);

  if (!pulledUser) {
    return res.status(401).send({ error: "Not authenticated" });
  }

  const isSubscribed = await isUserSubscribed(pulledUser.user_id);

  if (!isSubscribed) {
    return res.status(403).send({
      error: "You must be subscribed to osu! capital to access this feature",
    });
  }

  try {
    // Validate request body with Joi
    const { value, error } = requestBodySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const requestBody: realtimeGetLogsRequestBodyType = value;

    const queryParameters: QueryRealtimeLogsParams = {
      searchPpChanges: requestBody.pp_changes,
      searchPlaycountChanges: requestBody.playcount_changes,
      searchProfileChanges: requestBody.profile_changes,
    };

    if (requestBody.search_query) {
      const osuData = await osuClient.site.search({
        query: requestBody.search_query,
      });
      const userIDs = osuData.user.data.map((user) => user.id);

      if (userIDs?.length === 0) {
        return res.status(200).json([]);
      }

      queryParameters.userIDs = userIDs;
    }

    if (requestBody.after_log_id) {
      queryParameters.afterLogID = requestBody.after_log_id;
    }

    console.log(queryParameters);

    const realtimeLogs = await queryRealtimeLogs(queryParameters);

    console.log(JSON.stringify(realtimeLogs));
    return res.status(200).json(realtimeLogs);
  } catch (e) {
    console.error(e); // Logging the error
    return res
      .status(500)
      .json({ error: e.message || "Internal server error" });
  }
}
