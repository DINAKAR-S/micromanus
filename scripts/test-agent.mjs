// One-off verification: does the Anthropic OpenAI-compat endpoint accept the dated
// model id AND support the tool-calling loop + Tavily? Run: node scripts/test-agent.mjs
import OpenAI from "openai";

const KEY = process.env.ANTHROPIC_KEY;
const TAVILY = process.env.TAVILY_API_KEY;
const MODEL = process.env.MODEL || "claude-3-5-sonnet-20241022";

const client = new OpenAI({ apiKey: KEY, baseURL: "https://api.anthropic.com/v1" });

const TOOLS = [{
  type: "function",
  function: {
    name: "web_search",
    description: "Search the web.",
    parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  },
}];

async function tavily(q) {
  const r = await fetch("https://api.tavily.com/search", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ api_key: TAVILY, query: q, max_results: 3, include_answer: true }),
  });
  const d = await r.json();
  return (d.answer ? "Answer: " + d.answer + "\n" : "") + (d.results || []).map(x => x.title + " " + x.url).join("\n");
}

try {
  console.log("1) plain completion (model id check)…");
  const c1 = await client.chat.completions.create({
    model: MODEL, messages: [{ role: "user", content: "Say OK." }], max_tokens: 20,
  });
  console.log("   OK:", c1.choices[0].message.content, "| usage:", JSON.stringify(c1.usage));

  console.log("2) tool-calling loop…");
  const messages = [{ role: "user", content: "What is the capital of France? Use web_search to confirm, then answer." }];
  const c2 = await client.chat.completions.create({ model: MODEL, messages, tools: TOOLS, tool_choice: "auto" });
  const m = c2.choices[0].message;
  console.log("   tool_calls:", JSON.stringify(m.tool_calls?.map(t => t.function)));
  if (m.tool_calls?.length) {
    messages.push(m);
    for (const tc of m.tool_calls) {
      const args = JSON.parse(tc.function.arguments || "{}");
      const obs = await tavily(args.query || "capital of France");
      messages.push({ role: "tool", tool_call_id: tc.id, content: obs.slice(0, 500) });
    }
    const c3 = await client.chat.completions.create({ model: MODEL, messages });
    console.log("   final:", c3.choices[0].message.content?.slice(0, 200));
  }
  console.log("\n✅ PIPELINE WORKS with", MODEL);
} catch (e) {
  console.log("\n❌ ERROR:", e.status, e.message?.slice(0, 300));
}
