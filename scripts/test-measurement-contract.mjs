import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildGenerateLeadEvent,
  claimTallySubmission,
  consumeConfirmedAuditReceipt,
  parseTallySubmissionMessage,
  processTallySubmissionEvent,
  storeConfirmedAuditReceipt,
} from "../src/lib/tally-conversion.mjs";
import { verifySyntheticTallyReceipt } from "./verify-synthetic-tally-receipt.mjs";
import {
  buildRollbackRequest,
  selectLastKnownGoodDeployment,
  verifyProduction,
} from "./post-deploy-safety.mjs";

const AUDIT_FORM_ID = "2Evezg";
const LEAD_MAGNET_FORM_ID = "Xxg9Kd";
const INDEXNOW_KEY = "ae30d3d7-a441-4846-a8fc-59e36bdc205a";

function tallyEvent(overrides = {}) {
  return {
    origin: "https://tally.so",
    data: JSON.stringify({
      event: "Tally.FormSubmitted",
      payload: {
        id: "submission_abc123",
        formId: AUDIT_FORM_ID,
        formName: "Book a Free Google Audit",
      },
    }),
    ...overrides,
  };
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

function response(status, body) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html" },
  });
}

test("accepts only the official Tally success message from an allowed origin and form", () => {
  const parsed = parseTallySubmissionMessage(tallyEvent(), {
    allowedFormIds: [AUDIT_FORM_ID],
  });
  assert.deepEqual(parsed, {
    submissionId: "submission_abc123",
    formId: AUDIT_FORM_ID,
    formName: "Book a Free Google Audit",
  });
  assert.equal(
    parseTallySubmissionMessage(tallyEvent({ origin: "https://example.com" }), {
      allowedFormIds: [AUDIT_FORM_ID],
    }),
    null,
  );
  assert.equal(
    parseTallySubmissionMessage(tallyEvent(), { allowedFormIds: ["wrong"] }),
    null,
  );
  assert.equal(
    parseTallySubmissionMessage(
      {
        origin: "https://tally.so",
        data: JSON.stringify({
          event: "Tally.FormPageView",
          payload: { id: "submission_abc123", formId: AUDIT_FORM_ID },
        }),
      },
      { allowedFormIds: [AUDIT_FORM_ID] },
    ),
    null,
  );
});

test("one Tally submission ID produces one generate_lead claim", () => {
  const storage = memoryStorage();
  const parsed = parseTallySubmissionMessage(tallyEvent(), {
    allowedFormIds: [AUDIT_FORM_ID],
  });
  assert.equal(claimTallySubmission(storage, parsed.submissionId), true);
  assert.equal(claimTallySubmission(storage, parsed.submissionId), false);
  assert.deepEqual(
    buildGenerateLeadEvent(parsed, {
      formName: "Book a Free Google Audit",
      pagePath: "/contact/",
    }),
    {
      event: "generate_lead",
      form_id: AUDIT_FORM_ID,
      form_name: "Book a Free Google Audit",
      submission_id: "submission_abc123",
      lead_source: "tally_embed",
      page_path: "/contact/",
    },
  );
});

test("accepts the canonical lead-magnet form ID", () => {
  const event = tallyEvent();
  const message = JSON.parse(event.data);
  message.payload.formId = LEAD_MAGNET_FORM_ID;
  assert.equal(
    parseTallySubmissionMessage(
      { ...event, data: JSON.stringify(message) },
      { allowedFormIds: [LEAD_MAGNET_FORM_ID] },
    )?.formId,
    LEAD_MAGNET_FORM_ID,
  );
});

test("thank-you confirmation requires a fresh verified receipt and consumes it once", () => {
  const storage = memoryStorage();
  const submission = {
    submissionId: "submission_abc123",
    formId: AUDIT_FORM_ID,
  };
  assert.equal(consumeConfirmedAuditReceipt(storage, AUDIT_FORM_ID, 1_000), null);
  assert.equal(storeConfirmedAuditReceipt(storage, submission, 1_000), true);
  assert.deepEqual(consumeConfirmedAuditReceipt(storage, AUDIT_FORM_ID, 2_000), {
    ...submission,
    confirmedAt: 1_000,
  });
  assert.equal(consumeConfirmedAuditReceipt(storage, AUDIT_FORM_ID, 2_000), null);

  storeConfirmedAuditReceipt(storage, submission, 1_000);
  assert.equal(
    consumeConfirmedAuditReceipt(storage, AUDIT_FORM_ID, 31 * 60 * 1_000),
    null,
  );
});

