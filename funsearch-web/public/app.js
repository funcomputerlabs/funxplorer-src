const PAGE_SIZE = 10;
const LANG_KEY = "funsearch-lang";

function pageParams() {
  return new URLSearchParams(window.location.search);
}

function currentLang() {
  const params = pageParams();
  return resolveFunsearchLang(
    params.get("hl") || localStorage.getItem(LANG_KEY) || "es"
  );
}

function ui() {
  return funsearchUi(currentLang().id);
}

function searchUrl(query, page) {
  const params = new URLSearchParams();
  if (query) {
    params.set("q", query);
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  params.set("hl", currentLang().id);
  return "/?" + params.toString();
}

function applyChrome() {
  const lang = currentLang();
  const text = ui();
  document.documentElement.lang = lang.id;
  document.documentElement.dir = lang.dir || "ltr";
  const select = document.getElementById("lang-select");
  if (!select.childElementCount) {
    for (const item of FUNSEARCH_LANGS) {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.name;
      select.appendChild(option);
    }
  }
  select.value = lang.id;
  select.setAttribute("aria-label", text.language);
  document.getElementById("q").placeholder = text.placeholder;
  document.getElementById("q-header").placeholder = text.placeholder;
  for (const button of document.querySelectorAll("[data-i18n='search']")) {
    button.textContent = text.search;
  }
  document.querySelector("footer").textContent = text.footer;
}

function bindSearchForm(form) {
  form.addEventListener("submit", event => {
    event.preventDefault();
    const query = form.querySelector('input[type="search"]').value.trim();
    if (query) {
      window.location.href = searchUrl(query, 1);
    }
  });
}

function renderHome() {
  document.body.classList.add("home-mode");
  document.getElementById("home").classList.remove("hidden");
  document.getElementById("header-search").classList.add("hidden");
  document.getElementById("q").focus();
}

function renderStatus(text) {
  const status = document.getElementById("status");
  status.hidden = false;
  status.classList.remove("hidden");
  status.textContent = text;
}

function renderOverview(overview) {
  const box = document.getElementById("overview");
  box.replaceChildren();
  if (!overview?.text) {
    box.hidden = true;
    box.classList.add("hidden");
    return;
  }
  const title = document.createElement("h2");
  title.textContent = ui().overview;
  const body = document.createElement("div");
  body.className = "overview-text";
  for (const block of overview.text.split(/\n+/)) {
    const line = block.trim();
    if (!line) {
      continue;
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      let list = body.lastElementChild;
      if (!list || list.tagName !== "UL") {
        list = document.createElement("ul");
        body.appendChild(list);
      }
      const item = document.createElement("li");
      item.textContent = line.replace(/^[-*]\s+/, "");
      list.appendChild(item);
      continue;
    }
    const p = document.createElement("p");
    p.textContent = line;
    body.appendChild(p);
  }
  box.append(title, body);
  if (overview.sources?.length) {
    const sources = document.createElement("ol");
    sources.className = "overview-sources";
    for (const source of overview.sources) {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = source.url;
      link.textContent = source.title;
      item.appendChild(link);
      sources.appendChild(item);
    }
    box.appendChild(sources);
  }
  box.hidden = false;
  box.classList.remove("hidden");
}

async function renderResults(query, page) {
  const text = ui();
  document.body.classList.remove("home-mode");
  document.getElementById("header-search").classList.remove("hidden");
  document.getElementById("q-header").value = query;
  const resultsEl = document.getElementById("results");
  const pager = document.getElementById("pager");
  renderStatus(text.searching);
  resultsEl.replaceChildren();
  pager.replaceChildren();
  renderOverview(null);

  try {
    const response = await fetch(
      `/api/search?q=${encodeURIComponent(query)}&page=${page}&lang=${encodeURIComponent(currentLang().id)}`
    );
    if (!response.ok) {
      throw new Error("search-failed");
    }
    const data = await response.json();
    const results = data.results || [];
    renderOverview(data.overview);
    if (!results.length) {
      renderStatus(text.none(query));
      return;
    }
    const indexes = (data.indexes || []).join(", ");
    renderStatus(
      indexes ? `${text.results(results.length)} · ${indexes}` : text.results(results.length)
    );
    for (const result of results) {
      const article = document.createElement("article");
      article.className = "result";
      const heading = document.createElement("h2");
      const link = document.createElement("a");
      link.href = result.url;
      link.textContent = result.title;
      heading.appendChild(link);
      const urlEl = document.createElement("div");
      urlEl.className = "url";
      urlEl.textContent = result.url;
      article.append(heading, urlEl);
      if (result.snippet) {
        const snippet = document.createElement("p");
        snippet.className = "snippet";
        snippet.textContent = result.snippet;
        article.appendChild(snippet);
      }
      resultsEl.appendChild(article);
    }
    resultsEl.classList.remove("hidden");
    if (page > 1) {
      const prev = document.createElement("a");
      prev.href = searchUrl(query, page - 1);
      prev.textContent = text.prev;
      pager.appendChild(prev);
    }
    if (results.length >= PAGE_SIZE) {
      const next = document.createElement("a");
      next.href = searchUrl(query, page + 1);
      next.textContent = text.next;
      pager.appendChild(next);
    }
    pager.classList.toggle("hidden", !pager.childElementCount);
  } catch {
    renderStatus(text.error);
  }
}

document.getElementById("lang-select").addEventListener("change", event => {
  const lang = resolveFunsearchLang(event.target.value);
  localStorage.setItem(LANG_KEY, lang.id);
  const query = (pageParams().get("q") || "").trim();
  const page = Math.max(parseInt(pageParams().get("page") || "1", 10) || 1, 1);
  window.location.href = searchUrl(query, query ? page : 1);
});

bindSearchForm(document.getElementById("home-search"));
bindSearchForm(document.getElementById("header-search"));

const params = pageParams();
const query = (params.get("q") || "").trim();
if (params.get("hl")) {
  localStorage.setItem(LANG_KEY, currentLang().id);
}
applyChrome();
document.getElementById("q").value = query;
if (query) {
  document.title = `${query} · Funsearch`;
  const page = Math.max(parseInt(params.get("page") || "1", 10) || 1, 1);
  renderResults(query, page);
} else {
  renderHome();
}
