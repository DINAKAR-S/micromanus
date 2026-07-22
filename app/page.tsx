import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProviderIcon, Spark } from "./chat/icons";

const PROVIDERS = [
  { name: "OpenAI", node: <ProviderIcon provider="openai" /> },
  { name: "Claude", node: <ProviderIcon provider="anthropic" /> },
  { name: "Kimi", node: <ProviderIcon provider="moonshot" /> },
  { name: "Gemini", node: <Spark /> },
  { name: "Mistral", node: <Spark /> },
  { name: "Llama", node: <Spark /> },
  { name: "Grok", node: <Spark /> },
  { name: "DeepSeek", node: <Spark /> },
  { name: "Perplexity", node: <Spark /> },
];

const Q_ROW_A = [
  "Research today's Indian stock market movers",
  "Explain the recent California forest fires",
  "Where does solid-state battery tech stand in 2026?",
  "Compare Perplexity vs Manus on UX",
  "Summarize NVIDIA's latest earnings",
];
const Q_ROW_B = [
  "What's driving crude oil prices this week?",
  "Break down the 2026 AI infrastructure capex race",
  "Latest on India's EV subsidy policy",
  "State of quantum computing in 2026",
  "Are metro housing prices cooling in India?",
];

function ProviderPill({ name, node }: { name: string; node: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2 rounded-full border border-edge bg-panel/70 px-4 py-2 text-sm text-white/75 shrink-0">
      {node} {name}
    </span>
  );
}

function QueryPill({ q }: { q: string }) {
  return (
    <Link href="/login" className="shrink-0 rounded-full border border-edge bg-panel/50 px-4 py-2 text-sm text-white/70 transition hover:border-silver/50 hover:bg-panel hover:text-white">
      {q}
    </Link>
  );
}

export default async function Landing() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/chat");

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-edge/60 bg-ink/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="text-lg font-bold tracking-tight">Micro<span className="metal-text">Manus</span></div>
          <nav className="flex items-center gap-2">
            <Link href="/login" className="rounded-lg border border-edge px-3.5 py-2 text-sm text-white/80 hover:bg-panel">Log in</Link>
            <Link href="/login" className="btn-metal rounded-lg px-4 py-2 text-sm font-semibold">Sign up</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-4xl px-5 pt-20 pb-10 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-edge bg-panel/60 px-3 py-1 text-xs text-white/60">
          <span className="h-1.5 w-1.5 rounded-full bg-silver" /> Deep research agent · usage-based billing
        </div>
        <h1 className="mt-6 animate-glowpulse text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl">
          <span className="metal-text glow">Research anything,</span><br />
          <span className="metal-text glow">end to end.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-white/60">
          MicroManus searches the live web, reasons in a loop, and writes you a cited PDF report.
          Bring your own model key and pay only for the tokens you use.
        </p>

        {/* Faux prompt box */}
        <Link href="/login" className="group mx-auto mt-10 block max-w-2xl">
          <div className="rounded-2xl bg-white/[0.04] p-1.5 ring-1 ring-edge transition group-hover:ring-silver/50">
            <div className="flex items-center gap-3 rounded-xl px-4 py-4">
              <span className="flex-1 text-left text-[15px] text-white/40">Ask MicroManus to research anything…</span>
              <span className="btn-metal flex h-9 w-9 items-center justify-center rounded-xl">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 19V5M12 5l-6 6M12 5l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
            </div>
          </div>
        </Link>
        <div className="mt-6">
          <Link href="/login" className="btn-metal inline-flex rounded-xl px-7 py-3 font-semibold">Start researching</Link>
        </div>
        <p className="mt-4 text-sm text-white/50">
          New here? Sign in, then the coupon <span className="font-semibold text-accent2">SID_DRDROID</span> is pre-filled on the paywall for 5 free credits.
        </p>
      </main>

      {/* Provider marquee */}
      <section className="py-8">
        <p className="mb-4 text-center text-xs uppercase tracking-[0.2em] text-white/35">Works with your key from</p>
        <div className="marquee">
          <div className="marquee-track animate-marquee">
            {[...PROVIDERS, ...PROVIDERS].map((p, i) => <ProviderPill key={i} name={p.name} node={p.node} />)}
          </div>
        </div>
      </section>

      {/* Question marquees (two rows, opposite directions) */}
      <section className="space-y-3 py-6">
        <p className="mb-2 text-center text-sm text-white/50">Try asking things like</p>
        <div className="marquee">
          <div className="marquee-track animate-marquee">
            {[...Q_ROW_A, ...Q_ROW_A].map((q, i) => <QueryPill key={i} q={q} />)}
          </div>
        </div>
        <div className="marquee">
          <div className="marquee-track animate-marqueeRev">
            {[...Q_ROW_B, ...Q_ROW_B].map((q, i) => <QueryPill key={i} q={q} />)}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-4xl px-5 pb-20 pt-14">
        <div className="grid grid-cols-1 gap-4 text-left sm:grid-cols-3">
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
      </section>

      <footer className="border-t border-edge/60 py-8 text-center text-xs text-white/30">
        MicroManus · deep research with usage-based billing
      </footer>
    </div>
  );
}
