/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { AppConstants } from "resource://gre/modules/AppConstants.sys.mjs";
import { FileUtils } from "resource://gre/modules/FileUtils.sys.mjs";
import {
  FunxplorerVpn,
  applySocksProxy,
  captureBrowserProxy,
  restoreBrowserProxy,
  startVpnHttpBridge,
  stopVpnHttpBridge,
} from "resource:///modules/FunxplorerVpn.sys.mjs";

const TOPIC = "funxplorer-tor-changed";
const SOCKS_HOST_PREF = "funxplorer.tor.socksHost";
const SOCKS_PORT_PREF = "funxplorer.tor.socksPort";
const ENABLED_PREF = "funxplorer.tor.enabled";
const BINARY_PREF = "funxplorer.tor.binary";
const TOR_BUNDLE_VERSION = "16.0";

let gProcess = null;
let gStartedProcess = false;
let gQuitObserver = false;

function socksHost() {
  return Services.prefs.getStringPref(SOCKS_HOST_PREF, "127.0.0.1");
}

function socksPort() {
  return Services.prefs.getIntPref(SOCKS_PORT_PREF, 9152);
}

function fileFromPath(path) {
  try {
    let file = new FileUtils.File(path);
    return file.exists() ? file : null;
  } catch {
    return null;
  }
}

function candidateBinaries() {
  let paths = [];
  let configured = Services.prefs.getStringPref(BINARY_PREF, "");
  if (configured) {
    paths.push(configured);
  }
  try {
    let appDir = Services.dirsvc.get("CurProcD", Ci.nsIFile).path;
    paths.push(
      PathUtils.join(appDir, "funtor", "tor", "tor.exe"),
      PathUtils.join(appDir, "funtor", "tor", "tor")
    );
  } catch {}
  paths.push(PathUtils.join(PathUtils.profileDir, "funtor", "tor", "tor.exe"));
  paths.push(PathUtils.join(PathUtils.profileDir, "funtor", "tor", "tor"));
  if (AppConstants.platform == "win") {
    let home = Services.dirsvc.get("Home", Ci.nsIFile).path;
    let localAppData = Services.env.get("LOCALAPPDATA");
    paths.push(
      home + "\\Desktop\\Tor Browser\\Browser\\TorBrowser\\Tor\\tor.exe",
      home +
        "\\OneDrive\\Desktop\\Tor Browser\\Browser\\TorBrowser\\Tor\\tor.exe"
    );
    if (localAppData) {
      paths.push(
        localAppData + "\\Tor Browser\\Browser\\TorBrowser\\Tor\\tor.exe"
      );
    }
    paths.push(
      "C:\\Program Files\\Tor Browser\\Browser\\TorBrowser\\Tor\\tor.exe",
      "C:\\Program Files (x86)\\Tor Browser\\Browser\\TorBrowser\\Tor\\tor.exe"
    );
  } else if (AppConstants.platform == "macosx") {
    paths.push(
      "/Applications/Tor Browser.app/Contents/MacOS/Tor/tor.real",
      "/usr/local/bin/tor",
      "/opt/homebrew/bin/tor"
    );
  } else {
    paths.push("/usr/bin/tor", "/usr/local/bin/tor");
  }
  return paths;
}

export function findTorBinary() {
  for (let path of candidateBinaries()) {
    let file = fileFromPath(path);
    if (file) {
      return file;
    }
  }
  return null;
}

function bundleUrl() {
  let platform =
    AppConstants.platform == "win"
      ? "windows-x86_64"
      : AppConstants.platform == "macosx"
        ? "macos-x86_64"
        : "linux-x86_64";
  return (
    "https://dist.torproject.org/torbrowser/" +
    TOR_BUNDLE_VERSION +
    "/tor-expert-bundle-" +
    platform +
    "-" +
    TOR_BUNDLE_VERSION +
    ".tar.gz"
  );
}

function tarBinary() {
  if (AppConstants.platform == "win") {
    return fileFromPath("C:\\Windows\\System32\\tar.exe");
  }
  return fileFromPath("/usr/bin/tar") || fileFromPath("/bin/tar");
}

async function findTorUnder(root) {
  let names;
  try {
    names = await IOUtils.getChildren(root);
  } catch {
    return null;
  }
  for (let path of names) {
    let base = PathUtils.filename(path).toLowerCase();
    if (base == "tor.exe" || base == "tor") {
      return fileFromPath(path);
    }
    try {
      if ((await IOUtils.stat(path)).type == "directory") {
        let found = await findTorUnder(path);
        if (found) {
          return found;
        }
      }
    } catch {}
  }
  return null;
}

