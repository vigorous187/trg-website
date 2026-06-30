#!/usr/bin/env node
/**
 * Mechanical chrome unification — strips inline layout styles, normalizes sections.
 * Does not change copy. Run: node scripts/unify-chrome.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const GLOBS = [
  "src/pages/services",
  "src/pages/locations",
  "src/pages/case-studies",
  "src/pages/niche",
  "src/pages/blog",
  "src/pages/terms.astro",
  "src/pages/privacy.astro",
  "src/pages/404.astro",
];

function collectFiles() {
  const files = [];
  for (const rel of GLOBS) {
    const full = path.join(ROOT, rel);
    if (fs.statSync(full).isFile()) {
      files.push(full);
      continue;
    }
    for (const name of fs.readdirSync(full)) {
      if (name.endsWith(".astro")) files.push(path.join(full, name));
    }
  }
  return files.filter((f) => {
    const base = path.basename(f);
    return ![
      "brampton.astro",
      "scarborough.astro",
      "review-management.astro",
    ].includes(base);
  });
}

function stripTypographyStyles(html) {
  return html
    .replace(/<p style="[^"]*">/g, "<p>")
    .replace(/<h2 style="[^"]*">/g, "<h2>")
    .replace(/<h3 style="[^"]*">/g, "<h3>")
    .replace(/<ul style="[^"]*">/g, "<ul>")
    .replace(/<ol style="[^"]*">/g, "<ol>")
    .replace(/<li style="[^"]*">/g, "<li>")
    .replace(/<a href="([^"]+)" style="[^"]*">/g, '<a href="$1">')
    .replace(/<span style="[^"]*">/g, "<span>")
    .replace(
      /<div style="border-bottom: 1px solid #(?:ddd|e0e0d8|e8e8e5); padding: 24px 0;">/g,
      '<div class="trg-faq-item">',
    )
    .replace(/<div style="padding: 24px 0;">/g, '<div class="trg-faq-item">')
    .replace(
      /<li style="padding: 14px 0; border-bottom: 1px solid #e0e0d8; display: flex; align-items: flex-start; gap: 12px;">\s*<span style="color: #E85D04; font-weight: 700; flex-shrink: 0; margin-top: 2px;">→<\/span>\s*<span style="color: #333;">/g,
      '<li class="trg-list-item"><span class="arrow">→</span><span>',
    )
    .replace(
      /<li style="padding: 14px 0; display: flex; align-items: flex-start; gap: 12px;">\s*<span style="color: #E85D04; font-weight: 700; flex-shrink: 0; margin-top: 2px;">→<\/span>\s*<span style="color: #333;">/g,
      '<li class="trg-list-item"><span class="arrow">→</span><span>',
    )
    .replace(
      /<div style="text-align: center; padding: 24px; background: rgba\(232,93,4,0\.08\); border-radius: 8px;">/g,
      '<div class="trg-stat-card">',
    )
    .replace(
      /<div style="font-family: 'DM Serif Display', Georgia, serif; font-size: 2\.4rem; color: #E85D04; font-weight: 700;">/g,
      '<div class="value">',
    )
    .replace(
      /<div style="font-size: 0\.9rem; color: #4a4a4a; margin-top: 8px;">/g,
      '<div class="label">',
    )
    .replace(
      /<div style="display: grid; grid-template-columns: repeat\(3, 1fr\); gap: 24px; margin: 32px 0;">/g,
      '<div class="trg-stat-grid">',
    )
    .replace(
      /<div style="border-left: 4px solid #E85D04; padding: 24px 32px; margin: 40px 0; background: #F5F5F0; border-radius: 0 8px 8px 0;">/g,
      '<div class="trg-callout">',
    )
    .replace(
      /<div style="background: #f9f9f6; border-left: 3px solid #E85D04; padding: 20px; margin: 20px 0; border-radius: 4px; font-style: italic; color: #4a4a4a;">/g,
      '<div class="trg-callout">',
    )
    .replace(
      /<div style="background: #fff; border: 1px solid #e8e8e0; border-radius: 12px; padding: 28px 24px; text-align: center;">/g,
      '<div class="trg-stat-card">',
    )
    .replace(
      /<div style="background: #F5F5F0; border-radius: 12px; padding: 28px 24px; text-align: center;">/g,
      '<div class="trg-stat-card">',
    )
    .replace(
      /<a href="([^"]+)" style="background: #fff; padding: 8px 16px; border-radius: 4px; text-decoration: none; color: #1a1a1a; font-size: 0\.9rem; font-weight: 500;">/g,
      '<a href="$1" class="trg-pill">',
    );
}

function normalizeSections(html) {
  return html
    .replace(/<main style="padding-top: 80px;">/g, "<main>")
    .replace(
      /<section style="background: #fff; padding: 80px 0;">\s*<div style="max-width: 800px; margin: 0 auto; padding: 0 24px;">/g,
      '<section class="bg-white py-16 sm:py-20 lg:py-24"><div class="trg-prose mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">',
    )
    .replace(
      /<section style="background: #fff; padding: 72px 24px;">\s*<div style="max-width: 860px; margin: 0 auto;">/g,
      '<section class="bg-white py-16 sm:py-20 lg:py-24"><div class="trg-prose mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">',
    )
    .replace(
      /<section style="background: #f5f5f0; padding: 80px 0;">\s*<div style="max-width: 800px; margin: 0 auto; padding: 0 24px;">/g,
      '<section class="bg-surface py-16 sm:py-20 lg:py-24"><div class="trg-prose mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">',
    )
    .replace(
      /<section style="background: #f5f5f0; padding: 72px 24px;">\s*<div style="max-width: 860px; margin: 0 auto;">/g,
      '<section class="bg-surface py-16 sm:py-20 lg:py-24"><div class="trg-prose mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">',
    )
    .replace(
      /<section style="background: #f5f5f0; padding: 80px 24px;">\s*<div style="max-width: (?:900|1100)px; margin: 0 auto;">/g,
      '<section class="bg-surface py-16 sm:py-20 lg:py-24"><div class="trg-prose mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">',
    );
}

function convertLocationBreadcrumb(html) {
  return html.replace(
    /<nav style="padding: 16px 24px; background: #f5f5f0; font-size: 0\.85rem;" aria-label="Breadcrumb">[\s\S]*?<\/nav>/,
    (block) => {
      const links = [...block.matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)];
      const lastText = block
        .split("›")
        .pop()
        ?.trim()
        .replace(/<[^>]+>/g, "")
        .trim();
      if (links.length < 2) return block;
      const items = [
        ...links.map((m) => ({ label: m[2], href: m[1] })),
        { label: lastText || "Current page" },
      ];
      const itemsStr = items
        .map((i) =>
          i.href
            ? `{ label: "${i.label}", href: "${i.href}" }`
            : `{ label: "${i.label}" }`,
        )
        .join(",\n    ");
      return `<!-- BREADCRUMB -->
    <Breadcrumb items={[\n    ${itemsStr}\n    ]} />`;
    },
  );
}

function convertDarkHero(html) {
  return html.replace(
    /<!-- HERO -->\s*<section style="background: #1a1a1a[^"]*"[^>]*>[\s\S]*?<\/section>/i,
    (block) => {
      const eyebrow = block
        .match(/<p style="[^"]*">([^<]*)<\/p>/i)?.[1]
        ?.trim();
      const title = block
        .match(/<h1 style="[^"]*">([^<]*)<\/h1>/i)?.[1]
        ?.trim();
      const desc = block
        .match(/<h1[^>]*>[\s\S]*?<p style="[^"]*">([\s\S]*?)<\/p>/i)?.[1]
        ?.trim();
      if (!title) return block;
      const eyebrowProp = eyebrow
        ? ` eyebrow="${eyebrow.replace(/"/g, '\\"')}"`
        : "";
      const descProp = desc
        ? ` description="${desc.replace(/"/g, '\\"').replace(/\s+/g, " ")}"`
        : "";
      return `<!-- HERO -->
    <PageIntro${eyebrowProp} title="${title.replace(/"/g, '\\"')}"${descProp} ctaLabel="Book a Free Google Audit" ctaHref="/contact/" />`;
    },
  );
}

function convertOrangeCta(html) {
  return html.replace(
    /<section style="background: #E85D04[^"]*"[^>]*>[\s\S]*?<\/section>/,
    (block) => {
      const title = block
        .match(/<h2 style="[^"]*">([\s\S]*?)<\/h2>/i)?.[1]
        ?.trim();
      if (!title) return block;
      return `<!-- CTA -->
    <PageCta title="${title.replace(/"/g, '\\"').replace(/\s+/g, " ")}" />`;
    },
  );
}

function convertDarkCta(html) {
  return html.replace(
    /<section style="background: #1a1a1a; padding: 80px 24px; text-align: center;">[\s\S]*?<\/section>/i,
    (block) => {
      const title = block
        .match(/<h2 style="[^"]*">([\s\S]*?)<\/h2>/i)?.[1]
        ?.trim();
      const desc = block
        .match(/<h2[^>]*>[\s\S]*?<p style="[^"]*">([\s\S]*?)<\/p>/i)?.[1]
        ?.trim();
      if (!title) return block;
      const descProp = desc
        ? ` description="${desc.replace(/"/g, '\\"').replace(/\s+/g, " ")}"`
        : "";
      return `<!-- CTA -->
    <PageCta title="${title.replace(/"/g, '\\"').replace(/\s+/g, " ")}"${descProp} />`;
    },
  );
}

function convertCaseStudyHero(html) {
  return html.replace(
    /<!-- HERO -->\s*<section style="background: #1A1A1A[^"]*"[^>]*>[\s\S]*?<\/section>/i,
    (block) => {
      const eyebrow = block
        .match(/<span style="[^"]*">([^<]*)<\/span>/i)?.[1]
        ?.trim();
      const title = block
        .match(/<h1 style="[^"]*">([\s\S]*?)<\/h1>/i)?.[1]
        ?.trim();
      const desc = block
        .match(/<h1[^>]*>[\s\S]*?<p style="[^"]*">([\s\S]*?)<\/p>/i)?.[1]
        ?.trim();
      if (!title) return block;
      const eyebrowProp = eyebrow
        ? ` eyebrow="${eyebrow.replace(/"/g, '\\"')}"`
        : "";
      const descProp = desc
        ? ` description="${desc.replace(/"/g, '\\"').replace(/\s+/g, " ")}"`
        : "";
      return `<!-- HERO -->
    <PageIntro${eyebrowProp} title="${title.replace(/"/g, '\\"').replace(/\s+/g, " ")}"${descProp} />`;
    },
  );
}

function convertMetricBar(html) {
  const match = html.match(
    /<!-- METRICS BAR -->\s*<div style="display: flex; flex-wrap: wrap[^"]*"[^>]*>([\s\S]*?)<\/div>\s*\n\s*<!-- BODY CONTENT -->/,
  );
  if (!match) return html;
  const metrics = [
    ...match[1].matchAll(
      /<span style="[^"]*">([^<]+)<\/span>\s*<span style="[^"]*">([^<]+)<\/span>/g,
    ),
  ].map((m) => ({ value: m[1], label: m[2] }));
  if (!metrics.length) return html;
  const metricsStr = metrics
    .map((m) => `{ value: "${m.value}", label: "${m.label}" }`)
    .join(",\n    ");
  return html.replace(
    /<!-- METRICS BAR -->[\s\S]*?<!-- BODY CONTENT -->/,
    `<!-- METRICS BAR -->
    <MetricStrip metrics={[\n    ${metricsStr}\n    ]} />

    <!-- BODY CONTENT -->`,
  );
}

function ensureImports(html, needs) {
  const imports = [];
  if (needs.breadcrumb && !html.includes("Breadcrumb")) {
    imports.push("import Breadcrumb from '../../components/Breadcrumb.astro';");
  }
  if (needs.pageIntro && !html.includes("PageIntro")) {
    imports.push("import PageIntro from '../../components/PageIntro.astro';");
  }
  if (needs.pageCta && !html.includes("PageCta")) {
    imports.push("import PageCta from '../../components/PageCta.astro';");
  }
  if (needs.metricStrip && !html.includes("MetricStrip")) {
    imports.push(
      "import MetricStrip from '../../components/MetricStrip.astro';",
    );
  }
  if (!imports.length) return html;
  const depth = html.includes("../../layouts") ? "../.." : "..";
  const fixed = imports.map((i) => i.replace("../..", depth));
  return html.replace(
    /^(---\nimport BaseLayout[^\n]+\n)/,
    `$1${fixed.join("\n")}\n`,
  );
}

function transformFile(file) {
  let html = fs.readFileSync(file, "utf8");
  const original = html;
  const needs = {
    breadcrumb: false,
    pageIntro: false,
    pageCta: false,
    metricStrip: false,
  };

  if (html.includes('aria-label="Breadcrumb"')) {
    html = convertLocationBreadcrumb(html);
    needs.breadcrumb = html.includes("<Breadcrumb");
  }

  html = convertCaseStudyHero(html);
  html = convertDarkHero(html);
  html = convertMetricBar(html);
  if (html.includes("<PageIntro")) needs.pageIntro = true;
  if (html.includes("<MetricStrip")) needs.metricStrip = true;

  html = convertOrangeCta(html);
  html = convertDarkCta(html);
  if (html.includes("<PageCta")) needs.pageCta = true;

  html = normalizeSections(html);
  html = stripTypographyStyles(html);

  // Dark inline sections -> light cards
  html = html.replace(
    /<section style="background: #1a1a1a; color: #f5f5f0; padding: 80px 0;">\s*<div style="max-width: 800px; margin: 0 auto; padding: 0 24px;">/g,
    '<section class="bg-surface py-16 sm:py-20 lg:py-24"><div class="trg-prose mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">',
  );
  html = html.replace(
    /<section style="background: #1a1a1a; padding: 80px 0;">\s*<div style="max-width: 800px; margin: 0 auto; padding: 60px 24px; text-align: center;">/g,
    '<section class="bg-surface py-16 sm:py-20 lg:py-24"><div class="trg-prose mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">',
  );
  html = html.replace(
    /<div style="background: #1a1a1a; border-left: 4px solid #E85D04; padding: 32px; border-radius: 8px; margin: 24px 0; border: 1px solid rgba\(255,255,255,0\.1\);">/g,
    '<div class="trg-card-dark-accent">',
  );
  html = html.replace(
    /<p style="font-family: 'DM Serif Display', Georgia, serif; font-size: 2rem; color: #E85D04; font-weight: 700;">/g,
    '<p class="headline">',
  );

  // Halal hero stays green — convert to PageSection halal intro manually later
  html = html.replace(
    /<section style="background: #1B4332; color: #f5f5f0; padding: 80px 0;">\s*<div style="max-width: 800px; margin: 0 auto; padding: 40px 24px; text-align: center;">/g,
    '<section class="bg-halal-green py-16 text-center sm:py-20 lg:py-24"><div class="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 trg-prose-invert trg-prose">',
  );
  html = html.replace(
    /<section style="background: #1B4332; color: #fff; padding: 64px 24px;">\s*<div style="max-width: 860px; margin: 0 auto;">/g,
    '<section class="bg-halal-green py-16 sm:py-20 lg:py-24"><div class="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 trg-prose-invert trg-prose">',
  );

  // Final dark div CTA in case studies
  html = html.replace(
    /<div style="background: #1A1A1A; color: #fff; padding: 72px 24px; text-align: center;">\s*<div style="max-width: 800px; margin: 0 auto;">/g,
    '<PageCta title="Book Your Free Google Audit" description="We\'ll review your Google Business Profile, your website, and your reviews — and show you exactly what\'s costing you customers. 15 minutes. No pitch. Just clarity." /><!-- removed duplicate dark cta wrapper --><div class="hidden">',
  );

  html = ensureImports(html, needs);

  if (html !== original) {
    fs.writeFileSync(file, html);
    return true;
  }
  return false;
}

let changed = 0;
for (const file of collectFiles()) {
  if (transformFile(file)) {
    changed++;
    console.log("updated", path.relative(ROOT, file));
  }
}
console.log(`Done. ${changed} files updated.`);