test("trusted callback integration emits and receipts exactly once without downstream effects", () => {
  assert.deepEqual(verifySyntheticTallyReceipt(), {
    status: "PASS",
    mode: "isolated-local-synthetic",
    formId: AUDIT_FORM_ID,
    submissionId: "synthetic_receipt_20260813",
    acceptedCallbacks: 1,
    rejectedDuplicateCallbacks: 1,
    dataLayerEvents: 1,
    receiptConsumptions: 1,
    networkRequests: 0,
    tallySubmissions: 0,
    externalWrites: 0,
  });
});

test("trusted callback integration rejects a different iframe source", () => {
  const storage = memoryStorage();
  const result = processTallySubmissionEvent(
    { ...tallyEvent(), source: {} },
    {
      expectedSource: {},
      formId: AUDIT_FORM_ID,
      storage,
      pageClaims: new Set(),
      dataLayer: [],
      pagePath: "/contact/",
    },
  );
  assert.equal(result, null);
});

test("IndexNow source key is exact", async () => {
  const key = await readFile(
    new URL(`../public/${INDEXNOW_KEY}.txt`, import.meta.url),
    "utf8",
  );
  assert.equal(key, `${INDEXNOW_KEY}\n`);
});

test("production verification covers metadata, Tally success, IndexNow, crawl files, and 404", async () => {
  const fetchImpl = async (url) => {
    const path = new URL(url).pathname;
    if (path === "/") {
      return response(
        200,
        `<title>Toronto Restaurant Growth</title><meta name="description" content="Restaurant marketing"><link rel="canonical" href="https://torontorestaurantgrowth.ca/"><script>GTM-WH4XSW4L;event: 'email_click'</script>`,
      );
    }
    if (path === "/contact/") {
      return response(
        200,
        '<title>Contact</title><meta name="description" content="Contact TRG"><link rel="canonical" href="https://torontorestaurantgrowth.ca/contact/"><iframe src="https://tally.so/embed/2Evezg" data-tally-form-id="2Evezg"></iframe><script src="/_astro/tally.js"></script>',
      );
    }
    if (path === "/resources/google-review-response-templates/") {
      return response(
        200,
        '<title>Review templates</title><meta name="description" content="Review templates"><link rel="canonical" href="https://torontorestaurantgrowth.ca/resources/google-review-response-templates/"><iframe src="https://tally.so/embed/Xxg9Kd" data-tally-form-id="Xxg9Kd"></iframe>',
      );
    }
    if (path === "/_astro/tally.js") {
      return response(
        200,
        'import { track } from "./tally-contract.js";track();',
      );
    }
    if (path === "/_astro/tally-contract.js") {
      return response(
        200,
        'const origin="https://tally.so";const event="Tally.FormSubmitted";dataLayer.push({event:"generate_lead",submission_id:"id"})',
      );
    }
    if (path === "/contact/thank-you/") {
      return response(
        200,
        '<meta name="robots" content="noindex, follow"><link rel="canonical" href="https://torontorestaurantgrowth.ca/contact/">',
      );
    }
    if (path === "/robots.txt") {
      return response(
        200,
        "Sitemap: https://torontorestaurantgrowth.ca/sitemap-index.xml",
      );
    }
    if (path === "/sitemap-index.xml") {
      return response(200, "<sitemapindex></sitemapindex>");
    }
    if (path === `/${INDEXNOW_KEY}.txt`) {
      return response(200, `${INDEXNOW_KEY}\n`);
    }
    if (path === "/release.json") {
      return response(200, JSON.stringify({ commit: "release-sha", branch: "main" }));
    }
    if (path.startsWith("/__trg_post_deploy_")) return response(404, "not found");
    return response(500, "unexpected");
  };

  const result = await verifyProduction({ fetchImpl, expectedCommit: "release-sha" });
  assert.equal(result.checks.length, 13);
});

