/**
 * Generate TRG blog MDX body via Anthropic API (CI + local).
 * Requires ANTHROPIC_API_KEY.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();

async function loadJson(rel) {
  return JSON.parse(await readFile(path.join(ROOT, rel), "utf8"));
}

function countWords(md) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

function countH2(md) {
  return (md.match(/^##\s+/gm) || []).length;
}

function hasListOrTable(md) {
  return (
    /^\s*[-*]\s+/m.test(md) || /^\s*\d+\.\s+/m.test(md) || /^\|.+\|$/m.test(md)
  );
}

function sanitizeBody(body) {
  return body
    .split("\n")
    .filter((line) => !/^#\s/.test(line.trim()))
    .join("\n")
    .trim();
}

function conversionPaths(gates) {
  return gates.blogQuality?.requireBodyLinkAny || ["/contact/", "/pricing/"];
}

function validateBody(body, gates) {
  const bq = gates.blogQuality || {};
  const minWords = bq.minWords ?? 450;
  const minH2 = bq.minH2 ?? 3;
  const requiredLinks = conversionPaths(gates);
  const issues = [];
  if (/^#\s[^#]/m.test(body))
    issues.push("do not use # H1 in body (template adds title as H1)");
  if (countWords(body) < minWords) issues.push(`need ${minWords}+ words`);
  if (countH2(body) < minH2) issues.push(`need ${minH2}+ H2 sections`);
  if (!hasListOrTable(body)) issues.push("need a list or table");
  if (!requiredLinks.some((link) => body.includes(link)))
    issues.push(`need link to one of: ${requiredLinks.join(", ")}`);
  if (!/how this was created/i.test(body))
    issues.push('need "## How this was created" section');
  for (const pattern of bq.prohibitedPatterns || []) {
    if (new RegExp(pattern, "i").test(body))
      issues.push(`prohibited pattern: ${pattern}`);
  }
  return issues;
}

async function callAnthropic(system, user, maxTokens = 8192) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set — add it to GitHub Actions secrets for automated posts.",
    );
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.BLOG_LLM_MODEL || "claude-sonnet-4-5",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    throw new Error(
      `Anthropic API ${res.status}: ${(await res.text()).slice(0, 400)}`,
    );
  }
  const data = await res.json();
  return (data.content || [])
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n")
    .trim();
}

function systemPrompt(brand, domain) {
  return `You write people-first restaurant marketing guides for ${brand} (${domain}).
Audience: independent Toronto and GTA restaurant owners only — never generic local businesses.
Output Markdown body only — no YAML frontmatter.
Be practical and specific to restaurants (GBP, reviews, menus, reservations, neighbourhood search).
Never claim guaranteed rankings or "#1 on Google". Use "may", "often", "typically" for outcomes.`;
}

/** @param {{ slug: string, title: string, description?: string, tags?: string[], serviceLink?: string, relatedBlog?: string }} topic */
export async function generateBlogBody(topic) {
  const gates = await loadJson("scripts/site-gates.json");
  let site;
  try {
    site = await loadJson("automation/site.json");
  } catch {
    site = {
      brand: "Toronto Restaurant Growth",
      domain: "torontorestaurantgrowth.ca",
      audience: "Independent Toronto and GTA restaurant owners",
    };
  }
  const brand = process.env.BLOG_SITE_BRAND || site.brand;
  const domain = process.env.BLOG_SITE_DOMAIN || site.domain;
  const minWords = gates.blogQuality?.minWords ?? 450;
  const minH2 = gates.blogQuality?.minH2 ?? 3;
  const system = systemPrompt(brand, domain);
  const related =
    topic.relatedBlog || "/blog/toronto-restaurants-rank-google-maps/";
  const service = topic.serviceLink || "/services/google-maps-seo/";
  const queueSource = site.queueSource || "automation/topic-queue.json";

  const userPrompt = `Write a complete blog post for slug "${topic.slug}".

Title: ${topic.title}
Description hint: ${topic.description || ""}
Tags: ${(topic.tags || ["toronto", "restaurants"]).join(", ")}
Audience: ${site.audience}

Hard requirements:
- Use only ## H2 and lower — never a single # H1
- At least ${minWords} words
- At least ${minH2} sections with ## H2 headings (not counting "How this was created")
- Include a bullet or numbered list OR a markdown table
- Include markdown links to [free Google audit](/contact/), [pricing](/pricing/), [related guide](${related}), and [service page](${service})
- End with ## How this was created — state topic queued in ${queueSource}, body AI-drafted for human review, authored by ${brand}
- Do not use "guaranteed rankings" or "#1 on Google"`;

  let body = "";
  let lastIssues = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    const retry =
      attempt > 1
        ? `\n\nPrevious draft failed checks: ${lastIssues.join("; ")}. Fix all of them.`
        : "";
    body = sanitizeBody(await callAnthropic(system, userPrompt + retry));
    lastIssues = validateBody(body, gates);
    if (lastIssues.length === 0) break;
    console.log(
      `[blog-generate] attempt ${attempt} failed checks: ${lastIssues.join("; ")}`,
    );
  }
  if (lastIssues.length > 0) {
    throw new Error(`Generated body failed gates: ${lastIssues.join("; ")}`);
  }
  return body;
}
