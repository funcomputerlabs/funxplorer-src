import { collectIndexes, mergeResults } from "./_shared/web-indexes.mjs";
import { groqOverview } from "./_shared/groq-overview.mjs";
import { resolveLang } from "./_shared/langs.mjs";

const PAGE_SIZE = 10;

export default async req => {
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { searchParams } = new URL(req.url);
  const query = (searchParams.get("q") || "").trim();
  const page = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1);
  const lang = resolveLang(searchParams.get("lang") || searchParams.get("hl"));
  if (!query) {
    return Response.json({ query, page, lang: lang.id, results: [], indexes: [], overview: null });
  }

  const groups = await collectIndexes(query, page, lang);
  const merged = mergeResults(groups);
  const results = merged.results.slice(0, PAGE_SIZE);

  let overview = null;
  if (page === 1) {
    overview = await groqOverview(query, merged.results, lang);
  }

  return Response.json({
    query,
    page,
    indexes: merged.indexes,
    results,
    overview,
  });
};

export const config = {
  path: "/api/search",
};
