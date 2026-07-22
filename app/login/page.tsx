"use client";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import Link from "next/link";

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 1.7 2.7 1.2 3.3.9.1-.7.4-1.2.7-1.5-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 016 0C17 4.6 18 4.9 18 4.9c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z" />
    </svg>
  );
}
export default function Login() {
  const [busy, setBusy] = useState<string | null>(null);

  async function signIn(provider: "github") {
    setBusy(provider);
    const supabase = createClient();
    const site = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${site}/auth/callback` },
    });
    if (error) { alert(error.message); setBusy(null); }
  }

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center px-5 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight">Micro<span className="text-accent">Manus</span></Link>
      </header>

      <main className="flex flex-col items-center px-5 pt-16">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl border border-edge bg-panel/70 p-8 text-center shadow-2xl shadow-black/40">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-2xl">🔬</div>
            <h1 className="mt-4 text-2xl font-semibold">Welcome to Micro<span className="text-accent">Manus</span></h1>
            <p className="mt-1.5 text-sm text-white/55">Sign in to start researching.</p>

            <div className="mt-7">
              <button onClick={() => signIn("github")} disabled={!!busy}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-white px-4 py-3 font-medium text-black transition hover:opacity-90 disabled:opacity-50">
                <GitHubIcon /> {busy === "github" ? "Redirecting…" : "Continue with GitHub"}
              </button>
            </div>
            <p className="mt-6 text-xs text-white/40">Social login only. No passwords.</p>
          </div>
          <p className="mt-5 text-center text-xs text-white/35">
            New here? Signing in creates your account and gives you a paywall to unlock 5 credits.
          </p>
        </div>
      </main>
    </div>
  );
}
