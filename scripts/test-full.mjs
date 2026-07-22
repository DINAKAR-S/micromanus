// Mirrors the /api/agent loop with the REAL research query + timing.
import OpenAI from "openai";
const KEY = process.env.ANTHROPIC_KEY, TAVILY = process.env.TAVILY_API_KEY;
const MODEL = process.env.MODEL || "claude-sonnet-5";
const MAX_ITERS = 4;
const client = new OpenAI({ apiKey: KEY, baseURL: "https://api.anthropic.com/v1" });
const SYS = `You are MicroManus, a deep-research agent. Be efficient: at most 1-2 searches per step, stop as soon as you have enough, you have a strict time budget. When ready, write a focused Markdown report with headings and a Sources list.`;
const TOOLS = [{ type: "function", function: { name: "web_search", description: "Search the web.", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } } }];
async function tavily(q) {
  const r = await fetch("https://api.tavily.com/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ api_key: TAVILY, query: q, max_results: 4, search_depth: "basic", include_answer: true }) });
  const d = await r.json();
  return (d.answer ? "Answer: " + d.answer + "\n\n" : "") + (d.results || []).map((x, k) => `[${k+1}] ${x.title}\n${x.url}\n${(x.content||"").slice(0,800)}`).join("\n\n");
}
const t0 = Date.now();
const el = () => ((Date.now() - t0) / 1000).toFixed(1) + "s";
const messages = [{ role: "system", content: SYS }, { role: "user", content: "Research today's Indian stock market movers" }];
try {
  for (let i = 0; i < MAX_ITERS; i++) {
    const forceAnswer = i === MAX_ITERS - 1;
    console.log(`[${el()}] iter ${i} -> model call…`);
    const c = await client.chat.completions.create({ model: MODEL, messages, max_tokens: 2000, tools: forceAnswer ? undefined : TOOLS, tool_choice: forceAnswer ? undefined : "auto" });
    const m = c.choices[0].message; messages.push(m);
    const calls = m.tool_calls || [];
    if (calls.length && !forceAnswer) {
      for (const tc of calls) {
        let q = ""; try { q = JSON.parse(tc.function.arguments||"{}").query||""; } catch {}
        console.log(`[${el()}]   search: ${q}`);
        const obs = await tavily(q);
        messages.push({ role: "tool", tool_call_id: tc.id, content: obs });
      }
      continue;
    }
    console.log(`[${el()}] FINAL (${(m.content||"").length} chars):\n`, (m.content||"").slice(0, 600));
    break;
  }
  console.log(`\n✅ total ${el()}`);
} catch (e) { console.log(`[${el()}] ❌`, e.status, e.message?.slice(0,200)); }
