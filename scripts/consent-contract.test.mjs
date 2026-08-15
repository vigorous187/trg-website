import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
  SITE_CONSENT_CONFIG,
  createConsentController,
  parseConsentRecord,
} from "../src/lib/consent-runtime.mjs";
import { auditZarazConfig } from "./verify-zaraz-consent-config.mjs";

test("release preflight fails closed when Zaraz auto-injection is enabled", () => {
  assert.deepEqual(auditZarazConfig({ settings: { autoInjectScript: true }, tools: {} }), ["Zaraz autoInjectScript must be false"]);
  assert.deepEqual(auditZarazConfig({ settings: { autoInjectScript: false }, tools: {} }), []);
});

function harness(stored = null) {
  const values = new Map();
  if (stored !== null) values.set(CONSENT_STORAGE_KEY, stored);
  const calls = [];
  let reloads = 0;
  const controller = createConsentController({
    storage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
    now: () => 1_786_707_600_000,
    applyDefault: () => calls.push("consent:default:denied"),
    applyUpdate: (fields) => calls.push(`consent:update:${fields.analytics_storage}`),
    loadGtm: () => calls.push("load:gtm"),
    syncZaraz: (granted) => calls.push(`zaraz:${granted}`),
    reload: () => { reloads += 1; },
  });
  return { controller, calls, values, reloads: () => reloads };
}

test("first visit defaults denied and loads no measurement provider", () => {
  const state = harness();
  state.controller.start();
  assert.deepEqual(state.calls, ["consent:default:denied", "zaraz:false"]);
});

test("stored acceptance orders consent before one GTM load", () => {
  const state = harness(JSON.stringify({ version: CONSENT_VERSION, choice: "accepted", decidedAt: 1 }));
  state.controller.start();
  state.controller.start();
  state.controller.accept();
  assert.deepEqual(state.calls, [
    "consent:default:denied",
    "consent:update:granted",
    "zaraz:true",
    "load:gtm",
  ]);
});

test("withdrawal persists no PII, returns denied, and reloads loaded providers", () => {
  const state = harness();
  state.controller.start();
  state.controller.accept();
  state.controller.reject();
  assert.equal(state.reloads(), 1);
  const record = JSON.parse(state.values.get(CONSENT_STORAGE_KEY));
  assert.deepEqual(Object.keys(record).sort(), ["choice", "decidedAt", "version"]);
  assert.equal(record.choice, "rejected");
});

test("stale or malformed persistence fails closed", () => {
  assert.equal(parseConsentRecord("bad"), null);
  assert.equal(parseConsentRecord(JSON.stringify({ version: 0, choice: "accepted", decidedAt: 1 })), null);
});

test("source contract preserves GTM ID, accessibility, ordering, and removes bypass", async () => {
  assert.deepEqual(SITE_CONSENT_CONFIG, { gtmContainerId: "GTM-WH4XSW4L", metaPixelId: null });
  const root = new URL("../", import.meta.url);
  const [layout, head, banner, footer] = await Promise.all([
    readFile(new URL("src/layouts/BaseLayout.astro", root), "utf8"),
    readFile(new URL("src/components/ConsentHead.astro", root), "utf8"),
    readFile(new URL("src/components/ConsentBanner.astro", root), "utf8"),
    readFile(new URL("src/components/Footer.astro", root), "utf8"),
  ]);
  assert.ok(head.indexOf("consent', 'default'") < head.indexOf("bootstrapConsent"));
  assert.match(banner, />Accept all</);
  assert.match(banner, />Reject all</);
  assert.match(banner, /role="dialog"/);
  assert.match(banner, /aria-describedby=/);
  assert.match(footer, /data-consent-preferences/);
  assert.doesNotMatch(layout, /googletagmanager\.com\/ns\.html/);
  assert.doesNotMatch(layout, /googletagmanager\.com\/gtm\.js/);
});

test("production workflow runs the live Zaraz preflight before deploy", async () => {
  const workflow = await readFile(new URL("../.github/workflows/deploy.yml", import.meta.url), "utf8");
  const zarazPreflight = workflow.indexOf("npm run verify:consent:release");
  const deploy = workflow.indexOf("cloudflare/wrangler-action@v3");
  assert.ok(zarazPreflight > 0 && zarazPreflight < deploy);
  assert.match(workflow, /CLOUDFLARE_ZONE_ID: 7102a31aa58d6acf0145f56f0fb6463d/);
});
