/**
 * Phase 0: extract SEO fields from every built HTML page in dist/.
 * Output: automation/pre-migration-seo-snapshot.csv
 *
 * Run after `npm run build`.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");
const OUT = path.join(ROOT, "automation", "pre-migration-seo-snapshot.csv");
const SITE = "https://torontorestaurantgrowth.ca";

function walkHtmlFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walkHtmlFiles(full, acc);
    else if (name.endsWith(".html")) acc.push(full);
  }
  return acc;
}

function pagePathFromDist(file) {
  const rel = path.relative(DIST, file).replace(/\\/g, "/");
  let p = rel.replace(/\/index\.html$/i, "").replace(/\.html$/i, "");
  if (p === "" || p === ".") return "/";
  return `/${p}/`;
}

function isMetaRefreshRedirect(html) {
  return /<meta\s+http-equiv=["']refresh["']/i.test(html);
}

function stripNoise(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decodeEntities(m[1].replace(/\s+/g, " ").trim()) : "";
}

function extractMetaDescription(html) {
  const m =
    html.match(
      /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i,
    ) ||
    html.match(/<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i);
  return m ? decodeEntities(m[1].trim()) : "";
}

function extractCanonical(html) {
  const m =
    html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i) ||
    html.match(/<link\s+href=["']([^"']*)["']\s+rel=["']canonical["']/i);
  return m ? m[1].trim() : "";
}

function extractH1(html) {
  const m = stripNoise(html).match(/<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1>/i);
  return m
    ? m[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    : "";
}

function csvEscape(value) {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function main() {
  let files;
  try {
    files = walkHtmlFiles(DIST);
  } catch {
    console.error(
      "SEO snapshot failed: dist/ missing. Run `npm run build` first.",
    );
    process.exit(1);
  }

  if (files.length === 0) {
    console.error("SEO snapshot failed: no HTML under dist/.");
    process.exit(1);
  }

  files.sort((a, b) => a.localeCompare(b));

  const rows = [["url_path", "title", "meta_description", "canonical", "h1"]];

  for (const file of files) {
    const html = await readFile(file, "utf8");
    if (isMetaRefreshRedirect(html)) continue;

    const urlPath = pagePathFromDist(file);
    rows.push([
      urlPath,
      extractTitle(html),
      extractMetaDescription(html),
      extractCanonical(html),
      extractH1(html),
    ]);
  }

  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n") + "\n";
  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, csv, "utf8");

  console.log(
    `Wrote ${rows.length - 1} pages to ${path.relative(ROOT, OUT)} (site: ${SITE}).`,
  );
}

main().catch((e) => {
  console.error(`SEO snapshot failed: ${e.message}`);
  process.exit(1);
});
