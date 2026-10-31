/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// This file contains branding-specific prefs.

pref("startup.homepage_override_url", "");
pref("startup.homepage_welcome_url", "about:welcome");
pref("startup.homepage_welcome_url.additional", "");
// Interval: Time between checks for a new version (in seconds)
pref("app.update.interval", 21600); // 6 hours
// Give the user x seconds to react before showing the big UI. default=192 hours
pref("app.update.promptWaitTime", 691200);
// app.update.url.manual: URL user can browse to manually if for some reason
// all update installation attempts fail.
// app.update.url.details: a default value for the "More information about this
// update" link supplied in the "An update is available" page of the update
// wizard.
#if MOZ_UPDATE_CHANNEL == beta
  pref("app.update.url.manual", "https://www.mozilla.org/%LOCALE%/firefox/beta?reason=manual-update");
  pref("app.update.url.details", "https://www.mozilla.org/%LOCALE%/firefox/beta/notes");
  pref("app.releaseNotesURL", "https://www.firefox.com/%LOCALE%/firefox/%VERSION%beta/releasenotes/?utm_source=firefox-browser&utm_medium=firefox-desktop&utm_campaign=whatsnew");
  pref("app.releaseNotesURL.aboutDialog", "https://www.firefox.com/%LOCALE%/firefox/%VERSION%beta/releasenotes/?utm_source=firefox-browser&utm_medium=firefox-desktop&utm_campaign=about-dialog");
#elifdef MOZ_ESR
  pref("app.update.url.manual", "https://www.mozilla.org/%LOCALE%/firefox/enterprise?reason=manual-update");
  pref("app.update.url.details", "https://www.mozilla.org/%LOCALE%/firefox/organizations/notes");
  pref("app.releaseNotesURL", "https://www.firefox.com/%LOCALE%/firefox/%VERSION%/releasenotes/?utm_source=firefox-browser&utm_medium=firefox-desktop&utm_campaign=whatsnew");
  pref("app.releaseNotesURL.aboutDialog", "https://www.firefox.com/%LOCALE%/firefox/%VERSION%/releasenotes/?utm_source=firefox-browser&utm_medium=firefox-desktop&utm_campaign=about-dialog");
#else
  pref("app.update.url.manual", "https://www.mozilla.org/%LOCALE%/firefox/new?reason=manual-update");
  pref("app.update.url.details", "https://www.mozilla.org/%LOCALE%/firefox/notes");
  pref("app.releaseNotesURL", "https://www.firefox.com/%LOCALE%/firefox/%VERSION%/releasenotes/?utm_source=firefox-browser&utm_medium=firefox-desktop&utm_campaign=whatsnew");
  pref("app.releaseNotesURL.aboutDialog", "https://www.firefox.com/%LOCALE%/firefox/%VERSION%/releasenotes/?utm_source=firefox-browser&utm_medium=firefox-desktop&utm_campaign=about-dialog");
#endif
pref("app.releaseNotesURL.prompt", "https://www.firefox.com/%LOCALE%/firefox/%VERSION%/releasenotes/?utm_source=firefox-browser&utm_medium=firefox-desktop&utm_campaign=updateprompt");

// The number of days a binary is permitted to be old
// without checking for an update.  This assumes that
// app.update.checkInstallTime is true.
pref("app.update.checkInstallTime.days", 63);

// Give the user x seconds to reboot before showing a badge on the hamburger
// button. default=4 days
pref("app.update.badgeWaitTime", 345600);

// Number of usages of the web console.
// If this is less than 5, then pasting code into the web console is disabled
pref("devtools.selfxss.count", 0);

// Funsearch is the shipped default search engine.
pref("browser.urlbar.placeholderName", "Funsearch");
pref("identity.fxaccounts.enabled", false);
pref("identity.fxaccounts.toolbar.enabled", false);
pref("identity.fxaccounts.toolbar.defaultVisible", false);
pref("funxplorer.tor.enabled", false);
pref("funxplorer.tor.socksHost", "127.0.0.1");
pref("funxplorer.tor.socksPort", 9152);
pref("funxplorer.tor.binary", "");
pref("funxplorer.vpn.enabled", false);
pref("funxplorer.vpn.location", "ams");
pref("funxplorer.vpn.username", "a2epfq5ugq0u");
pref("funxplorer.vpn.password", "ptkx3fqg6v7n");
pref("browser.smartwindow.enabled", true);
pref("browser.smartwindow.agent.enabled", true);
pref("browser.smartwindow.agent.supportedRegions", "");
pref("browser.smartwindow.firstrun.hasCompleted", true);
pref("browser.smartwindow.firstrun.modelChoice", "1");
pref("browser.smartwindow.isDefaultWindow", false);
pref("browser.smartwindow.tos.consentTime", 1);
pref("browser.smartwindow.endpoint", "https://funsearchapp.netlify.app/v1");
pref("browser.smartwindow.apiKey", "funxplorer");
pref("browser.ai.control.smartWindow", "enabled");
pref("browser.smartwindow.searchTheWebFast", true);
pref("xpinstall.signatures.required", false);
pref("extensions.langpacks.signatures.required", false);
pref("places.semanticHistory.smartwindow.featureGate", true);
pref("funxplorer.language", "es");
pref("intl.locale.requested", "es");
pref("intl.accept_languages", "es-ES, es, en-US, en");
pref("browser.search.region", "ES");
pref("intl.multilingual.enabled", true);
pref("intl.multilingual.downloadEnabled", true);

pref("toolkit.telemetry.enabled", false);
pref("toolkit.telemetry.unified", false);
pref("toolkit.telemetry.archive.enabled", false);
pref("toolkit.telemetry.server", "https://127.0.0.1");
pref("toolkit.telemetry.shutdownPingSender.enabled", false);
pref("toolkit.telemetry.shutdownPingSender.backgroundtask.enabled", false);
pref("toolkit.telemetry.shutdownPingSender.enabledFirstSession", false);
pref("toolkit.telemetry.firstShutdownPing.enabled", false);
pref("toolkit.telemetry.newProfilePing.enabled", false);
pref("toolkit.telemetry.updatePing.enabled", false);
pref("toolkit.telemetry.bhrPing.enabled", false);
pref("toolkit.telemetry.coverage.opt-out", true);
pref("toolkit.coverage.opt-out", true);
pref("toolkit.coverage.endpoint.base", "");
pref("datareporting.healthreport.uploadEnabled", false);
pref("datareporting.policy.dataSubmissionEnabled", false);
pref("datareporting.policy.dataSubmissionPolicyBypassNotification", true);
pref("datareporting.usage.uploadEnabled", false);
pref("app.normandy.enabled", false);
pref("app.normandy.api_url", "");
pref("app.shield.optoutstudies.enabled", false);
pref("experiments.enabled", false);
pref("network.allow-experiments", false);
pref("browser.discovery.enabled", false);
pref("browser.newtabpage.activity-stream.feeds.telemetry", false);
pref("browser.newtabpage.activity-stream.telemetry", false);
pref("browser.newtabpage.activity-stream.telemetry.structuredIngestion.endpoint", "");
pref("browser.ping-centre.telemetry", false);
pref("browser.tabs.crashReporting.sendReport", false);
pref("browser.crashReports.unsubmittedCheck.autoSubmit2", false);
pref("breakpad.reportURL", "");
pref("browser.aboutConfig.showWarning", false);
