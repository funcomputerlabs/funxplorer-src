import { env } from "./web-indexes.mjs";

const MODELS = [
  ...new Set(
    [env("GROQ_MODEL"), "openai/gpt-oss-20b", "openai/gpt-oss-120b"].filter(
      Boolean
    )
  ),
];

export async function groqOverview(query, results, lang) {
  const apiKey = env("GROQ_API_KEY");
  if (!apiKey || !results.length) {
    return null;
  }
  const sources = results.slice(0, 8).map((row, index) => ({
    n: index + 1,
    title: row.title,
    url: row.url,
    snippet: (row.snippet || "").slice(0, 280),
  }));
  const body = {
    temperature: 0.2,
    max_completion_tokens: 700,
    messages: [
      {
        role: "system",
        content:
          "You write Funsearch AI Overviews. Answer the user query using only the provided search results. Be concise (120-180 words), factual, and useful. Use short paragraphs or bullets. Cite sources as [1], [2] matching the numbered list. If results are thin or conflicting, say so. Do not invent URLs or facts that are not in the snippets. Write the entire overview in " +
          (lang?.name || "English") +
          ".",
      },
      {
        role: "user",
        content: `Query: ${query}\n\nResults:\n${sources
          .map(
            row =>
              `[${row.n}] ${row.title}\n${row.url}\n${row.snippet}`
          )
          .join("\n\n")}`,
      },
    ],
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    for (const model of MODELS) {
      try {
        const response = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            signal: controller.signal,
            headers: {
              Authorization: "Bearer " + apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ ...body, model }),
          }
        );
        if (!response.ok) {
          continue;
        }
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text) {
          return { text, model, sources };
        }
      } catch {
        continue;
      }
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}
