/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = {};

XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "hasAIWindowToSConsent",
  "browser.smartwindow.tos.consentTime",
  0
);

export const AIWindowAccountAuth = {
  get hasToSConsent() {
    return !!lazy.hasAIWindowToSConsent;
  },

  set hasToSConsent(value) {
    const nowSeconds = Math.floor(Date.now() / 1000);
    Services.prefs.setIntPref(
      "browser.smartwindow.tos.consentTime",
      value ? nowSeconds : 0
    );
  },

  async isSignedIn() {
    return true;
  },

  async canAccessAIWindow() {
    if (!this.hasToSConsent) {
      this.hasToSConsent = true;
    }
    return true;
  },

  async promptSignIn(_browser) {
    this.hasToSConsent = true;
    return true;
  },

  async ensureAIWindowAccess(_browser) {
    if (!this.hasToSConsent) {
      this.hasToSConsent = true;
    }
    return true;
  },
};
