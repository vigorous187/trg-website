const TALLY_SUBMITTED_EVENT = "Tally.FormSubmitted";
const SUBMISSION_ID_PATTERN = /^[A-Za-z0-9_-]{6,128}$/;
const DEDUPE_PREFIX = "trg:tally-generate-lead:";
const RECEIPT_KEY = "trg:tally-confirmed-audit";
const RECEIPT_MAX_AGE_MS = 30 * 60 * 1000;

export const TALLY_MESSAGE_ORIGINS = ["https://tally.so"];

export function parseTallySubmissionMessage(
  event,
  { allowedOrigins = TALLY_MESSAGE_ORIGINS, allowedFormIds = [] } = {},
) {
  if (!allowedOrigins.includes(event?.origin) || typeof event?.data !== "string") {
    return null;
  }
  if (!event.data.includes(TALLY_SUBMITTED_EVENT)) return null;

  let message;
  try {
    message = JSON.parse(event.data);
  } catch {
    return null;
  }

  if (message?.event !== TALLY_SUBMITTED_EVENT) return null;
  const payload = message.payload;
  const submissionId = typeof payload?.id === "string" ? payload.id.trim() : "";
  const formId = typeof payload?.formId === "string" ? payload.formId.trim() : "";
  if (
    !SUBMISSION_ID_PATTERN.test(submissionId) ||
    !allowedFormIds.includes(formId)
  ) {
    return null;
  }

  return {
    submissionId,
    formId,
    formName:
      typeof payload.formName === "string" && payload.formName.trim()
        ? payload.formName.trim()
        : formId,
  };
}

export function claimTallySubmission(storage, submissionId) {
  if (!storage || !SUBMISSION_ID_PATTERN.test(submissionId)) return false;
  const key = `${DEDUPE_PREFIX}${submissionId}`;
  try {
    if (storage.getItem(key)) return false;
    storage.setItem(key, "1");
    return true;
  } catch {
    return true;
  }
}

export function buildGenerateLeadEvent(submission, context) {
  if (!submission) return null;
  return {
    event: "generate_lead",
    form_id: submission.formId,
    form_name: context.formName || submission.formName,
    submission_id: submission.submissionId,
    event_id: `${submission.submissionId}.generate_lead`,
    lead_source: "tally_embed",
    page_path: context.pagePath,
  };
}

export function pushGenerateLeadEvent(dataLayer, analyticsEvent) {
  if (!analyticsEvent || !Array.isArray(dataLayer)) return false;
  dataLayer.push(analyticsEvent);
  return true;
}

export function processTallySubmissionEvent(
  event,
  {
    expectedSource,
    formId,
    formName,
    confirmsAudit = false,
    storage,
    pageClaims,
    dataLayer,
    measurementConsent = false,
    pagePath,
    now = Date.now(),
  } = {},
) {
  if (!expectedSource || event?.source !== expectedSource) return null;
  if (!pageClaims) return null;

  const submission = parseTallySubmissionMessage(event, {
    allowedFormIds: [formId],
  });
  if (!submission || pageClaims.has(submission.submissionId)) return null;
  if (!claimTallySubmission(storage, submission.submissionId)) return null;

  pageClaims.add(submission.submissionId);
  const receiptStored = confirmsAudit
    ? storeConfirmedAuditReceipt(storage, submission, now)
    : false;
  const analyticsEvent = buildGenerateLeadEvent(submission, {
    formName,
    pagePath,
  });
  const pushed =
    measurementConsent === true &&
    pushGenerateLeadEvent(dataLayer, analyticsEvent);

  return {
    submission,
    analyticsEvent: pushed ? analyticsEvent : null,
    receiptStored,
  };
}

export function storeConfirmedAuditReceipt(storage, submission, now = Date.now()) {
  if (!storage || !submission) return false;
  try {
    storage.setItem(
      RECEIPT_KEY,
      JSON.stringify({
        submissionId: submission.submissionId,
        formId: submission.formId,
        confirmedAt: now,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export function consumeConfirmedAuditReceipt(
  storage,
  allowedFormId,
  now = Date.now(),
) {
  if (!storage) return null;
  let raw;
  try {
    raw = storage.getItem(RECEIPT_KEY);
    storage.removeItem(RECEIPT_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const receipt = JSON.parse(raw);
    return receipt?.formId === allowedFormId &&
      SUBMISSION_ID_PATTERN.test(receipt?.submissionId || "") &&
      Number.isFinite(receipt?.confirmedAt) &&
      now - receipt.confirmedAt >= 0 &&
      now - receipt.confirmedAt <= RECEIPT_MAX_AGE_MS
      ? receipt
      : null;
  } catch {
    return null;
  }
}
