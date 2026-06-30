/**
 * Canonical TRG pricing — single source of truth for all pages.
 *
 * Core TRG retainer = Growth ($997/mo) — website, SEO, GBP, reviews, ads (Forge / Michael).
 * Social + video = separate add-on via Jayden Aj / Forge content ($3,000/mo).
 */

export const pricingTerms = {
  billing: "month-to-month",
  cancellationNoticeDays: 30,
  freeEntryPoint: "Free Google Audit",
} as const;

export type TierId = "growth";

export interface Tier {
  id: TierId;
  name: string;
  monthly: number;
  setup: number;
  monthlyLabel: string;
  setupLabel: string;
  description: string;
  features: string[];
  cta: string;
}

/** The only core TRG plan. */
export const growthPlan: Tier = {
  id: "growth",
  name: "Growth",
  monthly: 997,
  setup: 4997,
  monthlyLabel: "$997/month",
  setupLabel: "$4,997 setup",
  description:
    "Full digital presence — website, Google visibility, reviews, and ongoing growth. One plan. No tiers.",
  features: [
    "Google Business Profile optimization",
    "Review management (generate, monitor, respond)",
    "Restaurant website design",
    "Local SEO (Google Maps + organic)",
    "Google Ads management",
    "Competitor gap analysis",
    "Monthly performance reporting",
  ],
  cta: "Book a Free Audit",
};

/** @deprecated Use growthPlan — kept for pages that iterate tiers */
export const tiers: Tier[] = [growthPlan];

/** Social + video — Jayden Aj / Forge content team. Not included in Growth. */
export const contentAddOn = {
  name: "Social & Video Content",
  provider: "Jayden Aj · Forge content",
  monthly: 3000,
  monthlyLabel: "$3,000/month",
  description:
    "On-site video production, TikTok and Instagram Reels, social strategy, posting, and community management. The same content engine behind Crab Boil's 500M+ impressions.",
  features: [
    "On-site filming at your restaurant",
    "TikTok, Reels, and short-form video",
    "Content calendar, posting, and engagement",
    "Strategy aligned with your TRG growth plan",
  ],
  forgeServiceUrl: "https://forge-co.ca/services/content-forge/",
  note: "Optional add-on — not included in Growth.",
} as const;

/** Contact form (Tally 2Evezg) service options → plan or add-on — labels must match Tally exactly. */
export const intakeToTier: {
  option: string;
  tierId?: TierId;
  addOn?: "content";
  note: string;
}[] = [
  {
    option: "Website Design",
    tierId: "growth",
    note: "Website build and ongoing SEO are included in Growth.",
  },
  {
    option: "Social Media Management",
    addOn: "content",
    note: "Social and video are a separate add-on through Jayden — not part of Growth.",
  },
  {
    option: "Google Maps & SEO",
    tierId: "growth",
    note: "GBP, reviews, local SEO, and ads — all included in Growth.",
  },
  {
    option: "Review Management",
    tierId: "growth",
    note: "Review generation, monitoring, and response included in Growth.",
  },
  {
    option: "Grand Opening Marketing",
    note: "Project-based launch campaigns — separate from the monthly retainer. Often transitions to Growth after opening.",
  },
];

/** Project add-ons (separate from monthly retainers) */
export const projectAddOns = {
  grandOpening: {
    fullCampaignLabel: "$3,500–$6,500",
    fullCampaignNote: "12-week campaign (8 weeks pre-opening + 4 weeks post)",
    openingWeekLabel: "from $1,500",
    openingWeekNote: "Standalone opening week coverage",
    transitionNote:
      "Most clients transition to Growth (and optionally the content add-on) after launch.",
  },
  websiteOnly: {
    singleLocationLabel: "from $2,500",
    singleLocationNote:
      "One-time build for a single location (menu, photos, hours, booking) without a retainer",
    multiLocationLabel: "$4,000–$8,000",
    multiLocationNote: "Multi-location or custom functionality",
  },
} as const;

export function formatMoney(n: number): string {
  return n.toLocaleString("en-CA");
}

export function tierById(id: TierId): Tier {
  if (id !== "growth") throw new Error(`Unknown tier: ${id}`);
  return growthPlan;
}

/** Shared copy for location pages and service FAQs */
export const plansOverviewCopy = `One month-to-month plan — Growth (${growthPlan.monthlyLabel}) plus a one-time ${growthPlan.setupLabel}. Social and video content is a separate add-on (${contentAddOn.monthlyLabel} through Jayden Aj).`;

export const servicePricingFaqs = {
  googleMaps: `Google Maps and local SEO are included in Growth (${growthPlan.monthlyLabel}). That covers GBP optimization, citations, review systems, website local SEO, and Google Ads. Setup is ${growthPlan.setupLabel}. Social and video are not included — see the <a href="/services/social-media-management/">content add-on</a>. <a href="/pricing/">Full pricing</a>.`,

  social: `Social media and video content are <strong>not</strong> included in Growth. They are a separate add-on: <strong>${contentAddOn.monthlyLabel}</strong> for on-site video, TikTok/Reels production, posting, and strategy — delivered by Jayden Aj through Forge's content team (the same work behind Crab Boil's 500M+ impressions). Growth covers website, Google visibility, reviews, and ads. <a href="/pricing/">See pricing</a> or <a href="${contentAddOn.forgeServiceUrl}">ContentForge on Forge</a>.`,

  website: `Website design is included in Growth (${growthPlan.monthlyLabel}; setup ${growthPlan.setupLabel}). Website-only projects without an ongoing retainer start at ${projectAddOns.websiteOnly.singleLocationLabel} for a single location, or ${projectAddOns.websiteOnly.multiLocationLabel} for multi-location builds.`,

  reviews: `Review generation, monitoring, and professional response are included in Growth (${growthPlan.monthlyLabel}). Every engagement can start with a free review audit before you commit.`,

  grandOpening: `Grand opening campaigns are project-based, separate from the monthly retainer. A full ${projectAddOns.grandOpening.fullCampaignNote} typically runs ${projectAddOns.grandOpening.fullCampaignLabel}. ${projectAddOns.grandOpening.openingWeekNote} starts at ${projectAddOns.grandOpening.openingWeekLabel}. ${projectAddOns.grandOpening.transitionNote}`,

  locations: `${plansOverviewCopy} Every engagement starts with a free Google audit. <a href="/pricing/">View plan and setup fee</a>.`,
} as const;
