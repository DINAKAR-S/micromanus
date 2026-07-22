"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function PaywallForm({ justPaid }: { justPaid: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("SID_DRDROID");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<"" | "coupon" | "pay">("");

  // Returning from Stripe success: the webhook grants credits; poll then move on.
  useEffect(() => {
    if (!justPaid) return;
    setMsg("Payment received. Activating your credits…");
    const t = setInterval(() => router.refresh(), 1500);
    return () => clearInterval(t);
  }, [justPaid, router]);

  async function redeem() {
    setBusy("coupon"); setMsg(null);
    const r = await fetch("/api/coupon", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error || "Failed"); setBusy(""); return; }
    router.replace("/chat");
  }

  async function pay() {
    setBusy("pay"); setMsg(null);
    const r = await fetch("/api/checkout", { method: "POST" });
    const j = await r.json();
    if (j.url) window.location.href = j.url;
    else { setMsg(j.error || "Could not start checkout"); setBusy(""); }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <a href="/" className="mb-8 text-lg font-bold tracking-tight text-white/90">Micro<span className="text-accent">Manus</span></a>
      <div className="w-full max-w-md rounded-2xl border border-edge bg-panel p-8">
        <h1 className="text-2xl font-bold text-center">Unlock MicroManus</h1>
        <p className="mt-2 text-center text-sm text-white/60">
          Get <span className="text-accent2 font-semibold">5 credits</span> (1 credit = 1 research run).
        </p>

        <div className="mt-5 rounded-lg border border-accent2/30 bg-accent2/10 px-4 py-3 text-center text-sm text-white/85">
          Reviewing this? The coupon <span className="font-semibold text-accent2">SID_DRDROID</span> is pre-filled below. Just click <span className="font-semibold">Redeem</span> for 5 free credits.
        </div>

        {msg && <div className="mt-4 rounded-lg border border-edge bg-ink px-4 py-3 text-sm text-white/80">{msg}</div>}

        {/* Coupon */}
        <div className="mt-6">
          <label className="text-xs uppercase tracking-wide text-white/40">Coupon (pre-filled)</label>
          <div className="mt-2 flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter coupon code"
              className="flex-1 rounded-lg border border-edge bg-ink px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              onClick={redeem}
              disabled={busy !== "" || !code.trim()}
              className="rounded-lg bg-accent2 px-4 py-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-40"
            >
              {busy === "coupon" ? "…" : "Redeem"}
            </button>
          </div>
        </div>

        <div className="my-6 flex items-center gap-3 text-xs text-white/30">
          <div className="h-px flex-1 bg-edge" /> or <div className="h-px flex-1 bg-edge" />
        </div>

        {/* Pay */}
        <button
          onClick={pay}
          disabled={busy !== ""}
          className="btn-metal w-full rounded-lg px-4 py-3 font-semibold disabled:opacity-40"
        >
          {busy === "pay" ? "Starting checkout…" : "Add a card & pay $5"}
        </button>
        <p className="mt-3 text-center text-xs text-white/40">
          Stripe test mode. Use card 4242 4242 4242 4242, any future date and CVC.
        </p>
      </div>
    </main>
  );
}
