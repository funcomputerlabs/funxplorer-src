/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { NetUtil } from "resource://gre/modules/NetUtil.sys.mjs";

const TOPIC = "funxplorer-vpn-changed";
const ENABLED_PREF = "funxplorer.vpn.enabled";
const LOCATION_PREF = "funxplorer.vpn.location";
const USER_PREF = "funxplorer.vpn.username";
const PASS_PREF = "funxplorer.vpn.password";

const PROXY_PREFS = [
  "network.proxy.type",
  "network.proxy.http",
  "network.proxy.http_port",
  "network.proxy.ssl",
  "network.proxy.ssl_port",
  "network.proxy.socks",
  "network.proxy.socks_port",
  "network.proxy.socks_version",
  "network.proxy.socks_remote_dns",
  "network.proxy.share_proxy_settings",
  "network.proxy.autoconfig_url",
  "network.proxy.no_proxies_on",
  "network.dns.blockDotOnion",
  "network.trr.mode",
  "network.http.http3.enabled",
  "media.peerconnection.ice.proxy_only",
];

const FREE_LOCATIONS = {
  ams: {
    city: "Amsterdam",
    hosts: [
      { hostname: "free-amsterdam-https-1.cloudburstcdn.com", port: 443 },
      { hostname: "free-amsterdam-https-2.cloudflingcdn.com", port: 443 },
      { hostname: "free-amsterdam-https-3.cloudflaracdn.com", port: 443 },
      { hostname: "free-amsterdam-https-4.cloudflaracdn.com", port: 443 },
      { hostname: "free-amsterdam-https-5.cloudflingcdn.com", port: 443 },
      { hostname: "free-amsterdam-https-6.cloudflingcdn.com", port: 443 },
    ],
  },
  sgp: {
    city: "Singapore",
    hosts: [
      { hostname: "free-singapore-https-1.cloudburstcdn.com", port: 443 },
      { hostname: "free-singapore-https-2.cloudtimecdn.com", port: 443 },
      { hostname: "free-singapore-https-3.weathercloudapp.com", port: 443 },
      { hostname: "free-singapore-https-4.cloudflingcdn.com", port: 443 },
    ],
  },
  lax: {
    city: "Los Angeles",
    hosts: [
      { hostname: "free-los-angeles-https-1.cloudburstcdn.com", port: 443 },
      { hostname: "free-los-angeles-https-2.cloudtimecdn.com", port: 443 },
      { hostname: "free-los-angeles-https-3.cloudflaracdn.com", port: 443 },
      { hostname: "free-los-angeles-https-4.cloudflaracdn.com", port: 443 },
      { hostname: "free-los-angeles-https-5.cloudflingcdn.com", port: 443 },
      { hostname: "free-los-angeles-https-6.cloudflingcdn.com", port: 443 },
      { hostname: "usa-west-free-https-1.weathercloudapp.com", port: 443 },
    ],
  },
};

const DIRECT_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "1vpn.org",
  "1vpn.co",
  "onevpn.com",
  "cloudlogcdn.com",
  "cloudflaircdn.com",
  "cloudburstcdn.com",
  "cloudflingcdn.com",
  "cloudflaracdn.com",
  "cloudtimecdn.com",
  "weathercloudapp.com",
]);

let gSavedProxy = null;
let gQuitObserver = false;
let gFilter = null;
let gChannelFilter = null;
let gProxyHosts = [];
let gBridge = null;

function proxyService() {
  return Cc["@mozilla.org/network/protocol-proxy-service;1"].getService(
    Ci.nsIProtocolProxyService
  );
}

function username() {
  return Services.prefs.getStringPref(USER_PREF, "a2epfq5ugq0u");
}

function password() {
  return Services.prefs.getStringPref(PASS_PREF, "ptkx3fqg6v7n");
}

function locationId() {
  let id = Services.prefs.getStringPref(LOCATION_PREF, "ams");
  return FREE_LOCATIONS[id] ? id : "ams";
}

function authHeader() {
  return "Basic " + btoa(username() + ":" + password());
}

