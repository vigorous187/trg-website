/**
 * Diff built sitemap <loc> URLs against automation/pre-migration-sitemap-urls.txt
 *
 *   --write-baseline   overwrite baseline from current dist/ sitemaps
 */
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");
const BASELINE = path.join(
  ROOT,
  "automation",
  "pre-migration-sitemap-urls.txt",
);

function normalizeUrl(url) {
  const u = new URL(url);
  let p = u.pathname;
  if (!p.endsWith("/")) p += "/";
  return `${u.origin}${p}`;
}

function extractLocs(xml) {
  const locs = [];
  const re = /<loc>\s*([^<]+?)\s*<\/loc>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) locs.push(normalizeUrl(m[1].trim()));
  return locs;
}

async function readSitemapUrls() {
  let names;
  try {
    names = await readdir(DIST);
  } catch {
    throw new Error("dist/ missing. Run `npm run build` first.");
  }

  const sitemapFiles = names
    .filter((n) => /^sitemap.*\.xml$/i.test(n))
    .sort()
    .map((n) => path.join(DIST, n));

  if (sitemapFiles.length === 0) {
    throw new Error("No sitemap*.xml files in dist/.");
  }

  const urls = new Set();
  for (const file of sitemapFiles) {
    const xml = await readFile(file, "utf8");
    for (const loc of extractLocs(xml)) urls.add(loc);
  }
  return [...urls].sort();
}

async function main() {
  const writeBaseline = process.argv.includes("--write-baseline");
  const current = await readSitemapUrls();

  if (writeBaseline) {
    await mkdir(path.dirname(BASELINE), { recursive: true });
    const body = current.join("\n") + "\n";
    await writeFile(BASELINE, body, "utf8");
    console.log(
      `Wrote ${current.length} URLs to ${path.relative(ROOT, BASELINE)}.`,
    );
    return;
  }

  let baselineRaw;
  try {
    baselineRaw = await readFile(BASELINE, "utf8");
  } catch {
    console.error(
      `Missing baseline ${path.relative(ROOT, BASELINE)}. Run:\n  npm run seo:sitemap:baseline`,
    );
    process.exit(1);
  }

  const baseline = baselineRaw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .sort();

  const currentSet = new Set(current);
  const baselineSet = new Set(baseline);
  const added = current.filter((u) => !baselineSet.has(u));
  const removed = baseline.filter((u) => !currentSet.has(u));

  if (added.length === 0 && removed.length === 0) {
    console.log(`Sitemap diff OK (${current.length} URLs, unchanged).`);
    return;
  }

  console.error("Sitemap URL diff detected:\n");
  if (added.length) {
    console.error(`  Added (${added.length}):`);
    for (const u of added) console.error(`    + ${u}`);
  }
  if (removed.length) {
    console.error(`  Removed (${removed.length}):`);
    for (const u of removed) console.error(`    - ${u}`);
  }
  process.exit(1);
}

main().catch((e) => {
  console.error(`Sitemap diff failed: ${e.message}`);
  process.exit(1);
});
