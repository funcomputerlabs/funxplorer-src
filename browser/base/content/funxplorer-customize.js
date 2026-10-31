function prefType(el) {
  return el.getAttribute("data-type");
}

function readPref(el) {
  let name = el.getAttribute("data-pref");
  let type = prefType(el);
  try {
    if (type === "bool") {
      return Services.prefs.getBoolPref(name);
    }
    if (type === "int") {
      return Services.prefs.getIntPref(name);
    }
    return Services.prefs.getStringPref(name);
  } catch {
    return null;
  }
}

function writePref(el) {
  let name = el.getAttribute("data-pref");
  let type = prefType(el);
  if (el.classList.contains("skip") || el.hasAttribute("data-skip")) {
    return;
  }
  if (el.type === "checkbox") {
    if (el.hasAttribute("data-map-true")) {
      Services.prefs.setIntPref(
        name,
        el.checked
          ? Number(el.getAttribute("data-map-true"))
          : Number(el.getAttribute("data-map-false"))
      );
      return;
    }
    if (el.hasAttribute("data-bool-int")) {
      Services.prefs.setIntPref(name, el.checked ? 1 : 0);
      return;
    }
    Services.prefs.setBoolPref(name, el.checked);
    return;
  }
  if (type === "int") {
    Services.prefs.setIntPref(name, Number(el.value));
    return;
  }
  if (type === "bool") {
    Services.prefs.setBoolPref(name, el.value === "true");
    return;
  }
  Services.prefs.setStringPref(name, el.value);
}

function fill(el) {
  let value = readPref(el);
  if (value == null) {
    return;
  }
  if (el.type === "checkbox") {
    if (el.hasAttribute("data-map-true")) {
      el.checked = Number(value) === Number(el.getAttribute("data-map-true"));
      return;
    }
    if (el.hasAttribute("data-bool-int")) {
      el.checked = Number(value) !== 0;
      return;
    }
    el.checked = !!value;
    return;
  }
  el.value = value;
}

function markSaved() {
  let status = document.getElementById("status");
  status.hidden = false;
  clearTimeout(markSaved._t);
  markSaved._t = setTimeout(() => {
    status.hidden = true;
  }, 1200);
}

document.querySelectorAll("[data-pref]").forEach(el => {
  if (el.hasAttribute("data-skip")) {
    return;
  }
  fill(el);
  el.addEventListener("change", () => {
    writePref(el);
    markSaved();
  });
});

let zoomInput = document.getElementById("default-zoom");
if (zoomInput) {
  try {
    zoomInput.value = Math.round(
      Services.prefs.getIntPref("browser.zoom.fullZoom") || 100
    );
  } catch {
    zoomInput.value = 100;
  }
  zoomInput.addEventListener("change", () => {
    let n = Number(zoomInput.value) || 100;
    try {
      Services.prefs.setIntPref("browser.zoom.fullZoom", n);
    } catch {}
    markSaved();
  });
}
