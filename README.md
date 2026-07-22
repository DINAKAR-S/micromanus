# MicroManus — Deep Research Agent with usage-based billing

A web app where you sign in (GitHub/Google), unlock 5 credits (coupon **`SID_DRDROID`** or a $5 Stripe test payment), then chat with an agent that **searches the web in a loop** (think → search → read → think), holds context per thread, and can export a **PDF report**. A **usage page** shows per-chat cost split by input / output / cache tokens for the selected model.

**Bring your own model key** — OpenAI, Claude (Anthropic), or Kimi (Moonshot). The key lives only in your browser and is sent per request; it is never stored on the server or pre-loaded.

---

## Stack
Next.js (App Router) · Supabase (auth + Postgres + RLS) · Stripe test Checkout · Tavily search · `@react-pdf/renderer` · one OpenAI-compatible client with a per-provider base URL.

## Setup (≈5 min)

### 1. Supabase
1. Create a project → **SQL Editor** → paste & run [`supabase/schema.sql`](supabase/schema.sql).
2. **Authentication → Providers**: enable **GitHub** and **Google** (add each provider's OAuth client id/secret).
3. **Authentication → URL Configuration**: set **Site URL** to your deployed URL and add `<your-url>/auth/callback` to **Redirect URLs**.
4. **Project Settings → API**: copy `Project URL`, `anon` key, `service_role` key.

### 2. Stripe (test mode)
1. Grab the **test** Secret key (`sk_test_…`) and Publishable key (`pk_test_…`).
2. Create a webhook endpoint → `https://<your-url>/api/stripe/webhook`, event `checkout.session.completed`. Copy the signing secret (`whsec_…`).

### 3. Tavily
Create a free key at tavily.com (`tvly-…`).

### 4. Environment
Set these in **Vercel → Project → Settings → Environment Variables** (and `.env.local` for local dev — see [`.env.example`](.env.example)):

```
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
TAVILY_API_KEY
NEXT_PUBLIC_SITE_URL   (your deployed https URL)
BYPASS_COUPON=SID_DRDROID
```

### 5. Run
```bash
npm install
npm run dev      # http://localhost:3000
```

## Deploy (Vercel)
```bash
npx vercel --prod
```
After the first deploy, set `NEXT_PUBLIC_SITE_URL` to the live URL, add the Supabase redirect URL and Stripe webhook for that domain, then redeploy.

## Test the full flow
1. Sign in with GitHub/Google.
2. On the paywall: enter coupon `SID_DRDROID` **or** pay with Stripe test card `4242 4242 4242 4242` (any future expiry + CVC). → 5 credits.
3. Click 🔑, add your model provider + key, save.
4. Ask: *"Explain the recent California forest fires — causes and prevention."* Watch it search in a loop, then download the PDF.
5. Open **Usage & cost** to see per-chat token breakdown and cost.

## Notes
- **1 credit = 1 agent run.** The $5 top-up and the coupon both grant 5. Dollar cost-per-token is tracked separately on the usage page.
- Agent loop is capped at 6 iterations with `maxDuration=60s` (raise on Vercel Pro for longer research).
- Public repo: **no secrets are committed** — all keys live in Vercel env vars.
