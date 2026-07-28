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
