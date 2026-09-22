# Blog pipeline — Google guideline checklist

Vendored copy for this repo. Reviewed **2026-09-21** against the live pages below. The previous fingerprint file was taken **2026-05-15**.

Do not edit gate scripts because a fingerprint moved. The checker hashes the full page (scripts, styles, and tags stripped; first 120,000 characters). Navigation chrome can change the hash when the article did not.

`scripts/seo-guideline-sources.json` requests each page with `?hl=en`. That query does not change the English-page hash, and it stops a non-English response from looking like a policy change. Init and check scripts are unchanged.

## Sources

| Id | URL | Page "Last updated" on 2026-09-21 |
| --- | --- | --- |
| `helpful-content` | https://developers.google.com/search/docs/fundamentals/creating-helpful-content?hl=en | 2025-12-10 UTC |
| `gen-ai-content` | https://developers.google.com/search/docs/fundamentals/using-gen-ai-content?hl=en | 2025-12-10 UTC |
| `spam-policies` | https://developers.google.com/search/docs/essentials/spam-policies?hl=en | 2026-08-28 UTC |

Documentation log: https://developers.google.com/search/updates

## Material changes since the 2026-05-15 baseline

All three fingerprints drifted. Only the spam-policy page has an article date after that baseline.

1. **Spam policies now name generative AI responses (2026-05-15).** The spam-policy intro treats attempts to manipulate generative AI responses in Google Search as spam, same as manipulating classic web rankings. Scaled content abuse still includes using generative AI to produce many pages that do not add value for users.
2. **Site reputation policy, EEA enforcement (2026-08-28).** Google adjusted enforcement of the site reputation policy in the European Economic Area. The rule itself is unchanged: third-party content hosted mainly to borrow a site's existing ranking signals is abuse. Columns, forums, syndicated news, and reader-facing advertorials are still listed as examples that are not this abuse.
3. **Helpful-content and gen-AI articles were not redated.** Both still say last updated 2025-12-10, which is before the May baseline. Their hash moves are treated as Search Central chrome (new nav, including the May 15, 2026 guide on optimizing for generative AI features), not a new people-first or gen-AI rule.

No gate-script change in this refresh. Re-read the three URLs before changing `scripts/site-gates.json` or the blog checkers.

## People-first content

From [creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content):

- Write for an existing restaurant-owner audience, with a clear site focus. Not a pile of topics chosen only because they might rank.
- Add original reporting, first-hand experience, or analysis. Do not only rewrite other pages.
- Titles describe the page. No shock or exaggeration.
- Show who wrote or reviewed it, and why a reader should trust it. Trust is the E-E-A-T aspect Google weights most; YMYL topics get more weight.
- Say how the page was made when automation or AI did substantial work, including why that automation was useful.
- Do not chase a supposed preferred word count, fake freshness by changing dates, or add and delete pages only to look fresh.
- SEO that helps Google find and understand people-first pages is fine. Content made mainly to manipulate rankings is not.

## Generative AI on the site

From [guidance on using generative AI content](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content):

- Using generative AI to research or to structure original content is allowed.
- Generating many pages without added user value can be scaled content abuse.
- Accuracy, quality, and relevance apply to body copy and to titles, meta descriptions, structured data, and image alt text.
- When content is generated automatically, tell readers how it was created in a way that fits the page.
- Merchant Center IPTC rules for AI product images apply to ecommerce product data, not to these marketing articles.

## Spam rules that bind this pipeline

From [spam policies](https://developers.google.com/search/docs/essentials/spam-policies). Full policy list stays on Google's page. These are the ones this blog pipeline can actually violate:

- **Scaled content abuse** — many low-value pages, including AI pages, scraped rewrites, synonymized or translated copies, or stitched pages. This repo opens at most one reviewed draft per weekly slot.
- **Scraping** — republishing someone else's content without original value.
- **Keyword stuffing** — city or phrase lists written for rankings rather than readers.
- **Hidden text and doorway pages** — not used by this pipeline.
- **Fake freshness** — do not change dates when the content did not change (also called out on the helpful-content page).
- **Site reputation abuse** — do not host third-party pages here so they can rank on this domain's signals.
- **Generative AI responses** — do not publish pages whose purpose is to manipulate AI answers in Search.

## Before accepting a draft

- Audience is independent Toronto and GTA restaurant owners.
- Body meets `scripts/site-gates.json` (`minWords`, `minH2`, a link to `/pricing/` or `/contact/`, no guaranteed-ranking claims).
- Automated drafts include the "How this was created" note from `scripts/blog-generate-body.mjs`.
- Claims a reader could check are sourced in the draft, not invented.
- One draft slot per run. Do not batch-generate pages to fill the calendar.

## After a fingerprint failure

1. Read the three URLs and the documentation updates since `automation/guideline-baseline.json` `fetchedAt`.
2. Record material rule changes in this file. Ignore chrome-only hash moves.
3. Change gate scripts only when a new rule changes what this repo publishes.
4. Run `npm run seo:guidelines:init` and commit `automation/guideline-baseline.json` with this file.
5. `npm run seo:guidelines:check` must exit 0 before merge.
