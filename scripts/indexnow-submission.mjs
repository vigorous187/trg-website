import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const INDEXNOW_BASE_URL = "https://torontorestaurantgrowth.ca";
export const INDEXNOW_KEY = "ae30d3d7-a441-4846-a8fc-59e36bdc205a";
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function decodeXmlText(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

export function extractLocations(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) =>
    decodeXmlText(match[1].trim()),
  );
}

export function canonicalizeUrlList(urls, baseUrl = INDEXNOW_BASE_URL) {
  const expectedOrigin = new URL(baseUrl).origin;
  const canonical = new Set();

  for (const rawUrl of urls) {
    const url = new URL(rawUrl);
    assert(url.protocol === "https:", `IndexNow URL must use HTTPS: ${rawUrl}`);
    assert(url.origin === expectedOrigin, `IndexNow URL is not same-host: ${rawUrl}`);
    assert(!url.username && !url.password, `IndexNow URL contains credentials: ${rawUrl}`);
    assert(!url.hash, `IndexNow URL contains a fragment: ${rawUrl}`);
    canonical.add(url.href);
  }

  const urlList = [...canonical].sort();
  assert(urlList.length > 0, "IndexNow URL list is empty");
  assert(urlList.length <= 10_000, "IndexNow URL list exceeds the 10,000 URL limit");
  return urlList;
}

export async function readCanonicalSitemapUrls({
  root = process.cwd(),
  baseUrl = INDEXNOW_BASE_URL,
} = {}) {
  const dist = path.join(root, "dist");
  const indexXml = await readFile(path.join(dist, "sitemap-index.xml"), "utf8");
  const sitemapUrls = canonicalizeUrlList(extractLocations(indexXml), baseUrl);
  const pageUrls = [];

  for (const sitemapUrl of sitemapUrls) {
    const pathname = new URL(sitemapUrl).pathname;
    const relativePath = pathname.replace(/^\/+/, "");
    assert(relativePath && !relativePath.includes(".."), `Unsafe sitemap path: ${pathname}`);
    const sitemapXml = await readFile(path.join(dist, relativePath), "utf8");
    pageUrls.push(...extractLocations(sitemapXml));
  }

  return canonicalizeUrlList(pageUrls, baseUrl);
}

export function buildIndexNowPayload({
  urls,
  baseUrl = INDEXNOW_BASE_URL,
  key = INDEXNOW_KEY,
} = {}) {
  const origin = new URL(baseUrl).origin;
  const urlList = canonicalizeUrlList(urls, origin);
  const payload = {
    host: new URL(origin).host,
    key,
    keyLocation: `${origin}/${key}.txt`,
    urlList,
  };
  const serialized = JSON.stringify(payload);
  return {
    payload,
    payloadSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

export async function verifyLiveIndexNowKey({
  fetchImpl = fetch,
  baseUrl = INDEXNOW_BASE_URL,
  key = INDEXNOW_KEY,
} = {}) {
  const keyUrl = `${new URL(baseUrl).origin}/${key}.txt`;
  const response = await fetchImpl(keyUrl, {
    redirect: "manual",
    signal: AbortSignal.timeout(20_000),
    headers: { "User-Agent": "TRG IndexNow release verifier" },
  });
  assert(response.status === 200, `IndexNow key returned ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  assert(
    contentType.toLowerCase().startsWith("text/plain"),
    `IndexNow key is not text/plain: ${contentType || "missing"}`,
  );
  assert((await response.text()) === `${key}\n`, "IndexNow key response is not exact");
  return keyUrl;
}

export async function submitIndexNow({
  urls,
  dryRun = false,
  fetchImpl = fetch,
  baseUrl = INDEXNOW_BASE_URL,
  key = INDEXNOW_KEY,
  releaseCommit = "local",
  now = () => new Date(),
} = {}) {
  const { payload, payloadSha256 } = buildIndexNowPayload({ urls, baseUrl, key });
  const receipt = {
    schemaVersion: 1,
    attemptedAt: now().toISOString(),
    releaseCommit,
    endpoint: INDEXNOW_ENDPOINT,
    keyLocation: payload.keyLocation,
    urlCount: payload.urlList.length,
    payloadSha256,
    mode: dryRun ? "dry-run" : "submit",
    status: dryRun ? "DRY_RUN" : "PENDING",
  };

  if (dryRun) return { receipt, payload };

  try {
    await verifyLiveIndexNowKey({ fetchImpl, baseUrl, key });
    const response = await fetchImpl(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "TRG IndexNow release submitter",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20_000),
    });
    receipt.httpStatus = response.status;
    receipt.status = response.ok ? "ACCEPTED" : "REJECTED";
    if (!response.ok) {
      const responseText = (await response.text()).slice(0, 500);
      throw new Error(`IndexNow submission returned ${response.status}: ${responseText}`);
    }
    return { receipt, payload };
  } catch (error) {
    receipt.status = "FAILED";
    receipt.error = error instanceof Error ? error.message : String(error);
    const wrapped = new Error(receipt.error);
    wrapped.receipt = receipt;
    throw wrapped;
  }
}

function argument(name, fallback = "") {
  const prefix = `--${name}=`;
  const match = process.argv.find((value) => value.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

async function writeReceipt(filePath, receipt) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const receiptPath = path.resolve(argument("receipt", "artifacts/indexnow-receipt.json"));
  const urls = await readCanonicalSitemapUrls();
  let receipt;

  try {
    const result = await submitIndexNow({
      urls,
      dryRun,
      releaseCommit: process.env.RELEASE_COMMIT || process.env.GITHUB_SHA || "local",
    });
    receipt = result.receipt;
    console.log(
      `${dryRun ? "IndexNow dry run" : "IndexNow submission accepted"}: ${receipt.urlCount} canonical URLs; payload ${receipt.payloadSha256}`,
    );
  } catch (error) {
    receipt = error.receipt || {
      schemaVersion: 1,
      attemptedAt: new Date().toISOString(),
      releaseCommit: process.env.RELEASE_COMMIT || process.env.GITHUB_SHA || "local",
      status: "FAILED",
      error: error instanceof Error ? error.message : String(error),
    };
    console.error(`IndexNow submission failed: ${receipt.error}`);
    await writeReceipt(receiptPath, receipt);
    process.exitCode = 1;
    return;
  }

  await writeReceipt(receiptPath, receipt);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await main();
}
