"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MODELS, PROVIDER_LABEL, findModel, type Provider } from "@/lib/models";
import { mdToHtml } from "@/lib/md";
import Link from "next/link";

type Thread = { id: string; title: string; created_at: string };
type Msg = { role: string; content: string };
type KeyCfg = { provider: Provider; model: string; apiKey: string; baseUrl: string };

const DEFAULT_CFG: KeyCfg = { provider: "openai", model: "gpt-4o-mini", apiKey: "", baseUrl: "" };

export default function ChatApp({
  initialThreads, credits, email,
}: { initialThreads: Thread[]; credits: number; email: string }) {
  const supabase = createClient();
  const [threads, setThreads] = useState<Thread[]>(initialThreads);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [creditsLeft, setCreditsLeft] = useState(credits);
  const [cfg, setCfg] = useState<KeyCfg>(DEFAULT_CFG);
  const [showSettings, setShowSettings] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load saved key config (stays in the browser — never persisted server-side).
  useEffect(() => {
    const raw = localStorage.getItem("mm_key");
    if (raw) { try { setCfg({ ...DEFAULT_CFG, ...JSON.parse(raw) }); } catch {} }
    else setShowSettings(true);
  }, []);

  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [messages, status]);

  function saveCfg(next: KeyCfg) {
    setCfg(next);
    localStorage.setItem("mm_key", JSON.stringify(next));
  }

  async function newChat() {
    const { data } = await supabase.from("threads").insert({ title: "New chat" }).select().single();
    if (data) { setThreads([data, ...threads]); setActive(data.id); setMessages([]); }
  }

  async function openThread(id: string) {
    setActive(id);
    const { data } = await supabase
      .from("messages").select("role, content").eq("thread_id", id)
      .in("role", ["user", "assistant"]).order("created_at", { ascending: true });
    setMessages((data as Msg[]) || []);
  }

  async function send() {
    if (!input.trim() || running) return;
    if (!cfg.apiKey) { setShowSettings(true); return; }

    let threadId = active;
    if (!threadId) {
      const title = input.trim().slice(0, 48);
      const { data } = await supabase.from("threads").insert({ title }).select().single();
      if (!data) return;
      threadId = data.id; setThreads([data, ...threads]); setActive(data.id);
    }

    const userMsg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    setRunning(true); setStatus("Starting…");

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          threadId, content: userMsg,
          provider: cfg.provider, model: cfg.model,
          apiKey: cfg.apiKey, baseUrl: cfg.baseUrl || undefined,
        }),
      });
      if (!res.ok || !res.body) {
        const t = await res.text();
        setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${t || res.statusText}` }]);
        setRunning(false); setStatus(""); return;
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n");
        buf = parts.pop() || "";
        for (const line of parts) {
          if (!line.trim()) continue;
          const ev = JSON.parse(line);
          if (ev.type === "status") setStatus(ev.text);
          else if (ev.type === "assistant") setMessages((m) => [...m, { role: "assistant", content: ev.text }]);
          else if (ev.type === "done") setCreditsLeft(ev.creditsLeft);
          else if (ev.type === "error") setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${ev.text}` }]);
        }
      }
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${(e as Error).message}` }]);
    } finally {
      setRunning(false); setStatus("");
    }
  }

  async function downloadPdf(content: string) {
    const title = messages.find((m) => m.role === "user")?.content?.slice(0, 60) || "Research Report";
    const res = await fetch("/api/report", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    if (!res.ok) return alert("PDF failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "micromanus-report.pdf"; a.click();
    URL.revokeObjectURL(url);
  }

  const modelsForProvider = MODELS.filter((m) => m.provider === cfg.provider);

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="hidden w-72 shrink-0 flex-col border-r border-edge bg-panel/60 sm:flex">
        <div className="p-4">
          <div className="text-lg font-bold">Micro<span className="text-accent">Manus</span></div>
          <button onClick={newChat} className="mt-4 w-full rounded-lg bg-accent px-3 py-2 text-sm font-medium hover:opacity-90">
            + New chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2">
          {threads.map((t) => (
            <button key={t.id} onClick={() => openThread(t.id)}
              className={`mb-1 w-full truncate rounded-lg px-3 py-2 text-left text-sm ${active === t.id ? "bg-edge text-white" : "text-white/70 hover:bg-panel"}`}>
              {t.title}
            </button>
          ))}
          {threads.length === 0 && <div className="px-3 py-2 text-sm text-white/40">No chats yet.</div>}
        </div>
        <div className="border-t border-edge p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-white/50">Credits</span>
            <span className="rounded-full bg-accent2/20 px-2 py-0.5 font-medium text-accent2">{creditsLeft}</span>
          </div>
          <Link href="/stats" className="mt-2 block rounded px-2 py-1 text-white/70 hover:bg-panel">📊 Usage & cost</Link>
          <button onClick={() => setShowSettings(true)} className="block w-full rounded px-2 py-1 text-left text-white/70 hover:bg-panel">🔑 API key & model</button>
          <form action="/auth/signout" method="post">
            <button className="mt-1 w-full rounded px-2 py-1 text-left text-white/40 hover:bg-panel">Sign out ({email})</button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-edge px-4 py-3 sm:hidden">
          <button onClick={newChat} className="rounded-lg bg-accent px-3 py-1.5 text-sm">+ New</button>
          <span className="text-sm text-accent2">{creditsLeft} credits</span>
          <button onClick={() => setShowSettings(true)} className="text-sm">🔑</button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-3xl space-y-5">
            {messages.length === 0 && (
              <div className="mt-20 text-center text-white/40">
                <div className="text-2xl">🔬</div>
                <p className="mt-2">Ask MicroManus to research anything.</p>
                <p className="mt-1 text-sm">e.g. “Explain the recent California forest fires — causes and prevention.”</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                <div className={m.role === "user"
                  ? "max-w-[85%] rounded-2xl bg-accent/90 px-4 py-2.5 text-white"
                  : "w-full rounded-2xl border border-edge bg-panel px-4 py-3"}>
                  {m.role === "assistant" ? (
                    <>
                      <div className="prose-chat text-[15px] text-white/90" dangerouslySetInnerHTML={{ __html: mdToHtml(m.content) }} />
                      {!m.content.startsWith("⚠️") && (
                        <button onClick={() => downloadPdf(m.content)}
                          className="mt-3 rounded-lg border border-edge px-3 py-1.5 text-xs text-white/70 hover:bg-edge">
                          ⬇ Download PDF report
                        </button>
                      )}
                    </>
                  ) : <span>{m.content}</span>}
                </div>
              </div>
            ))}
            {running && (
              <div className="w-full rounded-2xl border border-edge bg-panel px-4 py-3 text-sm text-accent2">
                <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-accent2" />
                {status || "Working…"}
              </div>
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="border-t border-edge px-4 py-3">
          <div className="mx-auto flex max-w-3xl items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={1}
              placeholder={cfg.apiKey ? "Ask a research question…" : "Add your API key first (🔑)…"}
              className="max-h-40 flex-1 resize-none rounded-xl border border-edge bg-ink px-4 py-3 text-sm outline-none focus:border-accent"
            />
            <button onClick={send} disabled={running || !input.trim()}
              className="rounded-xl bg-accent px-5 py-3 text-sm font-medium hover:opacity-90 disabled:opacity-40">
              {running ? "…" : "Send"}
            </button>
          </div>
          <div className="mx-auto mt-1 max-w-3xl text-center text-xs text-white/30">
            {PROVIDER_LABEL[cfg.provider]} · {findModel(cfg.model)?.label || cfg.model} · 1 credit / run
          </div>
        </div>
      </main>

      {showSettings && (
        <SettingsModal cfg={cfg} onSave={(c) => { saveCfg(c); setShowSettings(false); }} onClose={() => setShowSettings(false)} modelsForProvider={modelsForProvider} />
      )}
    </div>
  );
}

function SettingsModal({
  cfg, onSave, onClose, modelsForProvider,
}: {
  cfg: KeyCfg; onSave: (c: KeyCfg) => void; onClose: () => void;
  modelsForProvider: typeof MODELS;
}) {
  const [draft, setDraft] = useState<KeyCfg>(cfg);
  const models = MODELS.filter((m) => m.provider === draft.provider);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-edge bg-panel p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold">API key & model</h2>
        <p className="mt-1 text-xs text-white/50">Your key is stored only in this browser and sent per request. Never saved on our servers.</p>

        <label className="mt-4 block text-xs uppercase text-white/40">Provider</label>
        <select value={draft.provider}
          onChange={(e) => {
            const provider = e.target.value as Provider;
            const first = MODELS.find((m) => m.provider === provider)!;
            setDraft({ ...draft, provider, model: first.id });
          }}
          className="mt-1 w-full rounded-lg border border-edge bg-ink px-3 py-2 text-sm">
          {(["openai", "anthropic", "moonshot"] as Provider[]).map((p) => (
            <option key={p} value={p}>{PROVIDER_LABEL[p]}</option>
          ))}
        </select>

        <label className="mt-4 block text-xs uppercase text-white/40">Model</label>
        <select value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })}
          className="mt-1 w-full rounded-lg border border-edge bg-ink px-3 py-2 text-sm">
          {models.map((m) => <option key={m.id} value={m.id}>{m.label} — ${m.input}/{m.output} per 1M</option>)}
        </select>

        <label className="mt-4 block text-xs uppercase text-white/40">API key</label>
        <input type="password" value={draft.apiKey} onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
          placeholder="sk-… / your provider key"
          className="mt-1 w-full rounded-lg border border-edge bg-ink px-3 py-2 text-sm outline-none focus:border-accent" />

        <label className="mt-4 block text-xs uppercase text-white/40">Custom base URL (optional)</label>
        <input value={draft.baseUrl} onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })}
          placeholder="Leave blank to use the provider default"
          className="mt-1 w-full rounded-lg border border-edge bg-ink px-3 py-2 text-sm outline-none focus:border-accent" />

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-edge px-4 py-2 text-sm text-white/70">Cancel</button>
          <button onClick={() => onSave(draft)} disabled={!draft.apiKey}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium disabled:opacity-40">Save</button>
        </div>
      </div>
    </div>
  );
}
