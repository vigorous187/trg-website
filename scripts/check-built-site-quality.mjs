#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

const dist = resolve("dist");
const origin = "https://torontorestaurantgrowth.ca";
const failures = [];
const files = readdirSync(dist, { recursive: true }).map(String).filter((file) => statSync(resolve(dist, file)).isFile());
const htmlFiles = files.filter((file) => file.endsWith(".html"));
const redirects = new Set(existsSync(resolve(dist, "_redirects")) ? readFileSync(resolve(dist, "_redirects"), "utf8").split(/\r?\n/).map((line) => line.trim().split(/\s+/)[0]).filter(Boolean) : []);

function route(file) {
  if (file === "index.html") return "/";
  if (file.endsWith("/index.html")) return `/${file.slice(0, -10)}`;
  return `/${file}`;
}
function attr(tag, name) {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m ? (m[1] ?? m[2] ?? m[3] ?? "") : null;
}
function targetExists(pathname) {
  const path = decodeURIComponent(pathname).replace(/^\/+/, "");
  return existsSync(resolve(dist, path)) || existsSync(resolve(dist, path, "index.html"));
}

const titles = new Map();
const descriptions = new Map();
const pages = [];
let images = 0;
let schemas = 0;

for (const file of htmlFiles) {
  const html = readFileSync(resolve(dist, file), "utf8");
  const path = route(file);
  if (/<meta\b[^>]*http-equiv=["']refresh["']/i.test(html)) continue;
  const noindex = /<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);
  const indexable = path !== "/404.html" && !noindex;
  const title = (html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").replace(/\s+/g, " ").trim();
  const descriptionTag = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]).find((tag) => attr(tag, "name")?.toLowerCase() === "description");
  const description = descriptionTag ? attr(descriptionTag, "content")?.trim() || "" : "";
  const canonicals = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]).filter((tag) => (attr(tag, "rel") || "").toLowerCase().split(/\s+/).includes("canonical"));
  pages.push({ file, path, indexable });

  if (!/<html\b[^>]*lang=["'][^"']+["']/i.test(html)) failures.push(`${file}: missing html lang`);
  if (!title) failures.push(`${file}: missing title`);
  if (!description) failures.push(`${file}: missing description`);
  if ((html.match(/<h1\b/gi) || []).length !== 1) failures.push(`${file}: expected one h1`);
  if (indexable) {
    for (const [map, value] of [[titles, title], [descriptions, description]]) {
      if (!map.has(value)) map.set(value, []);
      map.get(value).push(file);
    }
    if (canonicals.length !== 1) failures.push(`${file}: expected one canonical`);
    else {
      try {
        const canonical = new URL(attr(canonicals[0], "href"));
        if (canonical.origin !== origin || canonical.pathname !== path) failures.push(`${file}: canonical mismatch ${canonical.href}`);
      } catch { failures.push(`${file}: canonical is not absolute`); }
    }
  }

  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    schemas++;
    try {
      const root = JSON.parse(match[1]);
      for (const item of (Array.isArray(root) ? root : [root])) if (!item?.["@context"] || !item?.["@type"]) throw new Error("missing @context/@type");
    } catch (error) { failures.push(`${file}: invalid JSON-LD (${error.message})`); }
  }

  for (const tag of [...html.matchAll(/<(?:a|link|script|img|source)\b[^>]*>/gi)].map((m) => m[0])) {
    const refs = [attr(tag, "href"), attr(tag, "src")].filter(Boolean);
    const srcset = attr(tag, "srcset");
    if (srcset) refs.push(...srcset.split(",").map((part) => part.trim().split(/\s+/)[0]));
    for (const ref of refs) {
      if (/^(data:|mailto:|tel:|javascript:|#)/i.test(ref)) continue;
      let url; try { url = new URL(ref, `${origin}${path}`); } catch { failures.push(`${file}: malformed URL ${ref}`); continue; }
      if (path !== "/404.html" && url.origin === origin && !targetExists(url.pathname) && !redirects.has(url.pathname)) failures.push(`${file}: missing local target ${url.pathname}`);
    }
  }
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    images++; const tag = match[0], src = attr(tag, "src") || "unknown";
    if (attr(tag, "alt") === null) failures.push(`${file}: image missing alt (${src})`);
    if (attr(tag, "width") === null || attr(tag, "height") === null) failures.push(`${file}: image missing dimensions (${src})`);
    if ((attr(tag, "fetchpriority") || "").toLowerCase() === "high" && (attr(tag, "loading") || "").toLowerCase() === "lazy") failures.push(`${file}: prioritized image is lazy (${src})`);
  }
}

for (const [kind, map] of [["title", titles], ["description", descriptions]]) for (const [value, affected] of map) if (value && affected.length > 1) failures.push(`duplicate ${kind}: ${affected.join(", ")}`);
const sitemapUrls = new Set();
for (const file of files.filter((f) => /^sitemap.*\.xml$/.test(f))) for (const match of readFileSync(resolve(dist, file), "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)) {
  const url = new URL(match[1]);
  if (/\.xml$/.test(url.pathname)) continue;
  sitemapUrls.add(url.pathname);
  if (url.origin !== origin || !targetExists(url.pathname)) failures.push(`${file}: invalid sitemap target ${url.href}`);
}
for (const page of pages.filter((p) => p.indexable)) if (!sitemapUrls.has(page.path)) failures.push(`${page.file}: missing from sitemap`);
for (const path of sitemapUrls) if (pages.find((page) => page.path === path && !page.indexable)) failures.push(`sitemap contains noindex ${path}`);

console.log(JSON.stringify({ status: failures.length ? "FAIL" : "PASS", htmlPages: pages.length, indexablePages: pages.filter((p) => p.indexable).length, images, schemas, sitemapUrls: sitemapUrls.size, failures }, null, 2));
if (failures.length) process.exitCode = 1;
