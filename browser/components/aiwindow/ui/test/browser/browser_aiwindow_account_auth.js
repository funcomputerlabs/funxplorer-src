/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { AIWindowAccountAuth } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/AIWindowAccountAuth.sys.mjs"
);

add_task(async function test_prompt_succeeds_without_account() {
  const ok = await AIWindowAccountAuth.promptSignIn(gBrowser.selectedBrowser);
  Assert.ok(ok, "promptSignIn succeeds without an account");
  Assert.ok(AIWindowAccountAuth.hasToSConsent, "ToS consent is recorded");
  Assert.ok(
    await AIWindowAccountAuth.isSignedIn(),
    "isSignedIn is always true"
  );
});