function hostAllowedDirect(host) {
  if (!host) {
    return true;
  }
  let name = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (DIRECT_HOSTS.has(name) || name.endsWith(".local")) {
    return true;
  }
  for (let listed of DIRECT_HOSTS) {
    if (name.endsWith("." + listed)) {
      return true;
    }
  }
  return gProxyHosts.some(h => h.hostname === name);
}

function canConnect(host, port, timeoutSec = 3) {
  return new Promise(resolve => {
    let transport;
    let stream;
    let finished = false;
    let finish = ok => {
      if (finished) {
        return;
      }
      finished = true;
      try {
        stream?.close();
      } catch {}
      try {
        transport?.close(Cr.NS_OK);
      } catch {}
      resolve(ok);
    };
    try {
      transport = Services.socketTransportService.createTransport(
        [],
        host,
        port,
        null,
        null
      );
      transport.setTimeout(Ci.nsISocketTransport.TIMEOUT_CONNECT, timeoutSec);
      stream = transport.openOutputStream(0, 0, 0);
      stream.asyncWait(
        {
          onOutputStreamReady() {
            finish(true);
          },
        },
        0,
        0,
        Services.tm.currentThread
      );
    } catch {
      finish(false);
      return;
    }
    setTimeout(() => finish(false), timeoutSec * 1000 + 250);
  });
}

function readPref(name) {
  if (!Services.prefs.prefHasUserValue(name)) {
    return null;
  }
  let type = Services.prefs.getPrefType(name);
  return {
    type,
    value:
      type == Services.prefs.PREF_INT
        ? Services.prefs.getIntPref(name)
        : type == Services.prefs.PREF_BOOL
          ? Services.prefs.getBoolPref(name)
          : Services.prefs.getStringPref(name),
  };
}

export function captureBrowserProxy() {
  if (gSavedProxy) {
    return;
  }
  gSavedProxy = {};
  for (let name of PROXY_PREFS) {
    gSavedProxy[name] = readPref(name);
  }
}

export function restoreBrowserProxy() {
  unregisterProxyFilter();
  if (!gSavedProxy) {
    for (let name of PROXY_PREFS) {
      Services.prefs.clearUserPref(name);
    }
    return;
  }
  for (let [name, saved] of Object.entries(gSavedProxy)) {
    if (!saved) {
      Services.prefs.clearUserPref(name);
      continue;
    }
    if (saved.type == Services.prefs.PREF_INT) {
      Services.prefs.setIntPref(name, saved.value);
    } else if (saved.type == Services.prefs.PREF_BOOL) {
      Services.prefs.setBoolPref(name, saved.value);
    } else {
      Services.prefs.setStringPref(name, saved.value);
    }
  }
  gSavedProxy = null;
}

function applyManualLocalProxy(port) {
  unregisterProxyFilter();
  Services.prefs.setIntPref("network.proxy.type", 1);
  Services.prefs.clearUserPref("network.proxy.autoconfig_url");
  Services.prefs.setCharPref("network.proxy.http", "127.0.0.1");
  Services.prefs.setIntPref("network.proxy.http_port", port);
  Services.prefs.setCharPref("network.proxy.ssl", "127.0.0.1");
  Services.prefs.setIntPref("network.proxy.ssl_port", port);
  Services.prefs.setBoolPref("network.proxy.share_proxy_settings", true);
  Services.prefs.setCharPref("network.proxy.socks", "");
  Services.prefs.setIntPref("network.proxy.socks_port", 0);
  Services.prefs.setCharPref(
    "network.proxy.no_proxies_on",
    "localhost, 127.0.0.1, ::1"
  );
  Services.prefs.setIntPref("network.trr.mode", 5);
  Services.prefs.setBoolPref("network.http.http3.enabled", false);
  Services.prefs.setBoolPref("media.peerconnection.ice.proxy_only", true);
}

