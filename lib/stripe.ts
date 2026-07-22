import Stripe from "stripe";

// apiVersion omitted -> uses the SDK's pinned default; avoids coupling the build to a string.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder");
