# Toronto Restaurant Growth — blog pipeline

Checklist: [~/Developer/shared/docs/BLOG_PIPELINE_GOOGLE_CHECKLIST.md](file:///Users/user/Developer/shared/docs/BLOG_PIPELINE_GOOGLE_CHECKLIST.md)

## Stack

Blog posts live in `src/content/blog/*.mdx` (Astro Content Collections). Listing is generated from the collection—no manual post arrays.

## Automation

- Weekly `blog-automation.yml` (topic queue + PR)
- Weekly `seo-build-health.yml`
- Monthly `seo-guideline-drift.yml`

## Gates

`scripts/check-blog-baseline.mjs` enforces word count, H2 depth, and `/pricing/` or `/contact/` links.

## Commands

```bash
npm run blog:inventory -- --days=90
```

## Proof inventory (90-day window)

### Snapshot 2026-05-14

| Slug                                      | File                                          | datePublished | In window |
| ----------------------------------------- | --------------------------------------------- | ------------- | --------- |
| catering-lead-seo-gta                     | catering-lead-seo-gta.mdx                     | 2026-05-11    | yes       |
| restaurant-email-marketing-list           | restaurant-email-marketing-list.mdx           | 2026-05-09    | yes       |
| dine-toronto-seasonal-marketing           | dine-toronto-seasonal-marketing.mdx           | 2026-05-07    | yes       |
| neighbourhood-landing-pages-restaurants   | neighbourhood-landing-pages-restaurants.mdx   | 2026-05-05    | yes       |
| google-ads-local-campaign-restaurants     | google-ads-local-campaign-restaurants.mdx     | 2026-05-03    | yes       |
| instagram-reels-restaurant-promo-2026     | instagram-reels-restaurant-promo-2026.mdx     | 2026-05-01    | yes       |
| restaurant-tiktok-growth-strategy         | restaurant-tiktok-growth-strategy.mdx         | 2026-04-10    | yes       |
| halal-restaurant-marketing-gta            | halal-restaurant-marketing-gta.mdx            | 2026-04-08    | yes       |
| why-your-restaurant-not-showing-on-google | why-your-restaurant-not-showing-on-google.mdx | 2026-04-06    | yes       |
| toronto-restaurants-rank-google-maps      | toronto-restaurants-rank-google-maps.mdx      | 2026-03-15    | yes       |

**Count in window:** 10 / 10 total published
