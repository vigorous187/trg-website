import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import {
  consumeConfirmedAuditReceipt,
  processTallySubmissionEvent,
} from "../src/lib/tally-conversion.mjs";

const AUDIT_FORM_ID = "2Evezg";
const SYNTHETIC_SUBMISSION_ID = "synthetic_receipt_20260813";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

export function verifySyntheticTallyReceipt({ now = 1_786_647_600_000 } = {}) {
  const iframeSource = {};
  const storage = memoryStorage();
  const pageClaims = new Set();
  const dataLayer = [];
  const event = {
    origin: "https://tally.so",
    source: iframeSource,
    data: JSON.stringify({
      event: "Tally.FormSubmitted",
      payload: {
        id: SYNTHETIC_SUBMISSION_ID,
        formId: AUDIT_FORM_ID,
        formName: "Synthetic Google Audit Receipt",
      },
    }),
  };
  const options = {
    expectedSource: iframeSource,
    formId: AUDIT_FORM_ID,
    formName: "Book a Free Google Audit",
    confirmsAudit: true,
    storage,
    pageClaims,
    dataLayer,
    pagePath: "/contact/",
    now,
  };

  const first = processTallySubmissionEvent(event, options);
  const replay = processTallySubmissionEvent(event, options);
  const receipt = consumeConfirmedAuditReceipt(storage, AUDIT_FORM_ID, now + 1);
  const secondReceipt = consumeConfirmedAuditReceipt(storage, AUDIT_FORM_ID, now + 1);

  assert.ok(first, "Trusted synthetic callback was not accepted");
  assert.equal(replay, null, "Duplicate synthetic callback was accepted");
  assert.equal(dataLayer.length, 1, "Synthetic callback did not emit exactly one event");
  assert.equal(dataLayer[0].event, "generate_lead");
  assert.equal(dataLayer[0].submission_id, SYNTHETIC_SUBMISSION_ID);
  assert.equal(first.receiptStored, true, "Confirmed synthetic receipt was not stored");
  assert.equal(receipt?.submissionId, SYNTHETIC_SUBMISSION_ID);
  assert.equal(secondReceipt, null, "Synthetic receipt was not consumed exactly once");

  return {
    status: "PASS",
    mode: "isolated-local-synthetic",
    formId: AUDIT_FORM_ID,
    submissionId: SYNTHETIC_SUBMISSION_ID,
    acceptedCallbacks: 1,
    rejectedDuplicateCallbacks: 1,
    dataLayerEvents: dataLayer.length,
    receiptConsumptions: 1,
    networkRequests: 0,
    tallySubmissions: 0,
    externalWrites: 0,
  };
}

function main() {
  if (process.env.TRG_SYNTHETIC_RECEIPT_TEST !== "enabled") {
    throw new Error(
      "Synthetic receipt verifier is disabled. Set TRG_SYNTHETIC_RECEIPT_TEST=enabled only in a local or isolated preview verification session.",
    );
  }
  console.log(JSON.stringify(verifySyntheticTallyReceipt(), null, 2));
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
