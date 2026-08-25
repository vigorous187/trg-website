#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ENDPOINT = "https://api.forge-co.ca/internal/cloudflare/release-receipt";
const SITE = "torontorestaurantgrowth.ca";
const SITE_SLUG = "torontorestaurantgrowth";
const FULL_SHA = /^[0-9a-f]{40}$/;

export class ReleaseReceiptDeliveryError extends Error {
  constructor(code, { attempts = 0, httpStatus = null } = {}) {
    super(code);
    this.name = "ReleaseReceiptDeliveryError";
    this.code = code;
    this.attempts = attempts;
    this.httpStatus = httpStatus;
  }
}

function assertInputs({ secret, candidateSha, deploymentId, verifiedAt, verificationStatus }) {
  if (!secret) throw new ReleaseReceiptDeliveryError("missing_secret");
  if (verificationStatus !== "passed") {
    throw new ReleaseReceiptDeliveryError("production_not_verified");
  }
  if (!FULL_SHA.test(candidateSha || "")) {
    throw new ReleaseReceiptDeliveryError("invalid_candidate_sha");
  }
  if (!deploymentId) throw new ReleaseReceiptDeliveryError("missing_deployment_id");
  if (!verifiedAt || !Number.isFinite(Date.parse(verifiedAt))) {
    throw new ReleaseReceiptDeliveryError("invalid_verified_at");
  }
}

function acceptedResponse(value) {
  return value?.ok === true &&
    value?.site_slug === SITE_SLUG &&
    typeof value?.deployment_observation_id === "string" &&
    value.deployment_observation_id.length > 0 &&
    typeof value?.capability_receipt_id === "string" &&
    value.capability_receipt_id.length > 0 &&
    typeof value?.duplicate === "boolean";
}

export async function sendReleaseReceipt({
  secret,
  candidateSha,
  deploymentId,
  verifiedAt,
  verificationStatus,
  fetchImpl = fetch,
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  endpoint = ENDPOINT,
  maxAttempts = 3,
}) {
  assertInputs({ secret, candidateSha, deploymentId, verifiedAt, verificationStatus });
  const payload = {
    schema_version: 1,
    site: SITE,
    candidate_sha: candidateSha,
    deployment_ids: { pages: deploymentId },
    verification_status: "passed",
    verified_at: verifiedAt,
    rollback_status: "not_required",
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let response;
    try {
      response = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-release-receipt-secret": secret,
        },
        body: JSON.stringify(payload),
        redirect: "error",
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      if (attempt < maxAttempts) {
        await sleep(attempt * 1_000);
        continue;
      }
      throw new ReleaseReceiptDeliveryError("network_failure", { attempts: attempt });
    }

    const responseBody = await response.json().catch(() => null);
    if (response.ok && acceptedResponse(responseBody)) {
      return {
        attempts: attempt,
        httpStatus: response.status,
        dashboardReceipt: {
          site_slug: responseBody.site_slug,
          deployment_observation_id: responseBody.deployment_observation_id,
          capability_receipt_id: responseBody.capability_receipt_id,
          duplicate: responseBody.duplicate,
        },
      };
    }
    if (response.ok) {
      throw new ReleaseReceiptDeliveryError("invalid_response", {
        attempts: attempt,
        httpStatus: response.status,
      });
    }
    if ((response.status === 429 || response.status >= 500) && attempt < maxAttempts) {
      await sleep(attempt * 1_000);
      continue;
    }
    throw new ReleaseReceiptDeliveryError("http_failure", {
      attempts: attempt,
      httpStatus: response.status,
    });
  }
  throw new ReleaseReceiptDeliveryError("retry_limit_exhausted", { attempts: maxAttempts });
}

function nonsecretBase(env, attemptedAt) {
  return {
    schema_version: 1,
    destination: ENDPOINT,
    site: SITE,
    candidate_sha: env.RELEASE_CANDIDATE_SHA || null,
    deployment_id: env.RELEASE_DEPLOYMENT_ID || null,
    verification_status: env.RELEASE_VERIFICATION_STATUS || null,
    verified_at: env.RELEASE_VERIFIED_AT || null,
    rollback_status: "not_required",
    attempted_at: attemptedAt,
  };
}

export async function runReleaseReceiptSender({
  env = process.env,
  fetchImpl = fetch,
  writeFileImpl = writeFile,
  mkdirImpl = mkdir,
  now = () => new Date(),
  sleep,
  logger = console,
} = {}) {
  const attemptedAt = now().toISOString();
  const outputPath = env.RELEASE_RECEIPT_OUTPUT || "artifacts/release-receipt-sender.json";
  const base = nonsecretBase(env, attemptedAt);
  let artifact;
  let exitCode = 0;
  try {
    const delivered = await sendReleaseReceipt({
      secret: env.RELEASE_RECEIPT_SECRET,
      candidateSha: env.RELEASE_CANDIDATE_SHA,
      deploymentId: env.RELEASE_DEPLOYMENT_ID,
      verifiedAt: env.RELEASE_VERIFIED_AT,
      verificationStatus: env.RELEASE_VERIFICATION_STATUS,
      fetchImpl,
      sleep,
    });
    artifact = {
      ...base,
      delivery_status: "accepted",
      attempts: delivered.attempts,
      http_status: delivered.httpStatus,
      dashboard_receipt: delivered.dashboardReceipt,
    };
    logger.log(`Release receipt accepted after ${delivered.attempts} attempt(s).`);
  } catch (error) {
    const deliveryError = error instanceof ReleaseReceiptDeliveryError
      ? error
      : new ReleaseReceiptDeliveryError("unexpected_failure");
    artifact = {
      ...base,
      delivery_status: "failed",
      attempts: deliveryError.attempts,
      http_status: deliveryError.httpStatus,
      error_code: deliveryError.code,
    };
    logger.error(`Release receipt delivery failed: ${deliveryError.code}.`);
    exitCode = 1;
  }
  await mkdirImpl(path.dirname(outputPath), { recursive: true });
  await writeFileImpl(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  return { artifact, exitCode };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const result = await runReleaseReceiptSender();
  process.exitCode = result.exitCode;
}
