/** Single source for nav + footer links (redesign scaffold). */

export const ctaNav = {
  label: "Book a Free Google Audit",
  href: "/contact/",
} as const;

export const mainNav = [
  { label: "Services", href: "/services/" },
  { label: "Locations", href: "/locations/" },
  { label: "Case Studies", href: "/case-studies/" },
  { label: "Pricing", href: "/pricing/" },
  { label: "Blog", href: "/blog/" },
] as const;

export const footerServices = [
  {
    label: "Restaurant Website Design",
    href: "/services/restaurant-website-design/",
  },
  {
    label: "Social Media Management",
    href: "/services/social-media-management/",
  },
  { label: "Google Maps & SEO", href: "/services/google-maps-seo/" },
  { label: "Review Management", href: "/services/review-management/" },
  {
    label: "Grand Opening Marketing",
    href: "/services/grand-opening-marketing/",
  },
] as const;

export const footerLocations = [
  { label: "Scarborough", href: "/locations/scarborough/" },
  { label: "Brampton", href: "/locations/brampton/" },
  { label: "Mississauga", href: "/locations/mississauga/" },
  { label: "North York", href: "/locations/north-york/" },
  { label: "Etobicoke", href: "/locations/etobicoke/" },
  { label: "Hamilton", href: "/locations/hamilton/" },
  { label: "Vaughan", href: "/locations/vaughan/" },
  { label: "Markham", href: "/locations/markham/" },
] as const;

export const footerResources = [
  { label: "Blog", href: "/blog/" },
  { label: "Case Studies", href: "/case-studies/" },
  {
    label: "Review Templates",
    href: "/resources/google-review-response-templates/",
  },
  { label: "SEO Checklist", href: "/resources/restaurant-seo-checklist/" },
  {
    label: "Halal Restaurant Marketing",
    href: "/niche/halal-restaurant-marketing-toronto/",
  },
  {
    label: "SEO para Restaurantes (ES)",
    href: "/niche/seo-restaurantes-toronto/",
  },
  {
    label: "SEO pour Restaurants (FR)",
    href: "/niche/seo-restaurants-toronto/",
  },
] as const;

export const footerContact = [
  {
    label: "hello@torontorestaurantgrowth.ca",
    href: "mailto:hello@torontorestaurantgrowth.ca",
  },
] as const;
