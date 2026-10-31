const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Funxplorer/146.0";

export function env(name) {
  return globalThis.Netlify?.env?.get(name) || process.env[name] || "";
}

export function safeHttpUrl(href, base) {
  try {
    const url = new URL(href, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    if (
      /bing\.com|duckduckgo\.com|microsoftonline|login\.live/i.test(url.hostname)
    ) {
      return null;
    }
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|yclid|fbclid|gclid)/i.test(key)) {
        url.searchParams.delete(key);
      }
    }
    return url.href;
  } catch {
    return null;
  }
}

export function normalizeKey(href) {
  try {
    const url = new URL(href);
    url.hash = "";
    url.hostname = url.hostname.replace(/^www\./, "").toLowerCase();
    if (url.pathname.length > 1) {
      url.pathname = url.pathname.replace(/\/+$/, "");
    }
    return url.origin + url.pathname + url.search;
  } catch {
    return href;
  }
}

export function decodeHtml(value) {
  return (value || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchText(url, timeoutMs = 4500, headers = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/json,application/xml;q=0.9,*/*;q=0.8",
        ...headers,
      },
    });
    if (!response.ok) {
      throw new Error("fetch-failed");
    }
    return response.text();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJson(url, timeoutMs = 7000, headers = {}) {
  const text = await fetchText(url, timeoutMs, {
    Accept: "application/json",
    ...headers,
  });
  return JSON.parse(text);
}

function item(title, url, snippet, source) {
  const href = safeHttpUrl(url, "https://funsearchapp.netlify.app/");
  const clean = decodeHtml(title);
  if (!clean || !href) {
    return null;
  }
  return { title: clean, url: href, snippet: decodeHtml(snippet), source };
}

export function parseRss(xmlText, source, base) {
  return [...xmlText.matchAll(/<item>([\s\S]*?)<\/item>/gi)]
    .map(match => {
      const block = match[1];
      const title = block.match(
        /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i
      )?.[1];
      const link = block.match(/<link>([\s\S]*?)<\/link>/i)?.[1]?.trim();
      const snippet = block.match(
        /<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i
      )?.[1];
      return item(title, safeHttpUrl(link, base) || link, snippet, source);
    })
    .filter(Boolean);
}

function parseAnchorList(html, regex, source, base, extra) {
  const results = [];
  for (const match of html.matchAll(regex)) {
    const parsed = extra ? extra(match) : item(match[2], match[1], "", source);
    const row = parsed
      ? parsed.source
        ? parsed
        : item(parsed.title, parsed.url, parsed.snippet, source)
      : item(match[2], match[1], "", source);
    if (row) {
      results.push(row);
    }
  }
  return results;
}

export async function bingIndex(query, page, lang) {
  const first = (page - 1) * 10 + 1;
  const base = "https://www.bing.com/search";
  const loc = `&setlang=${encodeURIComponent(lang.id)}&mkt=${encodeURIComponent(lang.mkt)}`;
  if (page === 1) {
    try {
      const rss = await fetchText(
        `${base}?format=rss&q=${encodeURIComponent(query)}${loc}`
      );
      const items = parseRss(rss, "bing", base);
      if (items.length) {
        return items;
      }
    } catch {}
  }
  const html = await fetchText(
    `${base}?q=${encodeURIComponent(query)}&first=${first}${loc}`
  );
  const results = [];
  for (const block of html.split(/<li class="b_algo"/i).slice(1)) {
    const linkMatch = block.match(
      /<h2[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i
    );
    if (!linkMatch) {
      continue;
    }
    const snippet = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || "";
    const row = item(linkMatch[2], linkMatch[1], snippet, "bing");
    if (row) {
      results.push(row);
    }
  }
  return results;
}

export async function ddgIndex(query, lang) {
  const html = await fetchText(
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=${encodeURIComponent(lang.kl)}`
  );
  return parseAnchorList(
    html,
    /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
    "duckduckgo",
    "https://html.duckduckgo.com/html/",
    match => {
      let href = match[1];
      const uddg = href.match(/[?&]uddg=([^&]+)/);
      if (uddg) {
        href = decodeURIComponent(uddg[1]);
      }
      return item(match[2], href, "", "duckduckgo");
    }
  );
}

export async function wikipediaIndex(query, lang) {
  const host = `https://${lang.wiki}.wikipedia.org`;
  const data = await fetchJson(
    `${host}/w/api.php?action=query&list=search&format=json&utf8=1&srlimit=8&srsearch=` +
      encodeURIComponent(query),
    6000,
    { "Api-User-Agent": "Funsearch/1.0" }
  );
  return (data.query?.search || [])
    .map(entry =>
      item(
        entry.title,
        host + "/wiki/" + entry.title.replace(/ /g, "_"),
        entry.snippet,
        "wikipedia"
      )
    )
    .filter(Boolean);
}

export async function qwantIndex(query, page, lang) {
  const offset = (page - 1) * 10;
  const data = await fetchJson(
    `https://api.qwant.com/v3/search/web?q=${encodeURIComponent(query)}&count=10&locale=${encodeURIComponent(lang.qwant)}&offset=${offset}&device=desktop`
  );
  const items = data?.data?.result?.items?.mainline || data?.data?.result?.items || [];
  const rows = [];
  for (const group of items) {
    const list = Array.isArray(group.items) ? group.items : [group];
    for (const entry of list) {
      if (entry.url && entry.title) {
        const row = item(entry.title, entry.url, entry.desc || entry.description || "", "qwant");
        if (row) {
          rows.push(row);
        }
      }
    }
  }
  return rows;
}

export async function braveIndex(query) {
  const html = await fetchText(
    `https://search.brave.com/search?q=${encodeURIComponent(query)}&source=web`
  );
  const results = [];
  for (const match of html.matchAll(
    /<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>\s*<div[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
  )) {
    const row = item(match[2], match[1], "", "brave");
    if (row && !/brave\.com/i.test(row.url)) {
      results.push(row);
    }
  }
  if (results.length) {
    return results;
  }
  return parseAnchorList(
    html,
    /<a[^>]*href="(https?:\/\/(?!cdn\.|search\.brave)[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
    "brave"
  ).filter(row => row.title.length > 12);
}

export async function mojeekIndex(query) {
  const html = await fetchText(
    `https://www.mojeek.com/search?q=${encodeURIComponent(query)}`
  );
  return parseAnchorList(
    html,
    /<a class="title"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
    "mojeek"
  );
}

export async function yahooIndex(query) {
  const html = await fetchText(
    `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`
  );
  return parseAnchorList(
    html,
    /<h3[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
    "yahoo"
  ).filter(row => !/yahoo\.com\/search/i.test(row.url));
}

export async function hnIndex(query) {
  const data = await fetchJson(
    `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story`
  );
  return (data.hits || [])
    .map(hit =>
      item(
        hit.title,
        hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
        hit.story_text || "",
        "hackernews"
      )
    )
    .filter(Boolean);
}

export async function redditIndex(query) {
  const data = await fetchJson(
    `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=8&sort=relevance`,
    7000,
    { "User-Agent": UA }
  );
  const children = data?.data?.children || [];
  return children
    .map(entry => {
      const post = entry.data || {};
      const url = post.url_overridden_by_dest || post.url;
      return item(post.title, url, post.selftext?.slice(0, 240) || "", "reddit");
    })
    .filter(Boolean);
}

export async function githubIndex(query) {
  const data = await fetchJson(
    `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=5`,
    7000,
    { Accept: "application/vnd.github+json", "User-Agent": "Funsearch" }
  );
  return (data.items || [])
    .map(repo =>
      item(
        repo.full_name,
        repo.html_url,
        repo.description || "",
        "github"
      )
    )
    .filter(Boolean);
}

export async function stackoverflowIndex(query) {
  const data = await fetchJson(
    "https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&site=stackoverflow&pagesize=5&q=" +
      encodeURIComponent(query)
  );
  return (data.items || [])
    .map(post =>
      item(post.title, post.link, (post.tags || []).join(", "), "stackoverflow")
    )
    .filter(Boolean);
}

export async function ddgAnswersIndex(query, lang) {
  const data = await fetchJson(
    `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1&kl=${encodeURIComponent(lang.kl)}`
  );
  const rows = [];
  if (data.AbstractURL && (data.Heading || data.AbstractText)) {
    const row = item(
      data.Heading || data.AbstractURL,
      data.AbstractURL,
      data.AbstractText || "",
      "duckduckgo"
    );
    if (row) {
      rows.push(row);
    }
  }
  for (const topic of data.RelatedTopics || []) {
    if (topic.FirstURL && topic.Text) {
      const row = item(topic.Text.split(" - ")[0], topic.FirstURL, topic.Text, "duckduckgo");
      if (row) {
        rows.push(row);
      }
    }
  }
  return rows;
}

const INDEX_WEIGHT = {
  bing: 4,
  brave: 4,
  qwant: 4,
  duckduckgo: 3,
  mojeek: 3,
  yahoo: 2,
  wikipedia: 3,
  hackernews: 1,
  reddit: 1,
  github: 1,
  stackoverflow: 1,
};

export function mergeResults(groups) {
  const map = new Map();
  const indexes = [];
  for (const { source, items } of groups) {
    if (items?.length) {
      indexes.push(source);
    }
    for (const row of items || []) {
      const key = normalizeKey(row.url);
      const current = map.get(key);
      const weight = INDEX_WEIGHT[row.source] || 1;
      if (!current) {
        map.set(key, { ...row, sources: [row.source], score: weight });
      } else {
        current.score += weight;
        if (!current.sources.includes(row.source)) {
          current.sources.push(row.source);
        }
        if (!current.snippet && row.snippet) {
          current.snippet = row.snippet;
        }
      }
    }
  }
  return {
    indexes,
    results: [...map.values()].sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)),
  };
}

export async function collectIndexes(query, page, lang) {
  const jobs = [
    ["bing", () => bingIndex(query, page, lang)],
    ["duckduckgo", () => ddgIndex(query, lang)],
    ["qwant", () => qwantIndex(query, page, lang)],
    ["brave", () => braveIndex(query)],
    ["mojeek", () => mojeekIndex(query)],
    ["yahoo", () => yahooIndex(query)],
    ["wikipedia", () => wikipediaIndex(query, lang)],
    ["duckduckgo-ia", () => ddgAnswersIndex(query, lang)],
    ["hackernews", () => hnIndex(query)],
    ["reddit", () => redditIndex(query)],
    ["github", () => githubIndex(query)],
    ["stackoverflow", () => stackoverflowIndex(query)],
  ];
  const settled = await Promise.allSettled(
    jobs.map(async ([source, run]) => ({ source, items: await run() }))
  );
  return settled
    .filter(entry => entry.status === "fulfilled")
    .map(entry => entry.value);
}
