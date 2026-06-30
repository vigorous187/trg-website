/** Homepage proof metrics — verified client outcomes (update from forge client data). */

export const crabBoilProof = {
  name: "Crab Boil",
  location: "Toronto, Mississauga & Ottawa",
  href: "/case-studies/crab-boil/",
  tag: "Lead case study",
  businessMetrics: [
    {
      value: "5,000+",
      label: "Google Reviews",
      sub: "Across all locations · Apr 2026",
    },
    {
      value: "4.8★",
      label: "Flagship Rating",
      sub: "Weston Rd · 3,476 reviews",
    },
    {
      value: "$2K→$4K",
      label: "Monthly Retainer",
      sub: "Scope grew as results compounded",
    },
  ],
  outcomes: [
    "5,000+ Google reviews across Toronto and Ottawa locations",
    "4.8★ on the Weston Rd flagship (3,476 reviews)",
    "$2K→$4K/mo retainer as Google, reviews, and content scope expanded",
  ],
  contentReach: [
    {
      value: "500M+",
      label: "Combined Impressions",
      sub: "Social add-on · @crabboil.ca",
    },
    { value: "113K", label: "TikTok Followers", sub: "Built from zero" },
    { value: "89K", label: "Instagram Followers", sub: "Brand trust signal" },
  ],
} as const;

export const mysticProof = {
  name: "Mystic Caribbean Resto & Bar",
  location: "Brampton",
  href: "/case-studies/mystic-caribbean/",
  tag: "Active SEO client",
  businessMetrics: [
    {
      value: "#1",
      label: "Kennedy Rd Restaurant",
      sub: "Google local search · Jun 2026",
    },
    { value: "15", label: "Keywords in Top 10", sub: "Local SEO program" },
    {
      value: "305",
      label: "Google Reviews",
      sub: "Daily review response active",
    },
  ],
  outcomes: [
    '#1 for "restaurant Brampton Kennedy Road"',
    '#1 for "Caribbean bar Brampton" and brand-name searches',
    "15 local keywords in the top 10 after Forge site migration (Jun 2026)",
    "305 Google reviews with automated daily response management",
  ],
} as const;

export const contentReachAddOn = [
  {
    value: "598K",
    label: "Avg. Views / Post",
    sub: "Jayden Aj content engine",
  },
  {
    value: "697K",
    label: "Creator Reach",
    sub: "Jayden Aj · content add-on partner",
  },
] as const;
