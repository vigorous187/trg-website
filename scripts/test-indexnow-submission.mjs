import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  INDEXNOW_ENDPOINT,
  INDEXNOW_KEY,
  buildIndexNowPayload,
  canonicalizeUrlList,
  submitIndexNow,
  verifyLiveIndexNowKey,
} from "./indexnow-submission.mjs";

const BASE_URL = "https://torontorestaurantgrowth.ca";

test("canonical URL contract rejects cross-host and fragment URLs", () => {
  assert.throws(
    () => canonicalizeUrlList(["https://example.com/contact/"], BASE_URL),
    /not same-host/,
  );
  assert.throws(
    () => canonicalizeUrlList([`${BASE_URL}/contact/#form`], BASE_URL),
    /fragment/,
  );
});

test("payload is stable, unique, sorted, and bound to the public key", () => {
  const result = buildIndexNowPayload({
    urls: [`${BASE_URL}/contact/`, `${BASE_URL}/`, `${BASE_URL}/contact/`],
  });
  assert.deepEqual(result.payload, {
    host: "torontorestaurantgrowth.ca",
    key: INDEXNOW_KEY,
    keyLocation: `${BASE_URL}/${INDEXNOW_KEY}.txt`,
    urlList: [`${BASE_URL}/`, `${BASE_URL}/contact/`],
  });
  assert.match(result.payloadSha256, /^[0-9a-f]{64}$/);
});

test("dry run performs no network request and returns a receipt", async () => {
  let requests = 0;
  const result = await submitIndexNow({
    urls: [`${BASE_URL}/`],
    dryRun: true,
    fetchImpl: async () => {
      requests += 1;
      throw new Error("network must not run");
    },
    releaseCommit: "test-sha",
    now: () => new Date("2026-08-13T18:00:00.000Z"),
  });
  assert.equal(requests, 0);
  assert.equal(result.receipt.status, "DRY_RUN");
  assert.equal(result.receipt.releaseCommit, "test-sha");
});

test("submission verifies the exact live text key before posting", async () => {
  const requests = [];
  const result = await submitIndexNow({
    urls: [`${BASE_URL}/`, `${BASE_URL}/contact/`],
    fetchImpl: async (url, options = {}) => {
      requests.push({ url, options });
      if (url === `${BASE_URL}/${INDEXNOW_KEY}.txt`) {
        return new Response(`${INDEXNOW_KEY}\n`, {
          status: 200,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
      assert.equal(url, INDEXNOW_ENDPOINT);
      return new Response("", { status: 202 });
    },
  });
  assert.equal(requests.length, 2);
  assert.equal(requests[1].options.method, "POST");
  assert.equal(result.receipt.status, "ACCEPTED");
  assert.equal(result.receipt.httpStatus, 202);
});

test("live key proof rejects an HTML fallback before submission", async () => {
  await assert.rejects(
    verifyLiveIndexNowKey({
      fetchImpl: async () =>
        new Response("<html>fallback</html>", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        }),
    }),
    /not text\/plain/,
  );
});

test("workflow alerts on IndexNow failure without making it a rollback condition", async () => {
  const workflow = await readFile(
    new URL("../.github/workflows/deploy.yml", import.meta.url),
    "utf8",
  );
  assert.match(workflow, /id: indexnow_submit/);
  assert.match(workflow, /steps\.production_verify\.outcome == 'success'/);
  assert.match(workflow, /continue-on-error: true/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.match(workflow, /steps\.indexnow_submit\.outcome == 'failure'/);
  assert.match(
    workflow,
    /steps\.production_verify\.outcome == 'failure'/,
    "rollback must remain limited to critical production verification failure",
  );
  assert.ok(
    workflow.indexOf("Roll back to last-known-good deployment") <
      workflow.indexOf("Submit canonical release URLs to IndexNow"),
    "IndexNow must run only after the rollback-sensitive release verification",
  );
});
