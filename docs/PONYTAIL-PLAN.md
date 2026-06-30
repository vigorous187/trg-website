# Ponytail + Plug-and-Play SEO Plan

**Site:** torontorestaurantgrowth.ca · **Repo:** trg-site  
**Revert:** see [REVERT-SNAPSHOT.md](./REVERT-SNAPSHOT.md) · **Debt:** [ponytail-debt.md](./ponytail-debt.md) · **Rule:** [`.cursor/rules/ponytail.mdc`](../.cursor/rules/ponytail.mdc)

---

## Phase 1 — COMPLETE

- Ponytail Cursor rule (`alwaysApply: true`) with SEO non-regression contract
- Debt ledger D-001–D-007
- README replaced (D-001 closed)
- Tag: `pre-ponytail-phase1` → `c3d5fdb`

---

## Phase 2 — Plug-and-play replication

**Goal:** Same TRG capability on MHB, IBUH, MTC, CSS without forking trg-site.

**Rollout:** All four in parallel  
**Bundle:** Ponytail + GSC SEO sprint + Content Engine + keyword tracker + monthly reports

### Architecture (skill + manifest + dashboard)

| Layer     | Location                                                     | Purpose                                                     |
| --------- | ------------------------------------------------------------ | ----------------------------------------------------------- |
| Manifest  | `~/Developer/shared/scripts/config/client-seo-playbook.json` | Per-client slug, repo, domain, vertical, deploy, link map   |
| Skill     | `~/claude/skills/forge-seo-sprint/SKILL.md`                  | Agent workflow: GSC audit → surgical fixes → build → deploy |
| Dashboard | `seo-dashboard-platform`                                     | CE, GSC sync, keywords, reports, industry profiles          |

### Clients

| Client | Slug                    | Repo                                  | Domain                     | Vertical          |
| ------ | ----------------------- | ------------------------------------- | -------------------------- | ----------------- |
| TRG    | torontorestaurantgrowth | forge/repos/trg-site                  | torontorestaurantgrowth.ca | restaurant-agency |
| MHB    | michaelthehomebuyer     | mhb/repos/michael-the-homebuyer-astro | michaelthehomebuyer.ca     | home-buyer        |
| IBUH   | ibuyuglyhouses          | mhb/repos/ibuyuglyhouses-astro        | ibuyuglyhouses.ca          | home-buyer        |
| MTC    | mtcrenovations          | mtc/repos/mtcrenovations-astro        | mtcrenovations.ca          | renovation        |
| CSS    | canadiansmartsavings    | css/repos/canadianSmartSavingsWebsite | canadiansmartsavings.ca    | hvac              |

### Phase 2 execution order

1. Shared kit (manifest + skill + ponytail template)
2. Dashboard (industry profiles, CE link map, client seeds, keyword JSON)
3. Ponytail on each client repo (vertical-specific SEO contract)
4. GSC SEO sprint per site (evidence-based — no TRG copy-paste)
5. GSC baseline sync + monthly report backfill

### SEO non-regression (all sites)

1. No URL slug changes without 301 + verify
2. No `noindex` on indexable pages
3. All build gates pass before deploy
4. Surgical title/meta only (GSC-driven)
5. Internal links → real routes only
6. Smoke-test after deploy
7. **SEO wins over cleanup**

### Deploy order

Dashboard API first → site repos → GSC sync baseline

### Deferred

- Astro 4→6 upgrades
- Repo-wide shadcn cleanup (D-002)
- hreflang unless GSC shows demand
- Blind ES/FR pages on non-TRG sites

---

## Canonical Forge docs

- `shared/knowledge-hub/seo/website-production-standard.md`
- `shared/scripts/config/domain-manifest.json`
- `trg-site/BLOG_PIPELINE.md`

---

## Phase 2 progress

| Deliverable                     | Status  |
| ------------------------------- | ------- |
| client-seo-playbook.json        | **done** — `shared/scripts/config/` |
| forge-seo-sprint skill          | **done** — `~/claude/skills/forge-seo-sprint/` |
| Dashboard industry profiles     | **done** — `abc7610` |
| CE internal link map            | **done** — `SITE_LINK_DEFAULTS` in content-engine |
| Client seeds (MHB/IBUH/MTC/CSS) | **done** — run `npx tsx scripts/seed-forge-clients.ts` |
| Ponytail on 4 client repos      | **done** — docs only, builds pass |
| Per-site GSC sprint             | **pending** — use forge-seo-sprint skill |
| Keyword import + GSC sync       | **pending** — after seed |
