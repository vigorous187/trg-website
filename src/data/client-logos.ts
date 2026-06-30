/** Client brand marks — use each operator's own logo, not TRG's. */

export const clientLogos = {
  crabBoil: {
    src: "/clients/crab-boil-logo.jpg",
    alt: "Crab Boil",
  },
  mystic: {
    src: "/clients/mystic-logo.webp",
    srcFallback: "/clients/mystic-logo.png",
    alt: "Mystic Caribbean Resto & Bar",
  },
} as const;

export type ClientLogoId = keyof typeof clientLogos;
