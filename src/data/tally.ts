/**
 * TRG Tally form IDs and embed URLs — single source of truth.
 *
 * Env overrides (optional):
 *   PUBLIC_TALLY_AUDIT
 *   PUBLIC_TALLY_LEAD_MAGNET
 */

export const trgContactEmail = "hello@torontorestaurantgrowth.ca";

export const tallyForms = {
  audit: {
    id: "2Evezg",
    redirectPath: "/contact/thank-you/",
    title: "Book a Free Google Audit",
  },
  leadMagnet: {
    id: "Xxg9Kd",
    title: "Download resource",
  },
} as const;

export type LeadMagnetKey = "reviews" | "seoChecklist" | "grandOpening";

export const leadMagnets: Record<
  LeadMagnetKey,
  {
    slug: string;
    title: string;
    resourcePrefill: string;
    pdfPath: string;
    metaDescription: string;
  }
> = {
  reviews: {
    slug: "google-review-response-templates",
    title: "Google Review Response Templates",
    resourcePrefill: "Google Review Response Templates",
    pdfPath: "/resources/downloads/google-review-response-templates.pdf",
    metaDescription:
      "Free restaurant Google review response templates — 5-star, negative, and no-text reviews for Toronto operators.",
  },
  seoChecklist: {
    slug: "restaurant-seo-checklist",
    title: "Restaurant SEO Checklist",
    resourcePrefill: "Restaurant SEO Checklist",
    pdfPath: "/resources/downloads/restaurant-seo-checklist.pdf",
    metaDescription:
      "Free local SEO checklist for independent restaurants — GBP, citations, reviews, and website signals.",
  },
  grandOpening: {
    slug: "restaurant-grand-opening-timeline",
    title: "Restaurant Grand Opening Timeline",
    resourcePrefill: "Restaurant Grand Opening Timeline",
    pdfPath: "/resources/downloads/restaurant-grand-opening-timeline.pdf",
    metaDescription:
      "Free 90-day grand opening marketing timeline for new restaurant launches in the GTA.",
  },
};

/** Tally field labels used for URL prefill (must match live form question titles). */
export const tallyPrefillKeys = {
  services: "Services interested in",
  resource: "Resource",
} as const;

export const auditServiceOptions = [
  "Website Design",
  "Social Media Management",
  "Google Maps & SEO",
  "Review Management",
  "Grand Opening Marketing",
] as const;

export function resolveTallyFormId(
  key: keyof typeof tallyForms,
  env: ImportMetaEnv,
): string {
  const defaults = tallyForms[key].id;
  if (key === "audit") {
    return env.PUBLIC_TALLY_AUDIT?.trim() || defaults;
  }
  return env.PUBLIC_TALLY_LEAD_MAGNET?.trim() || defaults;
}

export function tallyEmbedUrl(
  formId: string,
  prefill?: Record<string, string>,
): string {
  const id = formId.trim();
  if (!id) return "";

  const q = new URLSearchParams({
    alignLeft: "1",
    hideTitle: "1",
    dynamicHeight: "1",
    transparentBackground: "1",
  });

  const url = `https://tally.so/embed/${id}?${q.toString()}`;
  if (!prefill || Object.keys(prefill).length === 0) return url;

  const withPrefill = new URL(url);
  for (const [field, value] of Object.entries(prefill)) {
    if (value.trim()) withPrefill.searchParams.set(field, value);
  }
  return withPrefill.toString();
}

export function getAuditEmbedUrl(
  env: ImportMetaEnv,
  prefill?: { service?: string },
): string {
  const params: Record<string, string> = {};
  if (prefill?.service) params[tallyPrefillKeys.services] = prefill.service;
  return tallyEmbedUrl(resolveTallyFormId("audit", env), params);
}

export function getLeadMagnetEmbedUrl(
  env: ImportMetaEnv,
  key: LeadMagnetKey,
): string {
  const magnet = leadMagnets[key];
  return tallyEmbedUrl(resolveTallyFormId("leadMagnet", env), {
    [tallyPrefillKeys.resource]: magnet.resourcePrefill,
  });
}

/** Parse ?interest= or ?service= from contact page URL for Tally prefill. */
export function auditPrefillFromSearchParams(params: URLSearchParams): {
  service?: string;
} {
  const service =
    params.get("interest")?.trim() ||
    params.get("service")?.trim() ||
    undefined;
  return { service };
}
