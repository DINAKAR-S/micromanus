import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Thread create + message-history read, done server-side so they never depend on the
// browser Supabase session (which can lapse). Auth is via the request cookies.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { title } = await request.json().catch(() => ({ title: "New chat" }));
  const { data, error } = await supabase
    .from("threads")
    .insert({ title: (title || "New chat").slice(0, 48), user_id: auth.user.id })
    .select("id, title, created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const threadId = new URL(request.url).searchParams.get("threadId");
  if (!threadId) return NextResponse.json({ error: "Missing threadId" }, { status: 400 });

  // RLS + user_id filter ensure a user can only delete their own thread.
  // messages + usage rows cascade-delete via the schema's ON DELETE CASCADE.
  const { error } = await supabase
    .from("threads").delete().eq("id", threadId).eq("user_id", auth.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const threadId = new URL(request.url).searchParams.get("threadId");
  if (!threadId) return NextResponse.json({ error: "Missing threadId" }, { status: 400 });

  const { data, error } = await supabase
    .from("messages")
    .select("role, content")
    .eq("thread_id", threadId)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data || [] });
}
