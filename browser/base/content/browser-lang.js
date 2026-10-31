ChromeUtils.defineESModuleGetters(this, {
  FunxplorerLanguages: "resource:///modules/FunxplorerLanguages.sys.mjs",
});

var gFunxplorerLang = {
  _initialized: false,

  init() {
    if (this._initialized) {
      return;
    }
    this._initialized = true;
    FunxplorerLanguages.ensureDefaults();
    MozXULElement.insertFTLIfNeeded("browser/appmenu.ftl");
    let view = document.getElementById("PanelUI-funxplorer-languages");
    if (view) {
      view.addEventListener("ViewShowing", () => this.fill());
    }
  },

  fill() {
    let list = document.getElementById("appMenu-language-list");
    if (!list) {
      return;
    }
    list.replaceChildren();
    let current = FunxplorerLanguages.current().id;
    for (let lang of FunxplorerLanguages.list()) {
      let button = document.createXULElement("toolbarbutton");
      button.className = "subviewbutton";
      button.setAttribute("closemenu", "none");
      button.setAttribute("type", "radio");
      button.setAttribute("name", "funxplorer-language");
      button.setAttribute("label", lang.name);
      button.setAttribute("value", lang.id);
      if (lang.id === current) {
        button.setAttribute("checked", "true");
      }
      button.addEventListener("command", () => this.setLanguage(lang.id));
      list.appendChild(button);
    }
  },

  setLanguage(id) {
    let lang = FunxplorerLanguages.apply(id);
    this.reloadFunsearch(lang.id);
    let restart = Services.prompt.confirm(
      window,
      "Funxplorer",
      "El idioma de búsqueda es ahora " +
        lang.name +
        ". ¿Reiniciar Funxplorer para aplicarlo a menús y ajustes?"
    );
    if (restart) {
      Services.startup.quit(
        Ci.nsIAppStartup.eAttemptQuit | Ci.nsIAppStartup.eRestart
      );
    }
  },

  reloadFunsearch(id) {
    let principal = Services.scriptSecurityManager.getSystemPrincipal();
    for (let win of Services.wm.getEnumerator("navigator:browser")) {
      for (let tab of win.gBrowser.tabs) {
        let spec = tab.linkedBrowser.currentURI.spec;
        if (!/funsearchapp\.netlify\.app|about:funsearch/i.test(spec)) {
          continue;
        }
        try {
          let next = new URL(spec);
          next.searchParams.set("hl", id);
          tab.linkedBrowser.loadURI(Services.io.newURI(next.href), {
            triggeringPrincipal: principal,
          });
        } catch {}
      }
    }
  },
};
