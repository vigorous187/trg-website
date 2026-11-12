/** TRG logo assets — single source of truth for all site branding. */

export const siteName = "Toronto Restaurant Growth";

export const sitePhone = {
  display: "(647) 788-8806",
  tel: "+16477888806",
  schema: "+1-647-788-8806",
} as const;

/** Public profiles already linked from the contact page. */
export const siteProfiles = [
  {
    label: "TikTok · @torontorestaurantgrowth",
    href: "https://tiktok.com/@torontorestaurantgrowth",
  },
  {
    label: "Instagram · @torontorestaurantgrowth",
    href: "https://instagram.com/torontorestaurantgrowth",
  },
] as const;

export const trgLogo = {
  /** Circular TRG mark — favicons, schema, compact uses */
  mark: "/trg-logo-mark.png",
  /** Full lockup on dark bar — light page backgrounds (header) */
  horizontalDark: "/trg-logo-horizontal-dark-450.webp",
  /** Full lockup on dark bar — dark page backgrounds (footer) */
  horizontalLight: "/trg-logo-horizontal-light.png",
  alt: siteName,
} as const;
