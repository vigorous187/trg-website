# Local preview — Phase 2 SEO sprints

**Not deployed to production.** Review changes locally before any publish.

## Preview URLs (after running builds)

| Site                   | Command                                                                                  | URL                    |
| ---------------------- | ---------------------------------------------------------------------------------------- | ---------------------- |
| Michael the Home Buyer | `cd ~/Developer/mhb/repos/michael-the-homebuyer-astro && npm run preview -- --port 4321` | http://localhost:4321/ |
| I Buy Ugly Houses      | `cd ~/Developer/mhb/repos/ibuyuglyhouses-astro && npm run preview -- --port 4322`        | http://localhost:4322/ |
| MTC Renovations        | `cd ~/Developer/mtc/repos/mtcrenovations-astro && npm run preview -- --port 4323`        | http://localhost:4323/ |
| Canadian Smart Savings | `cd ~/Developer/css/repos/canadianSmartSavingsWebsite && npm run preview -- --port 4324` | http://localhost:4324/ |
| TRG (reference)        | `cd ~/Developer/forge/repos/trg-site && npm run preview -- --port 4325`                  | http://localhost:4325/ |

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
