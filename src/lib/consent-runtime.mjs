export const CONSENT_VERSION = 1;
export const CONSENT_STORAGE_KEY = "trg:consent:v1";
export const CONSENT_CHOICES = Object.freeze({
  accepted: "accepted",
  rejected: "rejected",
});

export const SITE_CONSENT_CONFIG = Object.freeze({
  gtmContainerId: "GTM-WH4XSW4L",
  metaPixelId: null,
});

const CONSENT_FIELDS = Object.freeze({
  analytics_storage: "denied",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
});

export function parseConsentRecord(raw) {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const value = JSON.parse(raw);
    if (
      value?.version !== CONSENT_VERSION ||
      !Object.values(CONSENT_CHOICES).includes(value?.choice) ||
      !Number.isFinite(value?.decidedAt)
    ) return null;
    return { version: CONSENT_VERSION, choice: value.choice, decidedAt: value.decidedAt };
  } catch {
    return null;
  }
}

export function createConsentRecord(choice, decidedAt = Date.now()) {
  if (!Object.values(CONSENT_CHOICES).includes(choice)) throw new TypeError("Unknown consent choice");
  return { version: CONSENT_VERSION, choice, decidedAt };
}

export function createConsentController({
  storage,
  now = Date.now,
  applyDefault,
  applyUpdate,
  loadGtm,
  loadMeta,
  syncZaraz,
  reload,
  notify = () => {},
}) {
  let started = false;
  let current = null;
  let providersLoaded = false;

  function readStoredChoice() {
    try { return parseConsentRecord(storage?.getItem(CONSENT_STORAGE_KEY)); }
    catch { return null; }
  }
  function persist(choice) {
    const record = createConsentRecord(choice, now());
    try { storage?.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record)); }
    catch { /* A later page fails closed to denied if storage is unavailable. */ }
    return record;
  }
  function loadProvidersOnce() {
    if (providersLoaded) return;
    providersLoaded = true;
    loadGtm?.();
    loadMeta?.();
  }
  function grantedFields() {
    return Object.fromEntries(Object.keys(CONSENT_FIELDS).map((key) => [key, "granted"]));
  }
  function start() {
    if (started) return current;
    started = true;
    applyDefault?.({ ...CONSENT_FIELDS, wait_for_update: 500 });
    current = readStoredChoice();
    if (current?.choice === CONSENT_CHOICES.accepted) {
      applyUpdate?.(grantedFields());
      syncZaraz?.(true);
      loadProvidersOnce();
    } else {
      syncZaraz?.(false);
    }
    notify(current?.choice ?? null);
    return current;
  }
  function accept() {
    if (!started) start();
    if (current?.choice !== CONSENT_CHOICES.accepted) {
      current = persist(CONSENT_CHOICES.accepted);
      applyUpdate?.(grantedFields());
      syncZaraz?.(true);
      loadProvidersOnce();
      notify(current.choice);
    }
    return current;
  }
  function reject() {
    if (!started) start();
    const mustReload = providersLoaded || current?.choice === CONSENT_CHOICES.accepted;
    if (current?.choice !== CONSENT_CHOICES.rejected) {
      current = persist(CONSENT_CHOICES.rejected);
      applyUpdate?.({ ...CONSENT_FIELDS });
      syncZaraz?.(false);
      notify(current.choice);
    }
    if (mustReload) reload?.();
    return current;
  }
  return Object.freeze({
    start,
    accept,
    reject,
    getChoice: () => current?.choice ?? null,
    hasMeasurementConsent: () => current?.choice === CONSENT_CHOICES.accepted,
  });
}

function browserApplyDefault(fields) {
  if (window.__siteConsentDefaultVersion === CONSENT_VERSION) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag("consent", "default", fields);
  window.__siteConsentDefaultVersion = CONSENT_VERSION;
}
function browserApplyUpdate(fields) { window.gtag("consent", "update", fields); }

function loadGtm() {
  const id = SITE_CONSENT_CONFIG.gtmContainerId;
  window.__siteConsentProviders = window.__siteConsentProviders || {};
  if (window.__siteConsentProviders.gtm || document.querySelector('script[data-consent-provider="gtm"]')) return;
  window.__siteConsentProviders.gtm = true;
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const script = document.createElement("script");
  script.async = true;
  script.dataset.consentProvider = "gtm";
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
}

let zarazSyncGeneration = 0;
function syncZaraz(granted) {
  const generation = ++zarazSyncGeneration;
  const purposes = { analytics: granted, marketing: granted };
  const attempt = (remaining) => {
    if (generation !== zarazSyncGeneration) return;
    const consent = window.zaraz?.consent;
    if (typeof consent?.setAll === "function") {
      try { consent.setAll(purposes); } catch { /* Cloudflare-side verification remains required. */ }
      return;
    }
    if (remaining > 0) window.setTimeout(() => attempt(remaining - 1), 250);
  };
  attempt(20);
}
function notify(choice) {
  window.dispatchEvent(new CustomEvent("site-consent-change", { detail: { choice } }));
}

export function bootstrapConsent() {
  if (window.__siteConsent) return window.__siteConsent;
  const controller = createConsentController({
    storage: window.localStorage,
    applyDefault: browserApplyDefault,
    applyUpdate: browserApplyUpdate,
    loadGtm,
    syncZaraz,
    reload: () => window.location.reload(),
    notify,
  });
  window.__siteConsent = Object.freeze({
    ...controller,
    showPreferences: () => window.dispatchEvent(new CustomEvent("site-consent-open")),
  });
  controller.start();
  return window.__siteConsent;
}