async function verifyProxyWorks() {
  let controller = new AbortController();
  let timer = setTimeout(() => controller.abort(), 12000);
  try {
    let response = await fetch("https://api.ipify.org", {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }
    return (await response.text()).trim();
  } finally {
    clearTimeout(timer);
  }
}

export function applySocksProxy(host, port) {
  unregisterProxyFilter();
  stopVpnHttpBridge();
  Services.prefs.setIntPref("network.proxy.type", 1);
  Services.prefs.clearUserPref("network.proxy.autoconfig_url");
  Services.prefs.setCharPref("network.proxy.socks", host);
  Services.prefs.setIntPref("network.proxy.socks_port", port);
  Services.prefs.setIntPref("network.proxy.socks_version", 5);
  Services.prefs.setBoolPref("network.proxy.socks_remote_dns", true);
  Services.prefs.setBoolPref("network.proxy.share_proxy_settings", false);
  Services.prefs.setCharPref("network.proxy.http", "");
  Services.prefs.setCharPref("network.proxy.ssl", "");
  Services.prefs.setIntPref("network.proxy.http_port", 0);
  Services.prefs.setIntPref("network.proxy.ssl_port", 0);
  Services.prefs.setBoolPref("network.dns.blockDotOnion", false);
  Services.prefs.setIntPref("network.trr.mode", 5);
  Services.prefs.setBoolPref("network.http.http3.enabled", false);
  Services.prefs.setBoolPref("media.peerconnection.ice.proxy_only", true);
}

function buildProxyInfo(hosts) {
  let pps = proxyService();
  let header = authHeader();
  let next = null;
  for (let i = hosts.length - 1; i >= 0; i--) {
    next = pps.newProxyInfo(
      "https",
      hosts[i].hostname,
      hosts[i].port,
      header,
      "funvpn",
      0,
      8,
      next
    );
  }
  return next;
}

function applyPacScript(hosts) {
  let list = hosts
    .map(host => "HTTPS " + host.hostname + ":" + host.port)
    .join("; ");
  let pac =
    "function FindProxyForURL(url, host) {\n" +
    '  if (isPlainHostName(host) || host == "127.0.0.1" || host == "localhost" || host == "::1") { return "DIRECT"; }\n' +
    '  if (dnsDomainIs(host, "1vpn.org") || dnsDomainIs(host, "cloudflaircdn.com") || dnsDomainIs(host, "cloudburstcdn.com") || dnsDomainIs(host, "cloudflingcdn.com") || dnsDomainIs(host, "cloudflaracdn.com") || dnsDomainIs(host, "cloudtimecdn.com") || dnsDomainIs(host, "weathercloudapp.com")) { return "DIRECT"; }\n' +
    '  return "' +
    list +
    '";\n' +
    "}\n";
  Services.prefs.setCharPref(
    "network.proxy.autoconfig_url",
    "data:application/x-ns-proxy-autoconfig," + encodeURIComponent(pac)
  );
  Services.prefs.setIntPref("network.proxy.type", 2);
}

async function storeProxyLogins(hosts) {
  let user = username();
  let pass = password();
  for (let host of hosts) {
    for (let origin of [
      "https://" + host.hostname + ":" + host.port,
      "moz-proxy://" + host.hostname + ":" + host.port,
    ]) {
      let login = Cc["@mozilla.org/login-manager/loginInfo;1"].createInstance(
        Ci.nsILoginInfo
      );
      login.init(origin, null, origin, user, pass, "", "");
      try {
        let found = await Services.logins.searchLoginsAsync({
          origin,
          httpRealm: origin,
        });
        if (found.length) {
          Services.logins.modifyLogin(found[0], login);
        } else {
          await Services.logins.addLoginAsync(login);
        }
      } catch {}
    }
  }
}

function registerProxyFilter(hosts) {
  unregisterProxyFilter();
  gProxyHosts = hosts;
  let chain = buildProxyInfo(hosts);
  gFilter = {
    QueryInterface: ChromeUtils.generateQI(["nsIProtocolProxyFilter"]),
    applyFilter(subject, _defaultProxy, callback) {
      let host = "";
      try {
        if (subject instanceof Ci.nsIURI) {
          host = subject.host;
        } else if (subject instanceof Ci.nsIChannel) {
          host = subject.URI.host;
        }
      } catch {}
      if (hostAllowedDirect(host)) {
        callback.onProxyFilterResult(null);
        return;
      }
      callback.onProxyFilterResult(chain);
    },
  };
  gChannelFilter = {
    QueryInterface: ChromeUtils.generateQI(["nsIProtocolProxyChannelFilter"]),
    applyFilter(channel, defaultProxy, callback) {
      gFilter.applyFilter(channel.URI, defaultProxy, callback);
    },
  };
  proxyService().registerFilter(gFilter, 0);
  proxyService().registerChannelFilter(gChannelFilter, 0);
  Services.prefs.setIntPref("network.proxy.type", 0);
  Services.prefs.setIntPref("network.trr.mode", 5);
  Services.prefs.setBoolPref("network.http.http3.enabled", false);
  Services.prefs.setBoolPref("media.peerconnection.ice.proxy_only", true);
}

function unregisterProxyFilter() {
  if (gFilter) {
    try {
      proxyService().unregisterFilter(gFilter);
    } catch {}
  }
  if (gChannelFilter) {
    try {
      proxyService().unregisterChannelFilter(gChannelFilter);
    } catch {}
  }
  gFilter = null;
  gChannelFilter = null;
  gProxyHosts = [];
}

function waitStream(stream, method, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    let done = false;
    let finish = err => {
      if (done) {
        return;
      }
      done = true;
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    };
    stream.asyncWait(
      {
        [method]() {
          finish();
        },
      },
      0,
      0,
      Services.tm.currentThread
    );
    setTimeout(() => finish(new Error("timeout")), timeoutMs);
  });
}

