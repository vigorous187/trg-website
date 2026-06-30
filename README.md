# Toronto Restaurant Growth (trg-site)

Production site: https://torontorestaurantgrowth.ca

Stack: Astro 6, Tailwind 4, MDX blog, Cloudflare Pages

## Commands

- `npm install` — install dependencies
- `npm run dev` — start local dev server
- `npm run build` — production build (includes 8 SEO gates)
- `npm run preview` — preview production build locally

## Docs

- `BLOG_PIPELINE.md` — blog automation and commands
- `docs/ponytail-debt.md` — intentional shortcuts and upgrade triggers
- `.cursor/rules/ponytail.mdc` — agent operating mode for this repo

## Deploy

```bash
wrangler pages deploy dist --project-name torontorestaurantgrowth
```

See `domain-manifest.json` in `~/Developer/shared/scripts/config/`
