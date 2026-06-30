#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith(".astro")) out.push(full);
  }
  return out;
}

function depthImport(file, component) {
  const rel = path.relative(path.join(ROOT, "src/pages"), path.dirname(file));
  const segments = rel.split(path.sep).filter(Boolean).length;
  const up = "../".repeat(segments + 1);
  return `import ${component} from '${up}components/${component}.astro';`;
}

function addImports(html, file) {
  const components = [
    "PageIntro",
    "PageCta",
    "Breadcrumb",
    "MetricStrip",
    "PageSection",
  ];
  const toAdd = components.filter(
    (c) => html.includes(`<${c}`) && !html.includes(`import ${c}`),
  );
  if (!toAdd.length) return html;
  const lines = toAdd.map((c) => depthImport(file, c)).join("\n");
  const m = html.match(/^---\n([\s\S]*?\n)---/);
  if (!m) return html;
  return html.replace(/^---\n([\s\S]*?\n)---/, `---\n$1${lines}\n---`);
}

function fixLocationHero(html) {
  return html.replace(
    /<section style="background: #1a1a1a; color: #fff; padding: 100px 24px 80px; text-align: center;">\s*<div style="max-width: 860px; margin: 0 auto;">\s*<p>([^<]*)<\/p>\s*<h1[^>]*>([^<]*)<\/h1>\s*<p>\s*([\s\S]*?)\s*<\/p>\s*<a href="\/contact\/">Book a Free Google Audit<\/a>\s*<\/div>\s*<\/section>/g,
    (_, eyebrow, title, desc) =>
      `    <PageIntro eyebrow="${eyebrow.trim()}" title="${title.trim()}" description="${desc.trim().replace(/\s+/g, " ").replace(/"/g, "&quot;")}" ctaLabel="Book a Free Google Audit" ctaHref="/contact/" />`,
  );
}

function fixGoogleMaps(html) {
  return html.replace(
    /<PageIntro title="Google Maps SEO for Restaurants Toronto" description="When someone searches \\"best halal restaurant near me\\" or \\"seafood Scarborough,\\" the top 3 results on Google Maps get 70% of the clicks. We get Toronto restaurants into those top 3 spots — and keep them there." \/>/,
    `<PageIntro title="Google Maps SEO for Restaurants Toronto" description={'When someone searches "best halal restaurant near me" or "seafood Scarborough," the top 3 results on Google Maps get 70% of the clicks. We get Toronto restaurants into those top 3 spots — and keep them there.'} ctaLabel="Book a Free Google Audit" ctaHref="/contact/" />`,
  );
}

function fixSocial(html) {
  return html.replace(
    /<PageIntro title="Restaurant Social Media Management Toronto" description="[^"]*" \/>/,
    `<PageIntro title="Restaurant Social Media Management Toronto" description="Short-form video and social that fills seats — delivered by Jayden Aj through Forge's content team. This is a separate add-on ($3,000/month), not part of core TRG website and SEO plans." ctaLabel="Book a Free Google Audit" ctaHref="/contact/" />`,
  );
}

function fixCrabBoil(html) {
  return html
    .replace(
      /<!-- CTA -->\s*<PageCta title="Book Your Free Google Audit" description="[^"]*" \/><!-- removed duplicate dark cta wrapper --><div class="hidden">[\s\S]*?<\/div>\s*<\/div>/,
      `<!-- CTA -->
    <PageCta title="Book Your Free Google Audit" description="We'll review your Google Business Profile, your website, and your reviews — and show you exactly what's costing you customers. 15 minutes. No pitch. Just clarity." />`,
    )
    .replace(
      /<div style="max-width: 800px; margin: 0 auto; padding: 0 24px;">/,
      '<div class="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">',
    )
    .replace(
      /<section style="padding: 72px 0; border-bottom: 1px solid #e8e8e5;">/g,
      '<section class="border-b border-stone-border py-16 sm:py-20 trg-prose">',
    )
    .replace(
      /<section style="padding: 72px 0;">/g,
      '<section class="py-16 sm:py-20 trg-prose">',
    )
    .replace(
      /<span>(\d{2} — [^<]+)<\/span>/g,
      '<p class="section-label mb-4">$1</p>',
    );
}

function fixServicesIndex(html) {
  return html.replace(
    /<section style="background: #1a1a1a; color: #fff; padding: 80px 24px; text-align: center;">[\s\S]*?<\/section>/,
    `<PageCta title="We Only Work With Restaurants" description="Not gyms. Not dentists. Not e-commerce. Every service we offer was built from the ground up for restaurants — because restaurant marketing is genuinely different from every other industry." ctaLabel="Start With a Free Audit" ctaHref="/contact/" />`,
  );
}

function fixBlogHero(html) {
  return html.replace(
    /<section style="background: #1A1A1A; padding: 100px 24px 72px; text-align: center;">[\s\S]*?<\/section>/,
    (block) => {
      const title = block.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.trim();
      const desc = block
        .match(/<h1[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i)?.[1]
        ?.trim();
      if (!title) return block;
      const descProp = desc
        ? ` description="${desc.replace(/"/g, "&quot;")}"`
        : "";
      return `<PageIntro title="${title.replace(/"/g, "&quot;")}"${descProp} />`;
    },
  );
}

function fix404(html) {
  return html.replace(
    /<section style="background: #1a1a1a[^"]*"[^>]*>[\s\S]*?<\/section>/,
    `<PageIntro title="Page not found" description="The page you're looking for doesn't exist or may have moved." align="center">
      <div class="mt-8 text-center">
        <a href="/" class="btn-cta-outline mr-4">Back to home</a>
        <a href="/contact/" class="btn-cta">Book a Free Audit</a>
      </div>
    </PageIntro>`,
  );
}

function fixSectionLabels(html) {
  return html.replace(
    /<p>(The Local Food Scene|What We Do|Questions|Also Serving|Our Services)<\/p>\s*<h2>/g,
    '<p class="section-label">$1</p><h2>',
  );
}

function fixDuplicateBreadcrumbComment(html) {
  return html.replace(
    /<!-- BREADCRUMB -->\s*<!-- BREADCRUMB -->/g,
    "<!-- BREADCRUMB -->",
  );
}

function addCtaToPageIntrosWithout(html) {
  return html.replace(/<PageIntro([^>]*)\/>/g, (match, attrs) => {
    if (attrs.includes("ctaLabel") || attrs.includes("ctaHref")) return match;
    return `<PageIntro${attrs} ctaLabel="Book a Free Google Audit" ctaHref="/contact/" />`;
  });
}

for (const file of walk(path.join(ROOT, "src/pages"))) {
  let html = fs.readFileSync(file, "utf8");
  const before = html;
  html = fixLocationHero(html);
  html = fixGoogleMaps(html);
  html = fixSocial(html);
  if (file.endsWith("crab-boil.astro")) html = fixCrabBoil(html);
  if (file.endsWith("services/index.astro")) html = fixServicesIndex(html);
  if (file.includes("/blog/")) html = fixBlogHero(html);
  if (file.endsWith("404.astro")) html = fix404(html);
  html = fixSectionLabels(html);
  html = fixDuplicateBreadcrumbComment(html);
  html = addCtaToPageIntrosWithout(html);
  html = addImports(html, file);
  if (html !== before) {
    fs.writeFileSync(file, html);
    console.log("fixed", path.relative(ROOT, file));
  }
}

console.log("Pass 2 complete.");
