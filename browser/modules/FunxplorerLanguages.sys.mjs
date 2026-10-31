const PREF = "funxplorer.language";

export const FUNXPLORER_LANGUAGES = [
  { id: "es", name: "Español", accept: "es-ES,es,en-US,en" },
  { id: "en", name: "English", accept: "en-US,en" },
  { id: "es-MX", name: "Español (México)", accept: "es-MX,es,en" },
  { id: "ca", name: "Català", accept: "ca,es,en" },
  { id: "eu", name: "Euskara", accept: "eu,es,en" },
  { id: "gl", name: "Galego", accept: "gl,es,en" },
  { id: "fr", name: "Français", accept: "fr-FR,fr,en" },
  { id: "de", name: "Deutsch", accept: "de-DE,de,en" },
  { id: "it", name: "Italiano", accept: "it-IT,it,en" },
  { id: "pt", name: "Português", accept: "pt-PT,pt,en" },
  { id: "pt-BR", name: "Português (Brasil)", accept: "pt-BR,pt,en" },
  { id: "nl", name: "Nederlands", accept: "nl-NL,nl,en" },
  { id: "pl", name: "Polski", accept: "pl-PL,pl,en" },
  { id: "ru", name: "Русский", accept: "ru-RU,ru,en" },
  { id: "uk", name: "Українська", accept: "uk-UA,uk,en" },
  { id: "tr", name: "Türkçe", accept: "tr-TR,tr,en" },
  { id: "ar", name: "العربية", accept: "ar,en" },
  { id: "he", name: "עברית", accept: "he,en" },
  { id: "fa", name: "فارسی", accept: "fa,en" },
  { id: "ur", name: "اردو", accept: "ur,en" },
  { id: "hi", name: "हिन्दी", accept: "hi,en" },
  { id: "bn", name: "বাংলা", accept: "bn,en" },
  { id: "ta", name: "தமிழ்", accept: "ta,en" },
  { id: "ja", name: "日本語", accept: "ja-JP,ja,en" },
  { id: "ko", name: "한국어", accept: "ko-KR,ko,en" },
  { id: "zh-CN", name: "简体中文", accept: "zh-CN,zh,en" },
  { id: "zh-TW", name: "繁體中文", accept: "zh-TW,zh,en" },
  { id: "vi", name: "Tiếng Việt", accept: "vi,en" },
  { id: "th", name: "ไทย", accept: "th,en" },
  { id: "id", name: "Bahasa Indonesia", accept: "id,en" },
  { id: "ms", name: "Bahasa Melayu", accept: "ms,en" },
  { id: "sv", name: "Svenska", accept: "sv-SE,sv,en" },
  { id: "no", name: "Norsk", accept: "nb-NO,nb,en" },
  { id: "da", name: "Dansk", accept: "da-DK,da,en" },
  { id: "fi", name: "Suomi", accept: "fi-FI,fi,en" },
  { id: "cs", name: "Čeština", accept: "cs,en" },
  { id: "sk", name: "Slovenčina", accept: "sk,en" },
  { id: "hu", name: "Magyar", accept: "hu,en" },
  { id: "ro", name: "Română", accept: "ro,en" },
  { id: "el", name: "Ελληνικά", accept: "el,en" },
  { id: "bg", name: "Български", accept: "bg,en" },
  { id: "hr", name: "Hrvatski", accept: "hr,en" },
  { id: "sr", name: "Српски", accept: "sr,en" },
  { id: "sl", name: "Slovenščina", accept: "sl,en" },
  { id: "lt", name: "Lietuvių", accept: "lt,en" },
  { id: "lv", name: "Latviešu", accept: "lv,en" },
  { id: "et", name: "Eesti", accept: "et,en" },
  { id: "ga", name: "Gaeilge", accept: "ga,en" },
  { id: "sw", name: "Kiswahili", accept: "sw,en" },
  { id: "af", name: "Afrikaans", accept: "af,en" },
];

function disableTelemetry() {
  const bools = [
    ["toolkit.telemetry.enabled", false],
    ["toolkit.telemetry.unified", false],
    ["toolkit.telemetry.archive.enabled", false],
    ["toolkit.telemetry.shutdownPingSender.enabled", false],
    ["toolkit.telemetry.firstShutdownPing.enabled", false],
    ["toolkit.telemetry.newProfilePing.enabled", false],
    ["toolkit.telemetry.updatePing.enabled", false],
    ["toolkit.telemetry.bhrPing.enabled", false],
    ["datareporting.healthreport.uploadEnabled", false],
    ["datareporting.policy.dataSubmissionEnabled", false],
    ["app.normandy.enabled", false],
    ["app.shield.optoutstudies.enabled", false],
    ["browser.discovery.enabled", false],
    ["browser.newtabpage.activity-stream.feeds.telemetry", false],
    ["browser.newtabpage.activity-stream.telemetry", false],
    ["browser.ping-centre.telemetry", false],
    ["browser.tabs.crashReporting.sendReport", false],
    ["browser.crashReports.unsubmittedCheck.autoSubmit2", false],
  ];
  for (let [name, value] of bools) {
    try {
      Services.prefs.setBoolPref(name, value);
    } catch {}
  }
  try {
    Services.prefs.setStringPref("toolkit.telemetry.server", "https://127.0.0.1");
    Services.prefs.setStringPref("app.normandy.api_url", "");
  } catch {}
}

export const FunxplorerLanguages = {
  PREF,

  ensureDefaults() {
    disableTelemetry();
    if (!Services.prefs.prefHasUserValue(PREF)) {
      this.apply("es");
    }
  },

  list() {
    return FUNXPLORER_LANGUAGES;
  },

  current() {
    let id = Services.prefs.getStringPref(PREF, "");
    if (!id) {
      id = "es";
    }
    return (
      FUNXPLORER_LANGUAGES.find(item => item.id.toLowerCase() === id.toLowerCase()) ||
      FUNXPLORER_LANGUAGES.find(item =>
        id.toLowerCase().startsWith(item.id.toLowerCase())
      ) ||
      FUNXPLORER_LANGUAGES[0]
    );
  },

  apply(id) {
    let lang =
      FUNXPLORER_LANGUAGES.find(item => item.id === id) || FUNXPLORER_LANGUAGES[0];
    Services.prefs.setStringPref(PREF, lang.id);
    Services.prefs.setStringPref("intl.locale.requested", lang.id);
    Services.prefs.setStringPref("intl.accept_languages", lang.accept);
    try {
      Services.locale.requestedLocales = [lang.id];
    } catch {}
    return lang;
  },
};
