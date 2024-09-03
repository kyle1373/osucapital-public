import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
  console.log("STRIPE_SECRET_KEY does not exist");
  process.exit(1);
}

const stripeClient = new Stripe(secretKey);
export default stripeClient;
