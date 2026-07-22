import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const SAMPLES = [
  { icon: "🔥", q: "Explain the recent California forest fires, their causes and prevention" },
  { icon: "🔋", q: "Where does solid-state battery tech stand in 2026?" },
  { icon: "🧭", q: "Compare Perplexity vs Manus on UX and capability" },
  { icon: "📈", q: "Summarize the 2026 outlook for AI infrastructure spending" },
];

export default async function Landing() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/chat");

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-edge/60 bg-ink/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="text-lg font-bold tracking-tight">Micro<span className="text-accent">Manus</span></div>
          <nav className="flex items-center gap-2">
            <Link href="/login" className="rounded-lg px-3.5 py-2 text-sm text-white/70 hover:text-white">Log in</Link>
            <Link href="/login" className="rounded-lg bg-white px-3.5 py-2 text-sm font-medium text-black hover:opacity-90">Sign up</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-3xl px-5 pt-20 pb-24 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-edge bg-panel/60 px-3 py-1 text-xs text-white/60">
          <span className="h-1.5 w-1.5 rounded-full bg-accent2" /> Deep research agent · usage-based billing
        </div>
        <h1 className="mt-6 bg-gradient-to-b from-white to-white/60 bg-clip-text text-5xl font-semibold leading-tight tracking-tight text-transparent sm:text-6xl">
          Research anything,<br />end to end.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-white/60">
          MicroManus searches the live web, reasons in a loop, and writes you a cited PDF report.
          Bring your own model key and pay only for the tokens you use.
        </p>

        {/* Faux prompt box (leads to sign-in) */}
        <Link href="/login" className="group mt-10 block">
          <div className="rounded-2xl bg-white/5 p-1.5 ring-1 ring-edge transition group-hover:ring-accent/60">
            <div className="flex items-center gap-3 rounded-xl bg-transparent px-4 py-4">
              <span className="flex-1 text-left text-[15px] text-white/40">Ask MicroManus to research anything…</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white transition group-hover:opacity-90">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 19V5M12 5l-6 6M12 5l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
            </div>
          </div>
        </Link>

        {/* Sample queries */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SAMPLES.map((s) => (
            <Link key={s.q} href="/login"
              className="flex items-start gap-3 rounded-xl border border-edge bg-panel/50 p-4 text-left transition hover:border-accent/50 hover:bg-panel">
              <span className="text-lg leading-none">{s.icon}</span>
              <span className="text-sm text-white/70">{s.q}</span>
            </Link>
          ))}
        </div>

        {/* How it works */}
        <div className="mt-20 grid grid-cols-1 gap-4 text-left sm:grid-cols-3">
          {[
            ["Sign in", "GitHub or Google. Unlock 5 credits with a coupon or a $5 top-up."],
            ["Ask", "Give it a research task. It plans, searches, reads, and reasons in a loop."],
            ["Get a report", "Download a cited PDF. See exact token cost per chat and model."],
          ].map(([t, d], i) => (
            <div key={t} className="rounded-2xl border border-edge bg-panel/40 p-5">
              <div className="text-xs font-semibold text-accent2">Step {i + 1}</div>
              <div className="mt-1 font-semibold">{t}</div>
              <div className="mt-1 text-sm text-white/55">{d}</div>
            </div>
          ))}
        </div>

        <div className="mt-16">
          <Link href="/login" className="inline-flex rounded-xl bg-accent px-6 py-3 font-medium text-white hover:opacity-90">
            Start researching
          </Link>
        </div>
      </main>

      <footer className="border-t border-edge/60 py-8 text-center text-xs text-white/30">
        MicroManus · deep research with usage-based billing
      </footer>
    </div>
  );
}