function readUntilBlankLine(input, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    let data = "";
    let reader = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(
      Ci.nsIScriptableInputStream
    );
    reader.init(input);
    let done = false;
    let timer = setTimeout(() => {
      if (!done) {
        done = true;
        reject(new Error("timeout"));
      }
    }, timeoutMs);
    let wait = () => {
      input.asyncWait(
        {
          onInputStreamReady(stream) {
            if (done) {
              return;
            }
            try {
              let avail = stream.available();
              if (!avail) {
                done = true;
                clearTimeout(timer);
                reject(new Error("closed"));
                return;
              }
              data += reader.read(avail);
              if (data.includes("\r\n\r\n")) {
                done = true;
                clearTimeout(timer);
                resolve(data);
                return;
              }
              wait();
            } catch (e) {
              done = true;
              clearTimeout(timer);
              reject(e);
            }
          },
        },
        0,
        0,
        Services.tm.currentThread
      );
    };
    wait();
  });
}

function writeAscii(output, text) {
  output.write(text, text.length);
}

function prependBytes(prefix, input) {
  if (!prefix) {
    return input;
  }
  let extra = Cc["@mozilla.org/io/string-input-stream;1"].createInstance(
    Ci.nsIStringInputStream
  );
  extra.setByteStringData(prefix);
  let mux = Cc["@mozilla.org/io/multiplex-input-stream;1"].createInstance(
    Ci.nsIMultiplexInputStream
  );
  mux.appendStream(extra);
  mux.appendStream(input);
  return mux;
}

function splitHttpHead(data) {
  let idx = data.indexOf("\r\n\r\n");
  return { head: data.slice(0, idx), rest: data.slice(idx + 4) };
}

