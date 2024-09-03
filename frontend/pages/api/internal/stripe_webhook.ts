// pages/api/webhooks/stripe.ts

import { NextApiRequest, NextApiResponse } from "next";
import { buffer } from "micro";
import stripeClient from "@lib/stripe/stripeAdmin";
import { findModifyOrCreateCustomer } from "@lib/server/stripe";

// Stripe requires the raw body to construct the event
export const config = {
  api: {
    bodyParser: false,
  },
};

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET; // Your Stripe webhook secret

async function webhookHandler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "POST") {
      const reqBuffer = await buffer(req);
      const payload = reqBuffer.toString();
      const sig = req.headers["stripe-signature"];

      let event;

      try {
        if (!sig || !webhookSecret)
          throw new Error("Webhook signature missing.");
        event = stripeClient.webhooks.constructEvent(
          payload,
          sig,
          webhookSecret
        );
      } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      console.log("WEBHOOK HIT WITH " + event.type);
      // Handle the event
      switch (event.type) {
        case "customer.subscription.created":
          const subscription = event.data.object;

          // Retrieve customer details
          var customerId = subscription.customer;
          var customer = await stripeClient.customers.retrieve(customerId);
          var userId = (customer as any).metadata.userId;
          var email = (customer as any).email;

          await findModifyOrCreateCustomer(userId, email, "active");

          console.log(
            `Subscription created for user ID: ${userId}, Customer ID: ${customerId}, Email: ${email}`
          );

          // Handle the subscription creation
          break;
        case "invoice.payment_succeeded":
          const paymentSucceeded = event.data.object;
          // Handle successful payment
          break;
        case "invoice.payment_failed":
          const paymentFailed = event.data.object;
          // Handle failed payment
          break;
        case "customer.subscription.deleted":
          const subscriptionDeleted = event.data.object;
          var customerId = subscriptionDeleted.customer;
          var customer = await stripeClient.customers.retrieve(customerId);
          var userId = (customer as any).metadata.userId;
          var email = (customer as any).email;

          await findModifyOrCreateCustomer(userId, email, "inactive");

          console.log(
            `Subscription removed for user ID: ${userId}, Customer ID: ${customerId}, Email: ${email}`
          );
          break;
        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      res.json({ received: true });
    } else {
      res.setHeader("Allow", ["POST"]);
      res.status(405).end("Method Not Allowed");
    }
  } catch (e) {
    const log = "FATAL WEBHOOK ERROR: " + (e?.message || e);
    console.log(log);
    res.status(500).end(log);
  }
}

export default webhookHandler;
