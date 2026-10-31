/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const PAGE_SIZE = 10;
const FUNSEARCH_API = "https://funsearchapp.netlify.app/api/search";
const LANGS = [
  "en", "es", "es-MX", "ca", "eu", "gl", "fr", "de", "it", "pt", "pt-BR",
  "nl", "pl", "ru", "uk", "tr", "ar", "he", "fa", "ur", "hi", "bn", "ta",
  "ja", "ko", "zh-CN", "zh-TW", "vi", "th", "id", "ms", "sv", "no", "da",
  "fi", "cs", "sk", "hu", "ro", "el", "bg", "hr", "sr", "sl", "lt", "lv",
  "et", "ga", "sw", "af",
];

function pageParams() {
  let specs = [window.location.href, document.documentURI];
  try {
    specs.push(window.docShell.currentURI.spec);
  } catch {
    // Not available in all loads.
  }
  for (let spec of specs) {
    if (!spec) {
      continue;
    }
    let queryStart = spec.indexOf("?");
    if (queryStart < 0) {
      continue;
    }
    let query = spec.slice(queryStart + 1).split("#")[0];
    if (query.includes("q=")) {
      return new URLSearchParams(query);
    }
  }
  return new URLSearchParams(window.location.search);
}

function safeHttpUrl(href) {
  try {
    let url = new URL(href, INDEX_SEARCH);
    if (url.protocol != "http:" && url.protocol != "https:") {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

function parseRss(xmlText) {
  let doc = new DOMParser().parseFromString(xmlText, "application/xml");
  if (doc.querySelector("parsererror")) {
    return [];
  }
  return [...doc.querySelectorAll("item")]
    .map(item => {
      let title = item.querySelector("title")?.textContent?.trim();
      let url = safeHttpUrl(item.querySelector("link")?.textContent?.trim());
      let snippet = item.querySelector("description")?.textContent?.trim();
      return title && url ? { title, url, snippet: snippet || "" } : null;
    })
    .filter(Boolean);
}

function parseHtml(htmlText) {
  let doc = new DOMParser().parseFromString(htmlText, "text/html");
  return [...doc.querySelectorAll("li.b_algo")]
    .map(item => {
      let link = item.querySelector("h2 a, .b_title a");
      let title = link?.textContent?.trim();
      let url = safeHttpUrl(link?.href);
      let snippet =
        item
          .querySelector("p, .b_caption p, .b_lineclamp")
          ?.textContent?.trim() || "";
      return title && url ? { title, url, snippet } : null;
    })
    .filter(Boolean);
}

function currentLang() {
  return (
    pageParams().get("hl") ||
    localStorage.getItem("funsearch-lang") ||
    navigator.language ||
    "en"
  );
}

function fillLanguages() {
  let select = document.getElementById("lang-select");
  if (!select || select.childElementCount) {
    return;
  }
  let current = currentLang();
  for (let id of LANGS) {
    let option = document.createElement("option");
    option.value = id;
    option.textContent = id;
    select.appendChild(option);
  }
  select.value = LANGS.includes(current) ? current : current.split("-")[0];
  select.addEventListener("change", () => {
    localStorage.setItem("funsearch-lang", select.value);
    let query = document.getElementById("q").value.trim();
    let url = "https://funsearchapp.netlify.app/?hl=" + encodeURIComponent(select.value);
    if (query) {
      url += "&q=" + encodeURIComponent(query);
    }
    window.location.href = url;
  });
}

async function fetchResults(query, page) {
  if (typeof window.funsearchFetchResults === "function") {
    return window.funsearchFetchResults(query, page);
  }
  let lang = currentLang();
  let response = await fetch(
    `${FUNSEARCH_API}?q=${encodeURIComponent(query)}&page=${page}&lang=${encodeURIComponent(lang)}`,
    { credentials: "omit" }
  );
  if (!response.ok) {
    throw new Error("search-failed");
  }
  let data = await response.json();
  return data.results || [];
}

function renderHome() {
  document.getElementById("home").classList.remove("hidden");
  document.getElementById("q").focus();
}

async function renderResults(query, page) {
  let status = document.getElementById("status");
  let resultsEl = document.getElementById("results");
  let pager = document.getElementById("pager");
  status.hidden = false;
  status.classList.remove("hidden");
  status.textContent = "";
  document.l10n.setAttributes(status, "funsearch-results-heading", { query });

  try {
    let results = await fetchResults(query, page);
    resultsEl.replaceChildren();
    if (!results.length) {
      document.l10n.setAttributes(status, "funsearch-no-results", { query });
      return;
    }
    document.l10n.setAttributes(status, "funsearch-results-count", {
      count: results.length,
    });
    for (let result of results) {
      let article = document.createElement("article");
      article.className = "result";
      let heading = document.createElement("h2");
      let link = document.createElement("a");
      link.href = result.url;
      link.textContent = result.title;
      heading.appendChild(link);
      let urlEl = document.createElement("div");
      urlEl.className = "url";
      urlEl.textContent = result.url;
      article.append(heading, urlEl);
      if (result.snippet) {
        let snippet = document.createElement("p");
        snippet.textContent = result.snippet;
        article.appendChild(snippet);
      }
      resultsEl.appendChild(article);
    }
    resultsEl.classList.remove("hidden");
    pager.replaceChildren();
    if (page > 1) {
      let prev = document.createElement("a");
      prev.href = `https://funsearchapp.netlify.app/?q=${encodeURIComponent(query)}&page=${page - 1}`;
      document.l10n.setAttributes(prev, "funsearch-previous-page");
      pager.appendChild(prev);
    }
    if (results.length >= PAGE_SIZE) {
      let next = document.createElement("a");
      next.href = `https://funsearchapp.netlify.app/?q=${encodeURIComponent(query)}&page=${page + 1}`;
      document.l10n.setAttributes(next, "funsearch-next-page");
      pager.appendChild(next);
    }
    pager.classList.toggle("hidden", !pager.childElementCount);
  } catch {
    document.l10n.setAttributes(status, "funsearch-error");
  }
}

document.getElementById("search-form").addEventListener("submit", event => {
  event.preventDefault();
  let query = document.getElementById("q").value.trim();
  if (query) {
    window.location.href = "https://funsearchapp.netlify.app/?q=" + encodeURIComponent(query);
  }
});

fillLanguages();
let params = pageParams();
let query = (params.get("q") || "").trim();
document.getElementById("q").value = query;
if (query) {
  let page = Math.max(parseInt(params.get("page") || "1", 10) || 1, 1);
  renderResults(query, page);
} else {
  renderHome();
}
