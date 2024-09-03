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

  console.log("Callback url is ", refUrl);

  const pulledUser = await getUserBySession(req.cookies[COOKIES.userSession]);

  if (!pulledUser) {
    return res
      .status(403)
      .send({ error: "You must be logged in to subscribe" });
  }

  const user_id = pulledUser.user_id;

  const userSubscribed = await isUserSubscribed(user_id);
  if (userSubscribed) {
    const customerId = await getUserCustomerId(user_id);
    const returnUrl = `${refUrl}`;

    const session = await stripeClient.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return res.redirect(303, session.url);
  }

  try {
    const customer = await findModifyOrCreateCustomer(user_id);

    const session = await stripeClient.checkout.sessions.create({
      billing_address_collection: "auto",
      customer: customer,
      line_items: [
        {
          price: STRIPE.OsuCapitalSupporterPriceID,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${refUrl}?stripe_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${refUrl}`,
    });

    res.redirect(303, session.url);
  } catch (e) {
    res.status(500).json({ error: e?.message || e });
  }
}
