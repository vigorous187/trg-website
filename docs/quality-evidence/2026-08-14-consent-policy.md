# Website quality evidence report

Project/environment: Toronto Restaurant Growth — isolated pull-request candidate

Release/build: `codex/consent-trg-20260814`  Reviewer/date: Codex / 2026-08-14

Gate: LAUNCH READY

Overall result: NOT VERIFIED

Representative URLs and templates: `/`, `/contact/`, `/privacy/`, shared `BaseLayout`

## Evidence register

| Area | Check | Result | URL/template | Tool or method | Evidence | Owner/follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| Build | Production build and repository gates | PASS | All | `npm ci`, `npm run build` | Full gate output, 2026-08-14 | Codex |
| Accessibility | Accept/Reject dialog and persistent choices | PASS | Shared layout | Native buttons, labelled dialog, focus return, Escape after a choice, visible focus | Deterministic test plus local browser keyboard check | Production assistive-technology check remains |
| Responsive | Consent UI at 320px | PASS | Shared layout | Local browser at 320 CSS px; no horizontal overflow | Local preview, 2026-08-14 | 200% zoom remains untested |
| Functionality | Existing Tally forms and receipts | PASS | Contact/embed | Business receipt remains independent; measurement only after consent | Measurement contract tests | Authorized live receipt remains |
| Analytics/privacy | Repository-controlled GTM and withdrawal | PASS | Shared layout | Deterministic ordering, persistence, denial, exactly-once and no-PII tests | `scripts/consent-contract.test.mjs` | Production network acceptance remains |
| Analytics/privacy | Cloudflare Zaraz before choice | FAIL | Production zone | Read-only Cloudflare API configuration audit | `autoInjectScript: true`; no tools currently configured | Owner must disable auto-injection to satisfy the no-Zaraz-before-choice policy |
| Operations | Exact-SHA release, rollback and IndexNow | PASS | Workflow | Existing guarded workflow unchanged | `.github/workflows/deploy.yml` | This PR does not deploy |

## Exceptions and blockers

- Approved exceptions: none.
- Failed mandatory requirements: Cloudflare Zaraz currently auto-injects its client even though no TRG tools are configured.
- Untested mandatory requirements: production network acceptance before/after choice, 200% zoom/assistive-technology acceptance, authorized end-to-end conversion receipt.

## Approval

Prepared by/date: Codex / 2026-08-14

Approved by/role/date: Policy choice approved by owner / 2026-08-14; production acceptance pending.
