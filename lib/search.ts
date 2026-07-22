// Tavily web search — one endpoint, agent-shaped results.
export interface SearchResult {
  title: string;
  url: string;
  content: string;
}

export async function tavilySearch(
  query: string,
  maxResults = 5
): Promise<{ answer: string | null; results: SearchResult[] }> {
  const key = process.env.TAVILY_API_KEY;
  if (!key || key.includes("placeholder")) {
    return { answer: null, results: [{ title: "Search unavailable", url: "", content: "TAVILY_API_KEY not configured." }] };
  }

  const r = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      api_key: key,
      query,
      max_results: maxResults,
      search_depth: "advanced",
      include_answer: true,
    }),
  });

  if (!r.ok) {
    return { answer: null, results: [{ title: "Search error", url: "", content: `Tavily ${r.status}` }] };
  }
  const data = await r.json();
  return {
    answer: data.answer ?? null,
    results: (data.results ?? []).map((x: any) => ({
      title: x.title,
      url: x.url,
      content: (x.content ?? "").slice(0, 1500),
    })),
  };
}
