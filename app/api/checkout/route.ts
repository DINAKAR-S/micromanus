import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

// Creates a Stripe test-mode Checkout Session for a $5 / 5-credit top-up.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const site = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: data.user.id,
    customer_email: data.user.email ?? undefined,
    metadata: { user_id: data.user.id },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: 500, // $5.00
          product_data: {
            name: "MicroManus — 5 research credits",
            description: "5 agent runs. Usage-based billing.",
          },
        },
      },
    ],
    success_url: `${site}/paywall?paid=1`,
    cancel_url: `${site}/paywall?canceled=1`,
  });

  return NextResponse.json({ url: session.url });
}
