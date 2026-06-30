# Toronto Restaurant Growth — blog pipeline

Checklist: [~/Developer/shared/docs/BLOG_PIPELINE_GOOGLE_CHECKLIST.md](file:///Users/user/Developer/shared/docs/BLOG_PIPELINE_GOOGLE_CHECKLIST.md)

## Stack

Blog posts live in `src/content/blog/*.mdx` (Astro Content Collections). Listing is generated from the collection—no manual post arrays.

## Automation

- Weekly `blog-automation.yml` — AI-drafted posts from `automation/topic-queue.json`
- **API key:** GitHub Actions uses repo secret `ANTHROPIC_API_KEY` (set from cc-vault `api-anthropic`). Local runs:

```bash
ANTHROPIC_API_KEY=$(cc-vault get api-anthropic) npm run blog:open-slot
```

- `scripts/blog-generate-body.mjs` — Anthropic body generation with TRG quality gates
- `scripts/blog-open-slot.mjs` — opens PR; set `BLOG_AUTO_GENERATE=0` for outline-only drafts
- Weekly `seo-build-health.yml`
- Monthly `seo-guideline-drift.yml`

## Mystic SEO dashboard (public)

- `scripts/sync-mystic-seo-report.mjs` — pulls rankings from Mystic repo → `src/data/mystic-seo-report.ts`
- Public page: `/client-results/mystic-caribbean/` (prospect-facing rankings report)
- Full client dashboard: `https://dashboard.forge-co.ca/client/mystic-caribbean`

```bash
npm run seo:sync-mystic
```

Run after Mystic weekly rankings update, before deploy.

## Commands

```bash
npm run blog:inventory -- --days=90
npm run blog:open-slot          # local; needs ANTHROPIC_API_KEY for AI body
npm run seo:sync-mystic
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
