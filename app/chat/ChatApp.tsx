"use client";
import { useEffect, useRef, useState } from "react";
import { MODELS, PROVIDER_LABEL, findModel, type Provider } from "@/lib/models";
import { mdToHtml } from "@/lib/md";
import { ProviderIcon } from "./icons";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Check, ChevronDown, FileDown, KeyRound, Plus, BarChart3, LogOut, Trash2 } from "lucide-react";
import Link from "next/link";

type Thread = { id: string; title: string; created_at: string };
type Msg = { role: string; content: string };
type KeyCfg = { provider: Provider; model: string; apiKey: string; baseUrl: string; saved?: boolean };

const DEFAULT_CFG: KeyCfg = { provider: "openai", model: "gpt-4o-mini", apiKey: "", baseUrl: "", saved: false };

export default function ChatApp({
  initialThreads, credits, email, userId,
}: { initialThreads: Thread[]; credits: number; email: string; userId: string }) {
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
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const snap = (c: KeyCfg): KeyCfg => {
      if (!MODELS.find((m) => m.id === c.model && m.provider === c.provider)) {
        const first = MODELS.find((m) => m.provider === c.provider);
        if (first) c.model = first.id;
      }
      return c;
    };
    (async () => {
      // Prefer a server-saved key (syncs across devices); fall back to this browser's localStorage.
      try {
        const r = await fetch("/api/keys");
        const j = await r.json();
        if (j.saved) {
          const c = snap({ provider: j.provider, model: j.model, baseUrl: j.baseUrl || "", apiKey: "", saved: true });
          setCfg(c); localStorage.setItem("mm_key", JSON.stringify(c));
          return;
        }
      } catch {}
      const raw = localStorage.getItem("mm_key");
      if (raw) { try { setCfg(snap({ ...DEFAULT_CFG, ...JSON.parse(raw) })); } catch {} }
      else setShowSettings(true);
    })();
  }, []);

  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [messages, status]);

  function autosize() {
    const t = taRef.current; if (!t) return;
    t.style.height = "0px";
    t.style.height = Math.min(t.scrollHeight, 220) + "px";
  }

  function saveCfg(next: KeyCfg) {
    setCfg(next);
    localStorage.setItem("mm_key", JSON.stringify(next));
  }

  async function createThread(title: string): Promise<Thread | null> {
    const r = await fetch("/api/threads", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!r.ok) return null;
    return (await r.json()) as Thread;
  }

  async function newChat() {
    const data = await createThread("New chat");
    if (data) { setThreads([data, ...threads]); setActive(data.id); setMessages([]); }
  }

  async function openThread(id: string) {
    setActive(id);
    const r = await fetch(`/api/threads?threadId=${id}`);
    const j = await r.json().catch(() => ({ messages: [] }));
    setMessages((j.messages as Msg[]) || []);
  }

  async function deleteThread(id: string) {
    const r = await fetch(`/api/threads?threadId=${id}`, { method: "DELETE" });
    if (!r.ok) return;
    setThreads((ts) => ts.filter((t) => t.id !== id));
    if (active === id) { setActive(null); setMessages([]); }
  }

  async function send(override?: string) {
    const userMsg = (override ?? input).trim();
    if (!userMsg || running) return;
    if (!cfg.apiKey && !cfg.saved) { setInput(userMsg); setShowSettings(true); return; }

    let threadId = active;
    if (!threadId) {
      const data = await createThread(userMsg.slice(0, 48));
      if (!data) { setMessages((m) => [...m, { role: "assistant", content: "⚠️ Could not start a chat. Try signing out and back in." }]); return; }
      threadId = data.id; setThreads([data, ...threads]); setActive(data.id);
    }

    setInput(""); requestAnimationFrame(autosize);
    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    setRunning(true); setStatus("Starting…");

    try {
      const res = await fetch("/api/agent", {
        method: "POST", headers: { "content-type": "application/json" },
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

  const empty = messages.length === 0;

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="hidden w-72 shrink-0 flex-col border-r border-edge bg-panel/50 sm:flex">
        <div className="p-4">
          <div className="text-lg font-bold">Micro<span className="text-accent">Manus</span></div>
          <button onClick={newChat} className="btn-metal mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold">
            <Plus className="h-4 w-4" /> New chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2">
          {threads.map((t) => (
            <div key={t.id}
              className={`group mb-1 flex items-center rounded-lg ${active === t.id ? "bg-edge" : "hover:bg-panel"}`}>
              <button onClick={() => openThread(t.id)}
                className={`flex-1 truncate px-3 py-2 text-left text-sm ${active === t.id ? "text-white" : "text-white/70"}`}>
                {t.title}
              </button>
              <button onClick={() => deleteThread(t.id)} aria-label="Delete chat"
                className="mr-1 rounded p-1.5 text-white/30 opacity-0 transition hover:text-red-400 group-hover:opacity-100">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {threads.length === 0 && <div className="px-3 py-2 text-sm text-white/40">No chats yet.</div>}
        </div>
        <div className="border-t border-edge p-3 text-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-white/50">Credits</span>
            <span className="rounded-full bg-accent2/20 px-2 py-0.5 font-medium text-accent2">{creditsLeft}</span>
          </div>
          <Link href="/stats" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-white/70 hover:bg-panel"><BarChart3 className="h-4 w-4" /> Usage &amp; cost</Link>
          <button onClick={() => setShowSettings(true)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-white/70 hover:bg-panel"><KeyRound className="h-4 w-4" /> API key &amp; model</button>
          <form action="/auth/signout" method="post">
            <button className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-white/40 hover:bg-panel"><LogOut className="h-4 w-4" /> Sign out</button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-edge px-4 py-3 sm:hidden">
          <button onClick={newChat} className="btn-metal flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium"><Plus className="h-4 w-4" /> New</button>
          <span className="text-sm text-accent2">{creditsLeft} credits</span>
          <button onClick={() => setShowSettings(true)}><KeyRound className="h-4 w-4" /></button>
        </div>

        <div ref={scrollRef} className={`flex-1 overflow-y-auto px-4 ${empty ? "flex items-center" : "py-6"}`}>
          <div className="mx-auto w-full max-w-3xl">
            {empty ? (
              <div className="w-full">
                <h1 className="text-center text-4xl font-semibold tracking-tight text-white/90">
                  How can I help you<span className="text-accent">?</span>
                </h1>
                <p className="mt-3 text-center text-white/50">Deep research with live web search. Ask anything.</p>
                <div className="mt-8"><Composer {...{ taRef, input, setInput, autosize, send, running, cfg, saveCfg, setShowSettings }} /></div>
                <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {[
                    ["📈", "Research today's Indian stock market movers"],
                    ["🔥", "Recent California forest fires: causes and prevention"],
                    ["🔋", "State of solid-state batteries in 2026"],
                    ["🧭", "Compare Perplexity vs Manus on UX"],
                  ].map(([icon, s]) => (
                    <button key={s} onClick={() => send(s)}
                      className="flex items-center gap-3 rounded-xl border border-edge bg-panel/50 px-4 py-3 text-left text-sm text-white/70 transition hover:border-silver/50 hover:bg-panel hover:text-white">
                      <span className="text-base leading-none">{icon}</span>
                      <span className="flex-1">{s}</span>
                      <span className="text-white/30">↗</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-5 pb-4">
                {messages.map((m, i) => (
                  <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                    <div className={m.role === "user"
                      ? "max-w-[85%] rounded-2xl bg-accent px-4 py-2.5 font-medium text-ink"
                      : "w-full rounded-2xl border border-edge bg-panel px-4 py-3"}>
                      {m.role === "assistant" ? (
                        <>
                          <div className="prose-chat text-[15px] text-white/90" dangerouslySetInnerHTML={{ __html: mdToHtml(m.content) }} />
                          {!m.content.startsWith("⚠️") && (
                            <button onClick={() => downloadPdf(m.content)}
                              className="mt-3 flex items-center gap-1.5 rounded-lg border border-edge px-3 py-1.5 text-xs text-white/70 hover:bg-edge">
                              <FileDown className="h-3.5 w-3.5" /> Download PDF report
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
            )}
          </div>
        </div>

        {/* Composer pinned at bottom once a conversation exists */}
        {!empty && (
          <div className="px-4 pb-4">
            <div className="mx-auto max-w-3xl">
              <Composer {...{ taRef, input, setInput, autosize, send, running, cfg, saveCfg, setShowSettings }} />
            </div>
          </div>
        )}
      </main>

      {showSettings && (
        <SettingsModal cfg={cfg} onSave={(c) => { saveCfg(c); setShowSettings(false); }} onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

/* ---------- Composer (animated AI input look) ---------- */
export function Composer({
  taRef, input, setInput, autosize, send, running, cfg, saveCfg, setShowSettings,
}: {
  taRef: React.RefObject<HTMLTextAreaElement | null>;
  input: string; setInput: (s: string) => void; autosize: () => void;
  send: () => void; running: boolean; cfg: KeyCfg;
  saveCfg: (c: KeyCfg) => void; setShowSettings: (b: boolean) => void;
}) {
  return (
    <div className="rounded-2xl bg-white/5 p-1.5 ring-1 ring-edge">
      <textarea
        ref={taRef}
        value={input}
        onChange={(e) => { setInput(e.target.value); autosize(); }}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
        rows={1}
        placeholder={cfg.apiKey || cfg.saved ? "What can I research for you?" : "Add your API key first (key icon below)…"}
        className="max-h-56 w-full resize-none rounded-xl bg-transparent px-4 py-3 text-[15px] text-white placeholder:text-white/40 outline-none"
      />
      <div className="flex items-center justify-between px-2 pb-1">
        <ModelMenu cfg={cfg} saveCfg={saveCfg} openSettings={() => setShowSettings(true)} />
        <button
          onClick={() => send()}
          disabled={running || !input.trim()}
          aria-label="Send"
          className="btn-metal flex h-9 w-9 items-center justify-center rounded-xl disabled:opacity-30"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ModelMenu({ cfg, saveCfg, openSettings }: { cfg: KeyCfg; saveCfg: (c: KeyCfg) => void; openSettings: () => void }) {
  const [open, setOpen] = useState(false);
  const models = MODELS.filter((m) => m.provider === cfg.provider);
  const label = findModel(cfg.model)?.label || cfg.model;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-white/80 hover:bg-white/10"
      >
        <ProviderIcon provider={cfg.provider} />
        <AnimatePresence mode="wait">
          <motion.span key={cfg.model} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.15 }}>
            {label}
          </motion.span>
        </AnimatePresence>
        <ChevronDown className="h-3 w-3 opacity-50" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-11 left-0 z-20 min-w-[15rem] rounded-xl border border-edge bg-panel p-1 shadow-xl">
            <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-white/30">{PROVIDER_LABEL[cfg.provider]}</div>
            {models.map((m) => (
              <button key={m.id} onClick={() => { saveCfg({ ...cfg, model: m.id }); setOpen(false); }}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-white/85 hover:bg-white/10">
                <span className="flex items-center gap-2"><ProviderIcon provider={m.provider} /> {m.label}</span>
                {cfg.model === m.id && <Check className="h-4 w-4 text-accent2" />}
              </button>
            ))}
            <div className="my-1 h-px bg-edge" />
            <button onClick={() => { setOpen(false); openSettings(); }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-white/60 hover:bg-white/10">
              <KeyRound className="h-4 w-4" /> Change provider / API key
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Settings modal ---------- */
function SettingsModal({ cfg, onSave, onClose }: { cfg: KeyCfg; onSave: (c: KeyCfg) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<KeyCfg>(cfg);
  const [remember, setRemember] = useState<boolean>(!!cfg.saved);
  const [busy, setBusy] = useState(false);
  const models = MODELS.filter((m) => m.provider === draft.provider);
  const canSave = !!draft.apiKey || !!cfg.saved; // already-saved key can be kept without re-typing

  async function save() {
    setBusy(true);
    try {
      if (remember && draft.apiKey) {
        await fetch("/api/keys", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ provider: draft.provider, model: draft.model, baseUrl: draft.baseUrl, apiKey: draft.apiKey }),
        });
      } else if (!remember) {
        await fetch("/api/keys", { method: "DELETE" }); // stop syncing: drop the server copy
      }
    } catch {}
    setBusy(false);
    // When remembered, don't keep the raw key in this browser — the server holds it (encrypted).
    onSave({ provider: draft.provider, model: draft.model, baseUrl: draft.baseUrl, apiKey: remember ? "" : draft.apiKey, saved: remember });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-edge bg-panel p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold">API key &amp; model</h2>
        <p className="mt-1 text-xs text-white/50">By default your key stays in this browser and is sent per request. Tick “save” below to store it encrypted on your account so it syncs to other devices.</p>

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
        <select value={models.some((m) => m.id === draft.model) ? draft.model : ""} onChange={(e) => setDraft({ ...draft, model: e.target.value })}
          className="mt-1 w-full rounded-lg border border-edge bg-ink px-3 py-2 text-sm">
          <option value="" disabled>Choose a model…</option>
          {models.map((m) => <option key={m.id} value={m.id}>{m.label} · ${m.input}/{m.output} per 1M</option>)}
        </select>
        <input value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })}
          placeholder="or exact model ID, e.g. claude-3-5-sonnet-20241022"
          className="mt-2 w-full rounded-lg border border-edge bg-ink px-3 py-2 text-xs text-white/70 outline-none focus:border-accent" />
        <p className="mt-1 text-[11px] text-white/35">Model ID sent to the provider. Must be an exact ID your key can access.</p>

        <label className="mt-4 block text-xs uppercase text-white/40">API key</label>
        <input type="password" value={draft.apiKey} onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
          placeholder={cfg.saved ? "Key saved on your account (leave blank to keep it)" : "sk-… / your provider key"}
          className="mt-1 w-full rounded-lg border border-edge bg-ink px-3 py-2 text-sm outline-none focus:border-accent" />

        <label className="mt-4 block text-xs uppercase text-white/40">Custom base URL (optional)</label>
        <input value={draft.baseUrl} onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })}
          placeholder="Leave blank to use the provider default"
          className="mt-1 w-full rounded-lg border border-edge bg-ink px-3 py-2 text-sm outline-none focus:border-accent" />

        <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-lg border border-edge bg-ink/50 p-3">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="mt-0.5 h-4 w-4 accent-accent2" />
          <span className="text-sm">
            <span className="font-medium">Save my key to my account (encrypted)</span>
            <span className="mt-0.5 block text-xs text-white/45">AES-256 encrypted at rest. Syncs to your other devices so you don’t re-enter it. Uncheck to remove it and keep the key in this browser only.</span>
          </span>
        </label>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-edge px-4 py-2 text-sm text-white/70">Cancel</button>
          <button onClick={save} disabled={!canSave || busy}
            className="btn-metal rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40">{busy ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}
