import stripeClient from "@lib/stripe/stripeAdmin";
import supabaseAdmin from "@lib/supabase/supabase";
import Stripe from "stripe";

export async function isUserSubscribed(userId: number): Promise<boolean> {
  const { stripe_subscription_status } = await queryCustomerFromDatabase(
    userId
  );

  return stripe_subscription_status === "active";
}

export async function getUserCustomerId(userId: number): Promise<string> {
  const { stripe_customer_id } = await queryCustomerFromDatabase(userId);

  return stripe_customer_id;
}

export async function findModifyOrCreateCustomer(
  userId: number,
  newEmail?: string,
  subscriptionStatus?: "active" | "inactive"
): Promise<string> {
  // Query your database for the customer ID by userId
  const { stripe_customer_id } = await queryCustomerFromDatabase(userId);

  if (stripe_customer_id) {
    try {
      // Attempt to retrieve the Stripe customer to verify existence
      const stripeCustomer = await stripeClient.customers.retrieve(
        stripe_customer_id
      );

      const updatedCustomer = await stripeClient.customers.update(
        stripe_customer_id,
        { email: newEmail }
      );

      await saveCustomerMapping(
        userId,
        stripe_customer_id,
        newEmail,
        subscriptionStatus
      );
      return stripe_customer_id; // Return existing and verified customer ID
    } catch (error) {
      if (
        error instanceof Stripe.errors.StripeError &&
        error.statusCode === 404
      ) {
        // Customer does not exist in Stripe, create new one
        console.log("Customer not found in Stripe, creating a new one.");
      } else {
        // Other errors can be thrown, handle accordingly
        throw error;
      }
    }
  }

  // If no existing ID or customer does not exist in Stripe, create a new one
  const customerRecord: any = {
    metadata: { userId: userId },
  };
  if (newEmail) {
    customerRecord.email = newEmail;
  }
  const newCustomer = await stripeClient.customers.create(customerRecord);

  // Save new customer ID and email in your database
  await saveCustomerMapping(
    userId,
    newCustomer.id,
    newEmail,
    subscriptionStatus
  );
  return newCustomer.id;
}

async function saveCustomerMapping(
  user_id: number,
  customer_id: string,
  email?: string,
  subscription_status?: "active" | "inactive"
) {
  const updateData = email
    ? { stripe_customer_id: customer_id, stripe_customer_email: email }
    : { stripe_customer_id: customer_id };

  if (subscription_status) {
    (updateData as any).stripe_subscription_status = subscription_status;
  }

  console.log(JSON.stringify(updateData));
  const { error } = await supabaseAdmin
    .from("users")
    .update(updateData)
    .eq("user_id", user_id);

  if (error) {
    throw new Error(`Failed to update customer mapping: ${error.message}`);
  }
}

async function queryCustomerFromDatabase(user_id: number) {
  if (!user_id) {
    return {
      stripe_customer_id: null,
      stripe_customer_email: null,
      stripe_subscription_status: null,
    };
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .select(
      "stripe_customer_id, stripe_customer_email, stripe_subscription_status"
    )
    .eq("user_id", user_id)
    .single();

  if (error) {
    console.log("ERROR in queryCustomerFromDatabase:", error.message);
    return {
      stripe_customer_id: null,
      stripe_customer_email: null,
      stripe_subscription_status: null,
    };
  }

  return data;
}
