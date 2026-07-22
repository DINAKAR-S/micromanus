import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { findModel } from "@/lib/models";

type Row = {
  thread_id: string | null;
  model_id: string;
  input_tokens: number;
  output_tokens: number;
  cache_tokens: number;
  cost_usd: number;
  threads: { title: string } | null;
};

export default async function Stats() {
  const { user } = await getSession();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("usage")
    .select("thread_id, model_id, input_tokens, output_tokens, cache_tokens, cost_usd, threads(title)")
    .order("created_at", { ascending: false });
  const rows = (data as unknown as Row[]) || [];

  // Group by chat.
  const byChat = new Map<string, { title: string; models: Set<string>; input: number; output: number; cache: number; cost: number; runs: number }>();
  for (const r of rows) {
    const key = r.thread_id || "unknown";
    const g = byChat.get(key) || { title: r.threads?.title || "Deleted chat", models: new Set<string>(), input: 0, output: 0, cache: 0, cost: 0, runs: 0 };
    g.models.add(findModel(r.model_id)?.label || r.model_id);
    g.input += r.input_tokens; g.output += r.output_tokens; g.cache += r.cache_tokens;
    g.cost += Number(r.cost_usd); g.runs += 1;
    byChat.set(key, g);
  }
  const chats = [...byChat.values()];
  const totals = chats.reduce((a, c) => ({
    input: a.input + c.input, output: a.output + c.output, cache: a.cache + c.cache, cost: a.cost + c.cost, runs: a.runs + c.runs,
  }), { input: 0, output: 0, cache: 0, cost: 0, runs: 0 });

  const fmt = (n: number) => n.toLocaleString();
  const usd = (n: number) => `$${n.toFixed(4)}`;

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <Link href="/chat" className="text-sm text-white/50 hover:text-white/80">← Back to chat</Link>
          <h1 className="text-2xl font-bold">Usage &amp; cost</h1>
        </div>

        {/* Totals */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            ["Total cost", usd(totals.cost)],
            ["Runs", String(totals.runs)],
            ["Input tokens", fmt(totals.input)],
            ["Output tokens", fmt(totals.output)],
            ["Cache tokens", fmt(totals.cache)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-edge bg-panel p-4">
              <div className="text-xs uppercase text-white/40">{k}</div>
              <div className="mt-1 text-lg font-semibold text-accent2">{v}</div>
            </div>
          ))}
        </div>

        {/* Per-chat table */}
        <div className="mt-8 overflow-x-auto rounded-xl border border-edge">
          <table className="w-full text-sm">
            <thead className="bg-panel text-left text-white/50">
              <tr>
                <th className="px-4 py-3">Chat</th>
                <th className="px-4 py-3">Model(s)</th>
                <th className="px-4 py-3 text-right">Runs</th>
                <th className="px-4 py-3 text-right">Input</th>
                <th className="px-4 py-3 text-right">Output</th>
                <th className="px-4 py-3 text-right">Cache</th>
                <th className="px-4 py-3 text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {chats.map((c, i) => (
                <tr key={i} className="border-t border-edge">
                  <td className="max-w-[220px] truncate px-4 py-3">{c.title}</td>
                  <td className="px-4 py-3 text-white/70">{[...c.models].join(", ")}</td>
                  <td className="px-4 py-3 text-right">{c.runs}</td>
                  <td className="px-4 py-3 text-right">{fmt(c.input)}</td>
                  <td className="px-4 py-3 text-right">{fmt(c.output)}</td>
                  <td className="px-4 py-3 text-right">{fmt(c.cache)}</td>
                  <td className="px-4 py-3 text-right font-medium text-accent2">{usd(c.cost)}</td>
                </tr>
              ))}
              {chats.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-white/40">No usage yet — run a research query first.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-white/40">
          Cost is computed from each model&apos;s per-token price (input / output / cached) at the time of the run. 1 credit = 1 run.
        </p>
      </div>
    </main>
  );
}
