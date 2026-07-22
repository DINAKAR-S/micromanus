import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdmin } from "@/lib/supabase/admin";

const GRANT = 5;

export async function POST(request: Request) {
  const { code } = await request.json().catch(() => ({ code: "" }));
  const expected = process.env.BYPASS_COUPON || "SID_DRDROID";

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if ((code || "").trim() !== expected) {
    return NextResponse.json({ error: "Invalid coupon code" }, { status: 400 });
  }

  const admin = createAdmin();
  const { data: profile } = await admin
    .from("profiles").select("coupon_used, credits").eq("id", data.user.id).single();

  if (profile?.coupon_used) {
    return NextResponse.json({ error: "Coupon already redeemed" }, { status: 400 });
  }

  const { error } = await admin
    .from("profiles")
    .update({ credits: (profile?.credits ?? 0) + GRANT, coupon_used: true })
    .eq("id", data.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, credits: (profile?.credits ?? 0) + GRANT });
}
