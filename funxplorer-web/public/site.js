const KEY = "funxplorer-lang";

function currentId() {
  const params = new URLSearchParams(location.search);
  return params.get("hl") || localStorage.getItem(KEY) || "es";
}

function resolveId(code) {
  const raw = (code || "es").trim();
  const ids = LANGS.map(item => item[0]);
  if (ids.includes(raw)) {
    return raw;
  }
  const short = raw.split("-")[0];
  return ids.includes(short) ? short : "es";
}

const select = document.getElementById("lang-select");
const unique = [];
const seen = new Set();
for (const [id, name] of LANGS) {
  if (seen.has(id)) {
    continue;
  }
  seen.add(id);
  unique.push([id, name]);
  const option = document.createElement("option");
  option.value = id;
  option.textContent = name;
  select.appendChild(option);
}

const id = resolveId(currentId());
localStorage.setItem(KEY, id);
applyLang(id);

select.addEventListener("change", () => {
  localStorage.setItem(KEY, select.value);
  const url = new URL(location.href);
  url.searchParams.set("hl", select.value);
  history.replaceState(null, "", url);
  applyLang(select.value);
});