async function handleBridgeClient(client, vpn) {
  let clientIn = client.openInputStream(0, 0, 0);
  let clientOut = client.openOutputStream(0, 0, 0);
  try {
    let rawHead = await readUntilBlankLine(clientIn);
    let { head, rest: clientRest } = splitHttpHead(rawHead);
    let match = head.match(/^CONNECT\s+([^:\s]+):(\d+)/i);
    if (!match) {
      writeAscii(clientOut, "HTTP/1.1 405 Method Not Allowed\r\n\r\n");
      return;
    }
    let proxyInfo = proxyService().newProxyInfo(
      "https",
      vpn.host,
      vpn.port,
      authHeader(),
      "funvpn-bridge",
      0,
      15,
      null
    );
    let upstream = Services.socketTransportService.createTransport(
      [],
      match[1],
      Number(match[2]),
      proxyInfo,
      null
    );
    upstream.setTimeout(Ci.nsISocketTransport.TIMEOUT_CONNECT, 20);
    let upOut = upstream.openOutputStream(0, 0, 0);
    let upIn = upstream.openInputStream(0, 0, 0);
    await waitStream(upOut, "onOutputStreamReady", 20000);
    writeAscii(clientOut, "HTTP/1.1 200 Connection established\r\n\r\n");
    NetUtil.asyncCopy(prependBytes(clientRest, clientIn), upOut);
    NetUtil.asyncCopy(upIn, clientOut);
  } catch {
    try {
      client.close(Cr.NS_ERROR_FAILURE);
    } catch {}
  }
}

export function startVpnHttpBridge(vpn) {
  stopVpnHttpBridge();
  let server = Cc["@mozilla.org/network/server-socket;1"].createInstance(
    Ci.nsIServerSocket
  );
  server.init(-1, true, -1);
  server.asyncListen({
    onSocketAccepted(_serv, transport) {
      handleBridgeClient(transport, vpn);
    },
    onStopListening() {},
  });
  gBridge = server;
  return server.port;
}

export function stopVpnHttpBridge() {
  if (!gBridge) {
    return;
  }
  try {
    gBridge.close();
  } catch {}
  gBridge = null;
}

function ensureQuitObserver() {
  if (gQuitObserver) {
    return;
  }
  gQuitObserver = true;
  Services.obs.addObserver(() => {
    FunxplorerVpn.disable({ quitting: true });
  }, "quit-application");
}

export const FunxplorerVpn = {
  TOPIC,

  get enabled() {
    return Services.prefs.getBoolPref(ENABLED_PREF, false);
  },

  async pickEndpoint() {
    let order = [locationId(), "ams", "sgp", "lax"];
    let seen = new Set();
    for (let id of order) {
      if (seen.has(id) || !FREE_LOCATIONS[id]) {
        continue;
      }
      seen.add(id);
      let hosts = [...FREE_LOCATIONS[id].hosts].sort(() => Math.random() - 0.5);
      for (let host of hosts) {
        if (await canConnect(host.hostname, host.port)) {
          return {
            ok: true,
            host: host.hostname,
            port: host.port,
            username: username(),
            password: password(),
            hosts,
            city: FREE_LOCATIONS[id].city,
          };
        }
      }
    }
    return {
      ok: false,
      error: "FUNVPN no pudo alcanzar un servidor de 1VPN.",
    };
  },

  async toggle() {
    return this.enabled ? this.disable() : this.enable();
  },

  async enable() {
    ensureQuitObserver();
    if (this.enabled) {
      return { ok: true };
    }
    let { FunxplorerTor } = ChromeUtils.importESModule(
      "resource:///modules/FunxplorerTor.sys.mjs"
    );
    if (FunxplorerTor.enabled) {
      FunxplorerTor.disable();
    }
    let endpoint = await this.pickEndpoint();
    if (!endpoint.ok) {
      return endpoint;
    }
    captureBrowserProxy();
    Services.prefs.setBoolPref("signon.autologin.proxy", true);
    await storeProxyLogins(endpoint.hosts);
    registerProxyFilter(endpoint.hosts);
    applyPacScript(endpoint.hosts);
    try {
      await fetch("https://cloudflaircdn.com/ping/");
    } catch {}
    Services.prefs.setBoolPref(ENABLED_PREF, true);
    Services.obs.notifyObservers(null, TOPIC, "on");
    return { ok: true, city: endpoint.city };
  },

  disable({ quitting = false } = {}) {
    stopVpnHttpBridge();
    if (!this.enabled && !gFilter) {
      return { ok: true };
    }
    restoreBrowserProxy();
    Services.prefs.setBoolPref(ENABLED_PREF, false);
    if (!quitting) {
      Services.obs.notifyObservers(null, TOPIC, "off");
    }
    return { ok: true };
  },
};
