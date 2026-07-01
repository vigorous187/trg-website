# Local preview — Phase 2 SEO sprints

**Not deployed to production.** Review changes locally before any publish.

## Preview URLs (running now)

Cloudflare-hybrid sites use **`npm run dev`**, not `preview`.

| Site | URL | Local commit |
|------|-----|--------------|
| Michael the Home Buyer | http://127.0.0.1:4321/ | `7f10e05` |
| I Buy Ugly Houses | http://127.0.0.1:4322/ | `2eb3acc` |
| MTC Renovations | http://127.0.0.1:4323/ | `feee8a9` |
| Canadian Smart Savings | http://127.0.0.1:4324/ | `cf4f670` |

Restart commands:

```bash
# MHB, IBUH, MTC — dev
cd ~/Developer/mhb/repos/michael-the-homebuyer-astro && npm run dev -- --port 4321 --host 127.0.0.1
cd ~/Developer/mhb/repos/ibuyuglyhouses-astro && npm run dev -- --port 4322 --host 127.0.0.1
cd ~/Developer/mtc/repos/mtcrenovations-astro && npm run dev -- --port 4323 --host 127.0.0.1
# CSS — static preview
cd ~/Developer/css/repos/canadianSmartSavingsWebsite && npm run preview -- --port 4324 --host 127.0.0.1
```

## What changed (local commits only)

### MHB

- Homepage: keyword subhead, title/meta, “we buy houses Hamilton” in body
- Blog: `sell-house-fast-hamilton-2026.md` frontmatter

### IBUH

- Homepage: meta + “we buy ugly houses in Ontario” subhead
- Blog: `sell-ugly-house-meaning-ontario.md` frontmatter

### MTC

- Homepage: contractor subhead + title/meta
- Kitchen service meta in `services.json`
- Blog: fixed `/basement/` link

### CSS

- Homepage: HVAC rebates title/meta + subhead
- Blog: `heat-pump-readiness-ontario-homes.md` frontmatter

## Dashboard (done, not a site deploy)

- Clients seeded: MHB, IBUH, MTC, CSS
- Keywords imported (8 each)
- Portal: https://dashboard.forge-co.ca/admin/clients

## Revert local sprint commits

See [REVERT-SNAPSHOT.md](./REVERT-SNAPSHOT.md). Per-repo:

```bash
git log -1 --oneline   # note commit before sprint
git reset --hard HEAD~1
```

**Do not push MTC** until approved — GitHub Actions auto-deploys.
