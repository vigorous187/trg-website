// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";

const sitemapExclusions = new Set([
  "/contact/thank-you/",
  "/locations/brampton/",
  "/locations/scarborough/",
  "/services/review-management/",
]);

// https://astro.build/config
export default defineConfig({
  site: "https://torontorestaurantgrowth.ca",
  output: "static",
  trailingSlash: "always",

  // The site ships one shared, compiled Tailwind stylesheet. On mobile that
  // stylesheet was the only render-blocking dependency ahead of the text LCP.
  // Inline the exact compiled CSS so first paint does not wait for a second
  // request while preserving the existing visual output byte-for-byte.
  build: {
    inlineStylesheets: "always",
  },

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [
    sitemap({
      filter: (page) => !sitemapExclusions.has(new URL(page).pathname),
    }),
    mdx(),
  ],
});
