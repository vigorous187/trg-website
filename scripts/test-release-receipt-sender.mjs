import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runReleaseReceiptSender, sendReleaseReceipt } from "./release-receipt-sender.mjs";

const SHA = "a".repeat(40);
const DEPLOYMENT_ID = "deployment-trg-123";
const VERIFIED_AT = "2026-08-25T20:00:00.000Z";

function options(overrides = {}) {
  return {
    secret: "sender-secret",
    candidateSha: SHA,
    deploymentId: DEPLOYMENT_ID,
    verifiedAt: VERIFIED_AT,
    verificationStatus: "passed",
    ...overrides,
  };
}

function successResponse(overrides = {}) {
  return new Response(JSON.stringify({
    ok: true,
    site_slug: "torontorestaurantgrowth",
    deployment_observation_id: "observation-trg",
    capability_receipt_id: "capability-trg",
    duplicate: false,
    ...overrides,
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}

test("missing sender secret fails before any request", async () => {
  let requests = 0;
  await assert.rejects(
    () => sendReleaseReceipt(options({
      secret: "",
      fetchImpl: async () => { requests += 1; return successResponse(); },
    })),
    (error) => error.code === "missing_secret",
  );
  assert.equal(requests, 0);
});

test("sender cannot POST before exact production verification", async () => {
  let requests = 0;
  await assert.rejects(
    () => sendReleaseReceipt(options({
      verificationStatus: "failed",
      fetchImpl: async () => { requests += 1; return successResponse(); },
    })),
    (error) => error.code === "production_not_verified",
  );
  assert.equal(requests, 0);
});

test("wrong dashboard success response fails closed", async () => {
  await assert.rejects(
    () => sendReleaseReceipt(options({
      fetchImpl: async () => successResponse({ site_slug: "canadiansmartsavings" }),
    })),
    (error) => error.code === "invalid_response" && error.httpStatus === 200,
  );
});

test("transient delivery retries are bounded", async () => {
  let requests = 0;
  const delays = [];
  await assert.rejects(
    () => sendReleaseReceipt(options({
      fetchImpl: async () => { requests += 1; return new Response("unavailable", { status: 503 }); },
      sleep: async (milliseconds) => { delays.push(milliseconds); },
    })),
    (error) => error.code === "http_failure" && error.attempts === 3,
  );
  assert.equal(requests, 3);
  assert.deepEqual(delays, [1_000, 2_000]);
});

test("accepted delivery sends the exact verified production identity", async () => {
  let request;
  const delivered = await sendReleaseReceipt(options({
    fetchImpl: async (input, init) => {
      request = { input: String(input), init };
      return successResponse();
    },
  }));
  assert.equal(request.input, "https://api.forge-co.ca/internal/cloudflare/release-receipt");
  assert.equal(request.init.method, "POST");
  assert.equal(request.init.redirect, "error");
  assert.equal(request.init.headers["x-release-receipt-secret"], "sender-secret");
  assert.deepEqual(JSON.parse(request.init.body), {
    schema_version: 1,
    site: "torontorestaurantgrowth.ca",
    candidate_sha: SHA,
    deployment_ids: { pages: DEPLOYMENT_ID },
    verification_status: "passed",
    verified_at: VERIFIED_AT,
    rollback_status: "not_required",
  });
  assert.equal(delivered.dashboardReceipt.site_slug, "torontorestaurantgrowth");
});

test("failure artifact and logs omit the secret and provider response", async () => {
  const secret = "high-entropy-sender-secret";
  const logs = [];
  let written = "";
  const result = await runReleaseReceiptSender({
    env: {
      RELEASE_RECEIPT_SECRET: secret,
      RELEASE_CANDIDATE_SHA: SHA,
      RELEASE_DEPLOYMENT_ID: DEPLOYMENT_ID,
      RELEASE_VERIFIED_AT: VERIFIED_AT,
      RELEASE_VERIFICATION_STATUS: "passed",
      RELEASE_RECEIPT_OUTPUT: "artifacts/test-release-receipt.json",
    },
    fetchImpl: async () => new Response(
      JSON.stringify({ error: `provider rejected ${secret}` }),
      { status: 400 },
    ),
    mkdirImpl: async () => {},
    writeFileImpl: async (_target, value) => { written = value; },
    logger: {
      log: (message) => logs.push(message),
      error: (message) => logs.push(message),
    },
  });
  assert.equal(result.exitCode, 1);
  assert.equal(result.artifact.delivery_status, "failed");
  assert.equal(written.includes(secret), false);
  assert.equal(logs.join("\n").includes(secret), false);
  assert.equal(written.includes("provider rejected"), false);
});

test("workflow resolves exact deployment and sends only after verified production", async () => {
  const workflow = await readFile(".github/workflows/deploy.yml", "utf8");
  const verification = workflow.indexOf("id: production_verify");
  const rollback = workflow.indexOf("name: Roll back to last-known-good");
  const sender = workflow.indexOf("id: release_receipt");
  assert.ok(verification > 0 && rollback > verification && sender > rollback);
  assert.match(workflow, /id: deployed/);
  assert.match(workflow, /canonical_deployment\.deployment_trigger\.metadata\.commit_hash/);
  assert.match(workflow, /has\("commit_dirty"\)/);
  assert.match(workflow, /steps\.deployed\.outcome == 'failure'/);
  assert.match(workflow, /RELEASE_DEPLOYMENT_ID: \$\{\{ steps\.deployed\.outputs\.deployment_id \}\}/);
  assert.match(workflow, /RELEASE_VERIFICATION_STATUS: \$\{\{ steps\.production_verify\.outputs\.verification_status \}\}/);
  assert.match(workflow, /RELEASE_RECEIPT_SECRET: \$\{\{ secrets\.RELEASE_RECEIPT_SECRET \}\}/);
  assert.match(workflow, /name: trg-forge-release-receipt-/);
  assert.match(workflow, /retention-days: 90/);
  const senderBlock = workflow.slice(
    workflow.lastIndexOf("- name: Send exact verified", sender),
    workflow.indexOf("- name: Retain Forge", sender),
  );
  assert.match(senderBlock, /if: \$\{\{ steps\.production_verify\.outcome == 'success' \}\}/);
  assert.match(senderBlock, /continue-on-error: true/);
});
