import { COOKIES, STRIPE } from "@constants/constants";
import {
  findModifyOrCreateCustomer,
  getUserCustomerId,
  isUserSubscribed,
} from "@lib/server/stripe";
import { getUserBySession } from "@lib/server/user";
import stripeClient from "@lib/stripe/stripeAdmin";
import { NextApiRequest, NextApiResponse } from "next";
import url from "url";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const referrer = req.headers.referer;
  const HOSTING_URL = process.env.HOSTING_URL;
  if (!HOSTING_URL) {
    throw new Error("Hosting URL is undefined");
  }

  console.log(referrer);
  let refUrl = HOSTING_URL;
  if (referrer) {
    refUrl = referrer;
  }

  console.log("REFURL is ", refUrl);

  const pulledUser = await getUserBySession(req.cookies[COOKIES.userSession]);

  if (!pulledUser) {
    return res
      .status(403)
      .send({ error: "You must be logged in to access billing portal" });
  }

  try {
    const user_id = pulledUser.user_id;

    const customerId = await getUserCustomerId(user_id);
    if (!customerId) {
      return res.status(403).send({
        error:
          "You do not have a billing portal as you have not previously supported osu! capital",
      });
    }

    const returnUrl = `${refUrl}`;

    const session = await stripeClient.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return res.redirect(303, session.url);
  } catch (e) {
    return res.status(500).send({
      error: e?.message || e,
    });
  }
}
