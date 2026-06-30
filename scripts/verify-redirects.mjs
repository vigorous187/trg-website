/**
 * Verify the three known Astro redirect pages.
 *
 * Default: build-time check of dist/ meta-refresh targets.
 * --live:   fetch production and assert redirect + Location header.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");
const SITE = "https://torontorestaurantgrowth.ca";

const REDIRECTS = [
  {
    from: "/locations/brampton/",
    to: "/locations/restaurant-marketing-brampton/",
  },
  {
    from: "/locations/scarborough/",
    to: "/locations/restaurant-marketing-scarborough/",
  },
  {
    from: "/services/review-management/",
    to: "/services/restaurant-review-management/",
  },
];

function distHtmlForPath(urlPath) {
  const trimmed = urlPath.replace(/^\/|\/$/g, "");
  return path.join(DIST, trimmed, "index.html");
}

function extractMetaRefreshUrl(html) {
  const m = html.match(
    /<meta\s+http-equiv=["']refresh["']\s+content=["']([^"']+)["']/i,
  );
  if (!m) return null;
  const urlMatch = m[1].match(/url=(.+)$/i);
  return urlMatch ? urlMatch[1].trim() : null;
}

function normalizePath(p) {
  if (!p.startsWith("/")) return p;
  return p.endsWith("/") ? p : `${p}/`;
}

async function verifyBuildTime() {
  const failures = [];

  for (const { from, to } of REDIRECTS) {
    const file = distHtmlForPath(from);
    let html;
    try {
      html = await readFile(file, "utf8");
    } catch {
      failures.push(`${from}: missing ${path.relative(ROOT, file)}`);
      continue;
    }

    const target = extractMetaRefreshUrl(html);
    if (!target) {
      failures.push(`${from}: no meta-refresh redirect in built HTML`);
      continue;
    }

    const expected = normalizePath(to);
    const actual = normalizePath(
      target.startsWith("http") ? new URL(target).pathname : target,
    );

    if (actual !== expected) {
      failures.push(`${from}: expected ${expected}, got ${actual}`);
    }
  }

  return failures;
}

async function verifyLive() {
  const failures = [];

  for (const { from, to } of REDIRECTS) {
    const url = `${SITE}${from}`;
    let res;
    try {
      res = await fetch(url, { redirect: "manual" });
    } catch (e) {
      failures.push(`${from}: fetch failed (${e.message})`);
      continue;
    }

    if (![301, 302, 307, 308].includes(res.status)) {
      failures.push(`${from}: expected redirect status, got ${res.status}`);
      continue;
    }

    const location = res.headers.get("location");
    if (!location) {
      failures.push(`${from}: missing Location header`);
      continue;
    }

    const expected = new URL(to, SITE).href;
    const actual = new URL(location, SITE).href;
    if (actual !== expected) {
      failures.push(`${from}: Location ${actual} (expected ${expected})`);
    }
  }

  return failures;
}

async function main() {
  const live = process.argv.includes("--live");
  const failures = live ? await verifyLive() : await verifyBuildTime();

  if (failures.length) {
    console.error(
      `Redirect verification failed (${live ? "live" : "build"}):\n`,
    );
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }

  console.log(
    `Redirect verification passed (${REDIRECTS.length} redirects, ${live ? "live" : "build"}).`,
  );
}

main().catch((e) => {
  console.error(`Redirect verification failed: ${e.message}`);
  process.exit(1);
});
