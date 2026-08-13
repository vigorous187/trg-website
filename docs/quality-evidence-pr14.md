# Website quality evidence report

Project/environment: Toronto Restaurant Growth / PR #14 candidate

Release/build: `codex/trg-measurement-release-safety-20260813` (pre-commit audit)  
Reviewer/date: Codex / 2026-08-13

Gate: MAINTENANCE

Overall result: NOT VERIFIED

Representative URLs and templates: `/`, `/contact/`, `/resources/google-review-response-templates/`; 48 content HTML pages plus three redirect documents were inspected.

## Evidence register

| Area | Check | Result | URL/template | Tool or method | Evidence | Owner/follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| Build | Production build and contracts | PASS | full site | `npm run build`; `npm run test:measurement-contract` | Build succeeds; measurement/release contracts 16/16 | CI |
| Crawl | Same-origin links/assets and sitemap targets | PASS | 48 content pages | `npm run check:site-quality` | All `href`, `src`, `srcset`, redirects, and 46 sitemap page targets resolve | CI |
| SEO | Titles, descriptions, canonicals, indexability | PASS | 46 indexable pages | built-output gate | No duplicate indexable titles/descriptions; route-matching canonical and sitemap/noindex contracts pass | CI |
| Structured data | Syntax and root contract | PASS | 48 JSON-LD blocks | JSON parse + `@context`/`@type` | Syntax passes; factual/visible-content parity remains manual-only | Site owner |
| Images | Alt, intrinsic dimensions, priority/lazy conflict | PASS | 105 image instances | built-output gate | All have `alt`, width, and height; no priority/lazy conflict | CI |
| Accessibility | Static automation + mobile Lighthouse | PASS | `/` | built gate + Lighthouse 13.4.1 mobile | Static language/H1/image checks pass; Lighthouse accessibility 100 after contrast and link-distinction fixes | CI |
| Responsive | 320 px, tablet, desktop, zoom | NOT TESTED | representative pages | Manual visual/interaction check required | No manual viewport/zoom evidence in this non-deploying change | Site owner |
| Performance | Representative mobile lab proxy | PASS | `/` | Lighthouse 13.4.1 mobile, exact local preview | Astro now inlines the exact compiled stylesheet on every page; 48 inline stylesheets and zero render-blocking stylesheet links are enforced by the built-site gate. Fresh mobile result: Performance 97, LCP 2,484 ms, TBT 12 ms, CLS 0 | CI |
| Field CWV | 75th-percentile LCP/INP/CLS | NOT TESTED | production | CrUX/RUM required | TBT is a lab responsiveness proxy, not field INP | Analytics owner |
| Functionality | Real Tally conversion | NOT TESTED | conversion surfaces | Real submissions prohibited | 16 synthetic/dry-run contracts passed; no submission or downstream effect | Authorized tester |
| Operations | Postdeploy representative SEO/release/rollback | PASS | representative URLs | `post-deploy-safety.mjs` | Verifies statuses, metadata/canonicals, JSON-LD syntax, embeds, robots/sitemap, true 404, IndexNow, exact release identity; deploy workflow retains rollback | CI |

## Metric record

| URL/template | Device/profile | Performance | Accessibility | Best Practices | SEO | LCP | TBT/INP | CLS | Report |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `/` | Lighthouse mobile, local candidate, run 1 | 94 | 100 | 100 | 100 | 2,856 ms | 10 ms TBT; INP NOT TESTED | 0 | local JSON retained outside repository |
| `/` | Lighthouse mobile, local candidate, run 2 | 94 | 100 | 100 | 100 | 2,852 ms | 10 ms TBT; INP NOT TESTED | 0 | local JSON retained outside repository |
| `/` | Lighthouse mobile, inlined CSS candidate | 97 | 100 | 100 | 100 | 2,484 ms | 12 ms TBT; INP NOT TESTED | 0 | exact local production preview; mandatory LCP PASS |

The exact LCP remained the homepage `h1`. Before the change, the longest render path was document → 62 KB compiled stylesheet → fonts. The final trace has no render-blocking stylesheet audit; LCP subparts were 15.47 ms TTFB and 108.622 ms element render delay. The production-style preview applied text compression.

## Exceptions and blockers

- Approved exceptions: GTM/Google Analytics requests were blocked for deterministic local lab evidence; production network cost is not measured here.
- Failed mandatory requirements: none in deterministic build or representative mobile Lighthouse evidence.
- Untested mandatory requirements: keyboard, screen reader, zoom, responsive visual review, production field CWV, real Tally conversion, content/schema factual parity, and post-deploy production execution.

## Approval

Prepared by/date: Codex / 2026-08-13

Approved by/role/date: NOT APPROVED — maintenance cycle remains NOT VERIFIED.
