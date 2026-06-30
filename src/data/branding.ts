/** TRG logo assets — single source of truth for all site branding. */

export const siteName = "Toronto Restaurant Growth";

export const trgLogo = {
  /** Circular TRG mark — favicons, schema, compact uses */
  mark: "/trg-logo-mark.png",
  /** Full lockup on dark bar — light page backgrounds (header) */
  horizontalDark: "/trg-logo-horizontal-dark.png",
  /** Full lockup on dark bar — dark page backgrounds (footer) */
  horizontalLight: "/trg-logo-horizontal-light.png",
  alt: siteName,
} as const;
