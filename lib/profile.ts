import { createClient } from "@/lib/supabase/server";

export interface Profile {
  id: string;
  email: string | null;
  credits: number;
  paid: boolean;
  coupon_used: boolean;
}

// Loads the current user + profile. Returns null user if not signed in.
export async function getSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return { user: null, profile: null as Profile | null };

  let { data: profile } = await supabase
    .from("profiles")
    .select("id, email, credits, paid, coupon_used")
    .eq("id", user.id)
    .single();

  // Fallback if the signup trigger hasn't populated the row yet.
  if (!profile) {
    await supabase.from("profiles").insert({ id: user.id, email: user.email }).select();
    profile = { id: user.id, email: user.email ?? null, credits: 0, paid: false, coupon_used: false };
  }
  return { user, profile: profile as Profile };
}