async function downloadTor() {
  let dir = PathUtils.join(PathUtils.profileDir, "funtor");
  await IOUtils.makeDirectory(dir, { ignoreExisting: true });
  let existing = await findTorUnder(dir);
  if (existing) {
    return existing;
  }
  let tar = tarBinary();
  if (!tar) {
    return null;
  }
  let archive = PathUtils.join(dir, "tor-expert-bundle.tar.gz");
  let response = await fetch(bundleUrl());
  if (!response.ok) {
    throw new Error("Could not download Tor (" + response.status + ").");
  }
  await IOUtils.write(archive, new Uint8Array(await response.arrayBuffer()), {
    tmpPath: archive + ".tmp",
  });
  let process = Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess);
  process.init(tar);
  process.runw(true, ["-xf", archive, "-C", dir], 4);
  let binary = await findTorUnder(dir);
  if (binary) {
    Services.prefs.setStringPref(BINARY_PREF, binary.path);
  }
  return binary;
}

function canConnect(host, port, timeoutSec = 2) {
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

async function waitForSocks(host, port, timeoutMs) {
  let start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await canConnect(host, port)) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  return false;
}

async function startTor(port) {
  let binary = findTorBinary();
  if (!binary) {
    try {
      binary = await downloadTor();
    } catch (e) {
      return {
        ok: false,
        error: e.message || "Could not download Tor.",
      };
    }
  }
  if (!binary) {
    return {
      ok: false,
      error:
        "Tor was not found. Funxplorer could not download it automatically.",
    };
  }
  let dataDir = PathUtils.join(PathUtils.profileDir, "tor-funtor-data");
  try {
    let appDir = Services.dirsvc.get("CurProcD", Ci.nsIFile).path;
    if (!/[^\x00-\x7F]/.test(appDir)) {
      dataDir = PathUtils.join(appDir, "funtor-data");
    }
  } catch {}
  await IOUtils.makeDirectory(dataDir, { ignoreExisting: true });
  let torrc = PathUtils.join(dataDir, "torrc");
  let lines = [
    "SocksPort 127.0.0.1:" + port,
    "AvoidDiskWrites 1",
    "ControlPort 0",
    "CookieAuthentication 0",
  ];
  try {
    let dataDirBundle = PathUtils.join(binary.parent.parent.path, "data");
    let geoip = PathUtils.join(dataDirBundle, "geoip");
    let geoip6 = PathUtils.join(dataDirBundle, "geoip6");
    if (await IOUtils.exists(geoip)) {
      lines.push("GeoIPFile " + geoip.replaceAll("\\", "/"));
    }
    if (await IOUtils.exists(geoip6)) {
      lines.push("GeoIPv6File " + geoip6.replaceAll("\\", "/"));
    }
  } catch {}
  await IOUtils.writeUTF8(torrc, lines.join("\n") + "\n");
  let process = Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess);
  process.init(binary);
  try {
    process.startHidden = true;
  } catch {}
  let args = ["-f", torrc];
  process.runw(false, args, args.length);
  gProcess = process;
  gStartedProcess = true;
  await new Promise(resolve => setTimeout(resolve, 400));
  if (!process.isRunning) {
    return {
      ok: false,
      error: "tor.exe salió al instante (" + binary.path + ").",
    };
  }
  return { ok: true };
}

function stopTor() {
  if (gStartedProcess && gProcess) {
    try {
      if (gProcess.isRunning) {
        gProcess.kill();
      }
    } catch {}
  }
  gProcess = null;
  gStartedProcess = false;
  stopVpnHttpBridge();
}

function ensureQuitObserver() {
  if (gQuitObserver) {
    return;
  }
  gQuitObserver = true;
  Services.obs.addObserver(() => {
    FunxplorerTor.disable({ quitting: true });
  }, "quit-application");
}

export const FunxplorerTor = {
  TOPIC,

  get enabled() {
    return Services.prefs.getBoolPref(ENABLED_PREF, false);
  },

  hasBinary() {
    return !!findTorBinary();
  },

  async toggle() {
    return this.enabled ? this.disable() : this.enable();
  },

  async enable() {
    ensureQuitObserver();
    if (this.enabled) {
      return { ok: true };
    }
    if (FunxplorerVpn.enabled) {
      FunxplorerVpn.disable();
    }
    let host = socksHost();
    let port = socksPort();
    if (!(gStartedProcess && (await canConnect(host, port)))) {
      stopTor();
      let started = await startTor(port);
      if (!started.ok) {
        return started;
      }
      let ready = await waitForSocks(host, port, 45000);
      if (!ready) {
        let running = false;
        try {
          running = gProcess?.isRunning;
        } catch {}
        stopTor();
        return {
          ok: false,
          error: running
            ? "Tor arrancó pero el puerto SOCKS no responde."
            : "Tor se detuvo antes de abrir el puerto SOCKS.",
        };
      }
    }
    captureBrowserProxy();
    applySocksProxy(host, port);
    Services.prefs.setBoolPref(ENABLED_PREF, true);
    Services.obs.notifyObservers(null, TOPIC, "on");
    return { ok: true };
  },

  disable({ quitting = false } = {}) {
    if (!this.enabled && !gStartedProcess) {
      stopVpnHttpBridge();
      return { ok: true };
    }
    stopTor();
    restoreBrowserProxy();
    Services.prefs.setBoolPref(ENABLED_PREF, false);
    if (!quitting) {
      Services.obs.notifyObservers(null, TOPIC, "off");
    }
    return { ok: true };
  },
};
