import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { createAdmin } from "@/lib/supabase/admin";
import { PROVIDER_BASE_URL, costOf, type Provider } from "@/lib/models";
import { tavilySearch } from "@/lib/search";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_ITERS = 4;

const SYS = `You are MicroManus, a deep-research agent. Work in a loop: think, call web_search when you need facts, read the results, then think again.
Rules:
- ALWAYS ground claims in search results; do not invent sources.
- Be efficient: do at most ONE or TWO searches per step, and stop searching as soon as you have enough. You have a strict time budget, so finish with a solid answer rather than over-researching.
- When ready, write a clear, well-structured Markdown report with headings, short paragraphs, and a "Sources" list of the URLs you used.
- Keep it focused and concise.`;

const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "web_search",
      description: "Search the web for current information. Returns titles, URLs, and snippets.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "The search query" } },
        required: ["query"],
      },
    },
  },
];

function extractUsage(u: any) {
  return {
    input: u?.prompt_tokens ?? 0,
    output: u?.completion_tokens ?? 0,
    cache: u?.prompt_tokens_details?.cached_tokens ?? u?.cached_tokens ?? 0,
  };
}

export async function POST(request: Request) {
  const { threadId, content, provider, model, apiKey, baseUrl } = await request.json();

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new Response("Unauthorized", { status: 401 });
  const userId = auth.user.id;

  if (!apiKey) return new Response("Missing API key", { status: 400 });
  if (!threadId || !content) return new Response("Missing threadId or content", { status: 400 });

  // Credit gate.
  const admin = createAdmin();
  const { data: profile } = await admin.from("profiles").select("credits").eq("id", userId).single();
  if (!profile || profile.credits <= 0) return new Response("No credits", { status: 402 });

  // Persist the user turn, then load thread history for context.
  await supabase.from("messages").insert({ thread_id: threadId, user_id: userId, role: "user", content });
  const { data: history } = await supabase
    .from("messages")
    .select("role, content")
    .eq("thread_id", threadId)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: true });

  const client = new OpenAI({
    apiKey,
    baseURL: baseUrl || PROVIDER_BASE_URL[(provider as Provider) || "openai"],
  });

  const messages: any[] = [
    { role: "system", content: SYS },
    ...(history || []).map((m) => ({ role: m.role, content: m.content })),
  ];

  const totals = { input: 0, output: 0, cache: 0 };
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: unknown) => controller.enqueue(encoder.encode(JSON.stringify(o) + "\n"));
      let finalText = "";
      try {
        for (let i = 0; i < MAX_ITERS; i++) {
          send({ type: "status", text: i === 0 ? "Thinking…" : "Reasoning over results…" });

          const forceAnswer = i === MAX_ITERS - 1;
          // No temperature: newest models (Sonnet 5, etc.) 400 on it; omitting uses the model default.
          // max_tokens bounds final-report generation time so the run finishes within the 60s function limit.
          const completion = await client.chat.completions.create({
            model,
            messages,
            max_tokens: 2000,
            tools: forceAnswer ? undefined : TOOLS,
            tool_choice: forceAnswer ? undefined : "auto",
          });

          const u = extractUsage(completion.usage);
          totals.input += u.input; totals.output += u.output; totals.cache += u.cache;

          const msg = completion.choices[0].message;
          messages.push(msg);

          const calls = msg.tool_calls || [];
          if (calls.length && !forceAnswer) {
            for (const call of calls) {
              let query = "";
              try { query = JSON.parse(call.function.arguments || "{}").query || ""; } catch {}
              send({ type: "status", text: `🔎 Searching: ${query}` });
              const res = await tavilySearch(query);
              const observation =
                (res.answer ? `Answer: ${res.answer}\n\n` : "") +
                res.results.map((r, k) => `[${k + 1}] ${r.title}\n${r.url}\n${r.content}`).join("\n\n");
              messages.push({ role: "tool", tool_call_id: call.id, content: observation });
            }
            continue;
          }

          finalText = msg.content || "";
          break;
        }

        if (!finalText) finalText = "I couldn't produce an answer within the step limit.";
        send({ type: "assistant", text: finalText });

        // Persist assistant turn, record usage, spend 1 credit — each step isolated so one
        // failure never blocks the others or the final "done" event.
        const cost = costOf(model, totals);
        let left = 0;
        try {
          await supabase.from("messages").insert({ thread_id: threadId, user_id: userId, role: "assistant", content: finalText });
        } catch {}
        try {
          await supabase.from("usage").insert({
            thread_id: threadId, user_id: userId, model_id: model,
            input_tokens: totals.input, output_tokens: totals.output, cache_tokens: totals.cache, cost_usd: cost,
          });
        } catch {}
        try {
          const { data: p2 } = await admin.from("profiles").select("credits").eq("id", userId).single();
          left = Math.max(0, (p2?.credits ?? 1) - 1);
          await admin.from("profiles").update({ credits: left }).eq("id", userId);
        } catch {}

        send({ type: "done", usage: totals, cost, creditsLeft: left });
      } catch (e) {
        send({ type: "error", text: (e as Error).message || "Agent error" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
  });
}
