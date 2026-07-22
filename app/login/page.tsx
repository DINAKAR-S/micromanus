"use client";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import Link from "next/link";

export default function Login() {
  const [busy, setBusy] = useState<string | null>(null);

  async function signIn(provider: "github" | "google") {
    setBusy(provider);
    const supabase = createClient();
    const site = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${site}/auth/callback` },
    });
    if (error) {
      alert(error.message);
      setBusy(null);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <Link href="/" className="mb-8 text-sm text-white/50 hover:text-white/80">← Back</Link>
      <div className="w-full max-w-sm rounded-2xl border border-edge bg-panel p-8 text-center">
        <h1 className="text-2xl font-bold">Welcome to Micro<span className="text-accent">Manus</span></h1>
        <p className="mt-2 text-sm text-white/60">Sign in to start researching.</p>

        <div className="mt-8 space-y-3">
          <button
            onClick={() => signIn("github")}
            disabled={!!busy}
            className="w-full rounded-lg bg-white px-4 py-3 font-medium text-black hover:opacity-90 disabled:opacity-50"
          >
            {busy === "github" ? "Redirecting…" : "Continue with GitHub"}
          </button>
          <button
            onClick={() => signIn("google")}
            disabled={!!busy}
            className="w-full rounded-lg border border-edge bg-ink px-4 py-3 font-medium text-white hover:bg-black/40 disabled:opacity-50"
          >
            {busy === "google" ? "Redirecting…" : "Continue with Google"}
          </button>
        </div>
        <p className="mt-6 text-xs text-white/40">Social login only. No passwords.</p>
      </div>
    </main>
  );
}
