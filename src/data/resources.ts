/** Resource page preview content for lead magnet landing pages. */

import type { LeadMagnetKey } from "./tally";

export interface ResourceContent {
  key: LeadMagnetKey;
  eyebrow: string;
  intro: string;
  previewTitle: string;
  previewItems: string[];
  serviceLink: { href: string; label: string };
}

export const resourceContent: Record<LeadMagnetKey, ResourceContent> = {
  reviews: {
    key: "reviews",
    eyebrow: "Free resource",
    intro:
      "Every review is public marketing. These templates help you respond consistently — especially to negative feedback — without sounding robotic.",
    previewTitle: "Sample responses included in the PDF",
    previewItems: [
      "5-star review with a detailed compliment — warm, specific thank-you",
      "4-star review with a minor service note — acknowledge and invite back",
      "1-star food complaint — apologize, take offline, no argument on Google",
    ],
    serviceLink: {
      href: "/services/review-management/",
      label: "Review Management service",
    },
  },
  seoChecklist: {
    key: "seoChecklist",
    eyebrow: "Free resource",
    intro:
      "Local SEO for restaurants is mostly hygiene: GBP completeness, review velocity, and on-site signals. This checklist covers the 20 items that move the needle.",
    previewTitle: "Preview — 5 of 20 checklist items",
    previewItems: [
      "Google Business Profile claimed, verified, and categories set correctly",
      'Primary + secondary categories filled (not just "Restaurant")',
      "Business hours accurate, including holiday hours",
      "Minimum 10 GBP photos: exterior, interior, food, team",
      "Every Google review responded to — including older reviews",
    ],
    serviceLink: {
      href: "/services/google-maps-seo/",
      label: "Google Maps & SEO service",
    },
  },
  grandOpening: {
    key: "grandOpening",
    eyebrow: "Free resource",
    intro:
      "Opening week marketing fails when digital setup starts too late. This 90-day timeline covers what to do before, during, and after launch.",
    previewTitle: "Preview — first milestones",
    previewItems: [
      "90 days out: Register domain, create GBP (even unverified), open social accounts",
      "60 days out: Website live (minimum: coming soon + email capture), list on Yelp/OpenTable",
      "30 days out: Teaser content cadence, influencer outreach, opening event on Google",
    ],
    serviceLink: {
      href: "/services/grand-opening-marketing/",
      label: "Grand Opening Marketing service",
    },
  },
};

export const resourceList = Object.values(resourceContent);
