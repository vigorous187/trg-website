import { readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SITE = "https://torontorestaurantgrowth.ca";

const checks = {
  robotsFile: path.join(ROOT, "public", "robots.txt"),
  canonicalFile: path.join(ROOT, "src", "layouts", "BaseLayout.astro"),
  sitemapFiles: [
    path.join(ROOT, "dist", "sitemap-index.xml"),
    path.join(ROOT, "dist", "sitemap-0.xml"),
  ],
  noindexPaths: [
    "/contact/thank-you/",
    "/locations/brampton/",
    "/locations/scarborough/",
    "/services/review-management/",
  ],
  errorPage: path.join(ROOT, "dist", "404.html"),
};

async function readIfExists(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

function assertTrue(condition, message) {
  if (!condition) throw new Error(message);
}

function extractAttribute(tag, attribute) {
  const match = tag.match(
    new RegExp(`\\b${attribute}\\s*=\\s*["']([^"']+)["']`, "i"),
  );
  return match?.[1] ?? null;
}

function extractRobotsContent(html) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if (extractAttribute(tag, "name")?.toLowerCase() === "robots") {
      return extractAttribute(tag, "content");
    }
  }
  return null;
}

function extractCanonical(html) {
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = extractAttribute(tag, "rel")?.toLowerCase().split(/\s+/) ?? [];
    if (rel.includes("canonical")) return extractAttribute(tag, "href");
  }
  return null;
}

function distHtmlForUrl(pageUrl) {
  const url = new URL(pageUrl);
  assertTrue(url.origin === SITE, `Sitemap URL uses an unexpected origin: ${pageUrl}`);
  const relativePath = decodeURIComponent(url.pathname).replace(/^\/|\/$/g, "");
  return path.join(ROOT, "dist", relativePath, "index.html");
}

async function main() {
  const robots = await readIfExists(checks.robotsFile);
  assertTrue(robots, "Missing robots.txt");
  assertTrue(
    /^\s*Sitemap:\s*https?:\/\/\S+/m.test(robots),
    "robots.txt is missing a Sitemap directive",
  );

  const canonicalLayout = await readIfExists(checks.canonicalFile);
  assertTrue(canonicalLayout, "Missing canonical layout file");
  assertTrue(
    canonicalLayout.includes('rel="canonical"'),
    "Layout is missing canonical link tag",
  );

  const sitemapContents = (
    await Promise.all(
      checks.sitemapFiles.map((sitemapPath) => readIfExists(sitemapPath)),
    )
  ).filter(Boolean);
  assertTrue(sitemapContents.length > 0, "No sitemap files found in dist/");

  const combinedSitemap = sitemapContents.join("\n");
  for (const blockedPath of checks.noindexPaths) {
    assertTrue(
      !combinedSitemap.includes(blockedPath),
      `Noindex path is present in sitemap: ${blockedPath}`,
    );
  }

  const sitemapUrls = [
    ...combinedSitemap.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi),
  ]
    .map((match) => match[1])
    .filter((pageUrl) => !new URL(pageUrl).pathname.endsWith(".xml"));

  assertTrue(sitemapUrls.length > 0, "Sitemap contains no page URLs");

  for (const pageUrl of sitemapUrls) {
    const htmlPath = distHtmlForUrl(pageUrl);
    const html = await readIfExists(htmlPath);
    assertTrue(html, `Sitemap URL has no built HTML: ${pageUrl}`);
    assertTrue(
      !/<meta\b[^>]*http-equiv\s*=\s*["']refresh["'][^>]*>/i.test(html),
      `Redirect page is present in sitemap: ${pageUrl}`,
    );

    const robotsContent = extractRobotsContent(html);
    assertTrue(
      !robotsContent?.toLowerCase().split(/[\s,]+/).includes("noindex"),
      `Noindex page is present in sitemap: ${pageUrl}`,
    );

    const canonical = extractCanonical(html);
    assertTrue(canonical, `Sitemap page is missing a canonical: ${pageUrl}`);
    assertTrue(
      new URL(canonical, SITE).href === new URL(pageUrl).href,
      `Sitemap canonical mismatch: ${pageUrl} -> ${canonical}`,
    );
  }

  const errorPage = await readIfExists(checks.errorPage);
  assertTrue(errorPage, "Missing dist/404.html");
  const errorRobots = extractRobotsContent(errorPage);
  assertTrue(
    errorRobots?.toLowerCase().split(/[\s,]+/).includes("noindex"),
    "404 page is missing noindex",
  );
  assertTrue(!extractCanonical(errorPage), "404 page must omit canonical");
  assertTrue(!errorPage.includes("application/ld+json"), "404 page must omit JSON-LD");

  console.log(`SEO baseline check passed (${sitemapUrls.length} sitemap pages).`);
}

main().catch((error) => {
  console.error(`SEO baseline check failed: ${error.message}`);
  process.exit(1);
});
