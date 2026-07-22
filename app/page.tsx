import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Landing() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/chat");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-2xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-edge bg-panel px-3 py-1 text-xs text-white/60 mb-6">
          <span className="h-2 w-2 rounded-full bg-accent2" /> deep research · usage-based billing
        </div>
        <h1 className="text-5xl font-bold tracking-tight">
          Micro<span className="text-accent">Manus</span>
        </h1>
        <p className="mt-4 text-lg text-white/70">
          An AI agent that searches the web, reasons in a loop, and writes you a cited PDF report.
          Bring your own model key — pay only for the tokens you use.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-accent px-6 py-3 font-medium text-white hover:opacity-90"
          >
            Sign up / Log in
          </Link>
          <a
            href="#how"
            className="rounded-lg border border-edge px-6 py-3 font-medium text-white/80 hover:bg-panel"
          >
            How it works
          </a>
        </div>
        <div id="how" className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-3 text-left">
          {[
            ["1 · Sign in", "GitHub or Google. Get 5 credits with coupon or a $5 top-up."],
            ["2 · Ask", "Give it a research task. It plans, searches, reads, and reasons in a loop."],
            ["3 · Get a report", "Download a PDF artifact. See exact token cost per chat & model."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-xl border border-edge bg-panel/60 p-4">
              <div className="font-semibold text-accent2">{t}</div>
              <div className="mt-1 text-sm text-white/60">{d}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
