# Measurement and release contract

## Confirmed conversions

The site counts `generate_lead` only when the embedded Tally frame sends the official [`Tally.FormSubmitted` `postMessage`](https://developers.tally.so/widgets/events). The listener requires all of the following:

- exact origin `https://tally.so`;
- the message source is the known iframe on the page;
- the payload form ID matches the iframe's allowed canonical form ID (`2Evezg` or `Xxg9Kd`); and
- the payload contains a valid unique Tally submission ID.

The submission ID is stored in `sessionStorage` and forwarded to the GTM `dataLayer` as `submission_id`. A repeated message for the same submission cannot create a second `generate_lead` event in that browser session. Email links emit `email_click` without sending the email address.

The thank-you page never emits `generate_lead`. Its confirmed copy appears only after consuming a fresh, one-time receipt written by the verified audit-form callback. A direct visit receives neutral copy and is not counted.

## IndexNow

The public IndexNow key is `ae30d3d7-a441-4846-a8fc-59e36bdc205a`. Both source and built files must return that exact value plus one newline. A homepage fallback, HTML body, redirect, or different status is a failure even if the URL returns content.

## Automated gates

- `npm run test:measurement-contract` tests origin/form allowlists, success-only parsing, unique-ID deduplication, safe thank-you receipts, the IndexNow source key, production verification, and rollback request construction.
- `npm run build` also checks the built analytics, metadata, thank-you, and IndexNow contracts.
- Pull requests run the focused tests, every existing build/SEO gate, and a read-only baseline check of current production.
- The manual production workflow captures the current successful Cloudflare Pages deployment, deploys, performs critical release checks, and invokes [Cloudflare's official rollback endpoint](https://developers.cloudflare.com/api/typescript/resources/pages/subresources/projects/subresources/deployments/methods/rollback) if release verification fails.

## Verification status and blockers

Highest gate: **Launch Ready — NOT VERIFIED**.

| Area | Result | Evidence / blocker |
| --- | --- | --- |
| Local callback and dedupe contract | PASS after tests | Synthetic official-shape messages only; no real form submitted. |
| Tally submission delivery | NOT TESTED | Requires an authorized uniquely marked Tally submission and access to verify it in Tally. |
| Tally webhook delivery/retries | NOT TESTED | No webhook endpoint or Tally webhook configuration was inspected or changed. A webhook is required for server-side reconciliation independent of the browser. |
| GTM dataLayer event | PASS after build | Compiled contract contains one success-only `generate_lead`. |
| GA4 destination and conversion marking | NOT VERIFIED | GTM container access and GA4 DebugView/property access are required to prove the tag fires once and that `generate_lead` is configured as a key event. |
| Consent behavior | NOT VERIFIED | Existing denied defaults were preserved. Consent policy and CMP selection require owner/legal approval. |
| Production release behavior | NOT TESTED | No push or deployment was authorized. Release verification will run only after an approved deployment. |
| Rollback | DRY-RUN ONLY | Request URL/method are tested; no live rollback was performed. |

An end-to-end test needs an approved test identity, unique marker, Tally submission access, GTM Preview or GA4 DebugView access, and a decision about retaining or deleting the test record.
