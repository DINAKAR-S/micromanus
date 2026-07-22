// Model catalog + pricing. Prices are USD per 1,000,000 tokens.
// Cache = price for cached/prompt-cache-read input tokens.
// Editable: update figures from each provider's pricing page as they change.
// Users may also type a custom model id + base URL; unknown models fall back to price 0.

export type Provider = "openai" | "anthropic" | "moonshot";

export interface ModelInfo {
  id: string;
  label: string;
  provider: Provider;
  input: number; // $/1M input tokens
  output: number; // $/1M output tokens
  cache: number; // $/1M cached input tokens
}

export const PROVIDER_BASE_URL: Record<Provider, string> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1", // Anthropic's OpenAI-compatible endpoint
  moonshot: "https://api.moonshot.ai/v1",
};

export const PROVIDER_LABEL: Record<Provider, string> = {
  openai: "OpenAI",
  anthropic: "Claude (Anthropic)",
  moonshot: "Kimi (Moonshot)",
};

export const MODELS: ModelInfo[] = [
  // OpenAI
  { id: "gpt-4o", label: "GPT-4o", provider: "openai", input: 2.5, output: 10, cache: 1.25 },
  { id: "gpt-4o-mini", label: "GPT-4o mini", provider: "openai", input: 0.15, output: 0.6, cache: 0.075 },
  { id: "gpt-4.1", label: "GPT-4.1", provider: "openai", input: 2, output: 8, cache: 0.5 },
  { id: "o3-mini", label: "o3-mini", provider: "openai", input: 1.1, output: 4.4, cache: 0.55 },
  // Claude (Anthropic) — via OpenAI-compatible endpoint. Current 2026 model IDs.
  { id: "claude-sonnet-5", label: "Claude Sonnet 5", provider: "anthropic", input: 3, output: 15, cache: 0.3 },
  { id: "claude-opus-4-8", label: "Claude Opus 4.8", provider: "anthropic", input: 15, output: 75, cache: 1.5 },
  { id: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5", provider: "anthropic", input: 3, output: 15, cache: 0.3 },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", provider: "anthropic", input: 1, output: 5, cache: 0.1 },
  // Kimi (Moonshot)
  { id: "kimi-k2-0711-preview", label: "Kimi K2", provider: "moonshot", input: 0.6, output: 2.5, cache: 0.15 },
  { id: "moonshot-v1-8k", label: "Moonshot v1 8k", provider: "moonshot", input: 0.2, output: 2, cache: 0.05 },
  { id: "moonshot-v1-32k", label: "Moonshot v1 32k", provider: "moonshot", input: 0.5, output: 2.5, cache: 0.1 },
  { id: "moonshot-v1-128k", label: "Moonshot v1 128k", provider: "moonshot", input: 1, output: 3, cache: 0.2 },
];

export function findModel(id: string): ModelInfo | undefined {
  return MODELS.find((m) => m.id === id);
}

export interface TokenUsage {
  input: number;
  output: number;
  cache: number; // cached input tokens (subset already counted in input by some providers; we bill separately)
}

// Cost in USD. Non-cached input billed at input rate; cached input billed at cache rate.
export function costOf(modelId: string, u: TokenUsage): number {
  const m = findModel(modelId);
  if (!m) return 0;
  const nonCachedInput = Math.max(0, u.input - u.cache);
  return (
    (nonCachedInput / 1e6) * m.input +
    (u.cache / 1e6) * m.cache +
    (u.output / 1e6) * m.output
  );
}
