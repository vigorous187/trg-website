/**
 * Generate TRG blog MDX body via OpenAI Chat Completions (CI + local).
 * Requires OPENAI_API_KEY. Override the model with BLOG_LLM_MODEL.
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

const DEFAULT_BLOG_MODEL = "gpt-4.1-mini";

async function openAIError(res, model) {
  let error = {};
  try {
    error = (await res.json()).error || {};
  } catch {
    // Keep the fallback generic rather than echoing an unstructured response.
  }

  const code = String(error.code || error.type || "");
  const message = String(error.message || "");
  if (res.status === 401) {
    return new Error(
      "OpenAI authentication failed (401) — verify the OPENAI_API_KEY secret and API project access.",
    );
  }
  if (
    code === "model_not_found" ||
    /model.+(?:access|exist|found|permission)/i.test(message) ||
    res.status === 404
  ) {
    return new Error(
      `OpenAI model access failed for ${model} (${res.status}) — verify BLOG_LLM_MODEL and that the API project can use this model.`,
    );
  }
  if (
    res.status === 429 &&
    (code === "insufficient_quota" ||
      /(?:credit|quota|billing)/i.test(message))
  ) {
    return new Error(
      "OpenAI billing quota is exhausted (429) — fund the OpenAI Platform API project and retry.",
    );
  }
  if (res.status === 429) {
    return new Error("OpenAI rate limit exceeded (429) — retry later.");
  }
  return new Error(
    `OpenAI API request failed (${res.status}${code ? `, ${code}` : ""}).`,
  );
}

async function callOpenAI(system, user, maxTokens = 8192) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set — add it to GitHub Actions secrets for automated posts.",
    );
  }
  const model = process.env.BLOG_LLM_MODEL || DEFAULT_BLOG_MODEL;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_completion_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    throw await openAIError(res, model);
  }
  const data = await res.json();
  const message = data.choices?.[0]?.message;
  if (message?.refusal) {
    throw new Error(
      `OpenAI API refusal: ${String(message.refusal).slice(0, 400)}`,
    );
  }
  const content = message?.content;
  const text = Array.isArray(content)
    ? content
        .map((part) => (typeof part === "string" ? part : part?.text || ""))
        .join("\n")
    : typeof content === "string"
      ? content
      : "";
  return text.trim();
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
    body = sanitizeBody(await callOpenAI(system, userPrompt + retry));
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
