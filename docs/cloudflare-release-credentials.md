# Cloudflare release credentials

The manual production workflow requires two separate GitHub Actions secrets.

- `CLOUDFLARE_API_TOKEN`: Pages deployment token. Keep it limited to the existing Cloudflare Pages operations; do not grant Zaraz permissions. The workflow exposes it only to Pages capture, deployment, and rollback steps.
- `CLOUDFLARE_ZARAZ_READ_TOKEN`: Zaraz preflight token. Grant only **Zaraz Read** and restrict the token resource to the `torontorestaurantgrowth.com` zone. The workflow exposes it only to a read-only `GET /zones/{zone_id}/settings/zaraz/config` request.

The Zaraz token is required and the release fails closed when it is missing, unauthorized, or when the live configuration violates the consent contract. Neither secret belongs in repository files, logs, prompts, or pull-request configuration.
