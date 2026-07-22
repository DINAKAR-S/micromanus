import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";

export const runtime = "nodejs";

// Save the user's OWN model key, encrypted at rest. Opt-in.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { provider, model, baseUrl, apiKey } = await request.json().catch(() => ({}));
  if (!apiKey) return NextResponse.json({ error: "Missing apiKey" }, { status: 400 });

  const { error } = await supabase.from("user_keys").upsert({
    user_id: auth.user.id,
    provider: provider || "openai",
    model: model || "",
    base_url: baseUrl || "",
    key_cipher: encrypt(apiKey),
    updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Return saved key METADATA only (never the raw key).
export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data } = await supabase
    .from("user_keys").select("provider, model, base_url").eq("user_id", auth.user.id).single();
  if (!data) return NextResponse.json({ saved: false });
  return NextResponse.json({ saved: true, provider: data.provider, model: data.model, baseUrl: data.base_url });
}

export async function DELETE() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  await supabase.from("user_keys").delete().eq("user_id", auth.user.id);
  return NextResponse.json({ ok: true });
}