test("production verification fails closed on a different release commit", async () => {
  const fetchImpl = async (url) => {
    const path = new URL(url).pathname;
    if (path === "/") return response(200, '<title>Toronto Restaurant Growth</title><meta name="description" content="Restaurant marketing"><link rel="canonical" href="https://torontorestaurantgrowth.ca/"><script>GTM-WH4XSW4L;event: \'email_click\'</script>');
    if (path === "/contact/") return response(200, '<title>Contact</title><meta name="description" content="Contact TRG"><link rel="canonical" href="https://torontorestaurantgrowth.ca/contact/"><iframe src="https://tally.so/embed/2Evezg" data-tally-form-id="2Evezg"></iframe><script src="/_astro/tally.js"></script>');
    if (path === "/resources/google-review-response-templates/") return response(200, '<title>Review templates</title><meta name="description" content="Review templates"><link rel="canonical" href="https://torontorestaurantgrowth.ca/resources/google-review-response-templates/"><iframe src="https://tally.so/embed/Xxg9Kd" data-tally-form-id="Xxg9Kd"></iframe>');
    if (path === "/_astro/tally.js") return response(200, 'const origin="https://tally.so";const event="Tally.FormSubmitted";dataLayer.push({event:"generate_lead",submission_id:"id"})');
    if (path === "/contact/thank-you/") return response(200, '<meta name="robots" content="noindex, follow"><link rel="canonical" href="https://torontorestaurantgrowth.ca/contact/">');
    if (path === "/robots.txt") return response(200, "Sitemap: https://torontorestaurantgrowth.ca/sitemap-index.xml");
    if (path === "/sitemap-index.xml") return response(200, "<sitemapindex></sitemapindex>");
    if (path === `/${INDEXNOW_KEY}.txt`) return response(200, `${INDEXNOW_KEY}\n`);
    if (path === "/release.json") return response(200, JSON.stringify({ commit: "wrong-sha", branch: "main" }));
    if (path.startsWith("/__trg_post_deploy_")) return response(404, "not found");
    return response(500, "unexpected");
  };

  await assert.rejects(
    verifyProduction({ fetchImpl, expectedCommit: "expected-sha" }),
    /Expected release expected-sha, found wrong-sha/,
  );
});

test("rollback targets the current successful production deployment", () => {
  const selected = selectLastKnownGoodDeployment([
    { id: "preview", environment: "preview", latest_stage: { status: "success" } },
    { id: "failed", environment: "production", latest_stage: { status: "failure" } },
    { id: "good", environment: "production", latest_stage: { status: "success" } },
  ]);
  assert.equal(selected.id, "good");

  const request = buildRollbackRequest({
    accountId: "account",
    apiToken: "test-token",
    projectName: "torontorestaurantgrowth",
    deploymentId: "good",
  });
  assert.equal(request.options.method, "POST");
  assert.equal(
    request.url,
    "https://api.cloudflare.com/client/v4/accounts/account/pages/projects/torontorestaurantgrowth/deployments/good/rollback",
  );
});

test("production workflow releases only the exact current main tip", async () => {
  const workflow = await readFile(".github/workflows/deploy.yml", "utf8");

  assert.match(workflow, /\[\[ "\$\{\{ inputs\.source_commit \}\}" =~ \^\[0-9a-f\]\{40\}\$ \]\]/);
  assert.match(
    workflow,
    /\+refs\/heads\/main:refs\/remotes\/origin\/main/,
  );
  assert.match(
    workflow,
    /test "\$\(git rev-parse HEAD\)" = "\$\{\{ inputs\.source_commit \}\}"/,
  );
  assert.match(
    workflow,
    /test "\$\(git rev-parse origin\/main\)" = "\$\{\{ inputs\.source_commit \}\}"/,
  );
  assert.doesNotMatch(workflow, /merge-base --is-ancestor/);

  assert.match(workflow, /post-deploy-safety\.mjs rollback --deployment-id=/);
  assert.match(workflow, /post-deploy-safety\.mjs verify --profile=baseline/);
  assert.match(workflow, /npm run indexnow:submit/);
  assert.match(workflow, /trg-indexnow-\$\{\{ inputs\.source_commit \}\}/);
});
