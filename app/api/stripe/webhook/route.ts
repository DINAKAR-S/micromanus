import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdmin } from "@/lib/supabase/admin";

const GRANT = 5;

// Stripe calls this after a successful payment. Grants 5 credits to the paying user.
export async function POST(request: Request) {
  const body = await request.text(); // raw body required for signature verification
  const sig = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig!, secret!);
  } catch (err) {
    return NextResponse.json({ error: `Bad signature: ${(err as Error).message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as { client_reference_id?: string; metadata?: { user_id?: string } };
    const userId = session.client_reference_id || session.metadata?.user_id;
    if (userId) {
      const admin = createAdmin();
      const { data: profile } = await admin
        .from("profiles").select("credits").eq("id", userId).single();
      await admin
        .from("profiles")
        .update({ credits: (profile?.credits ?? 0) + GRANT, paid: true })
        .eq("id", userId);
    }
  }

  return NextResponse.json({ received: true });
}
