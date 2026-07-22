import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// OAuth redirect lands here with a ?code — exchange it for a session cookie.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const site = process.env.NEXT_PUBLIC_SITE_URL || origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${site}/chat`);
  }
  return NextResponse.redirect(`${site}/login?error=auth`);
}
