#!/usr/bin/env node
// scripts/blog-opposing-review.mjs
// Optional adversarial reviewer that ALWAYS runs the uniqueness gate first,
// then — only if OPENAI_API_KEY is set AND BLOG_LLM_REVIEW=1 — sends a
// concise summary of post titles + body openings to the OpenAI Chat
// Completions API and prints the review. Review is informational; it never fails the build.
import { spawnSync } from "node:child_process";
import { readFile, readdir, stat } from "node:fs/promises";
import { join, extname, basename } from "node:path";

const ROOT = process.cwd();
const CANDIDATES = ["src/content/blog", "src/content/posts", "src/pages/blog"];
const SCRIPT_DIR = new URL(".", import.meta.url).pathname;

function run(node, args) {
  const r = spawnSync(node, args, { stdio: "inherit", env: process.env });
  return r.status ?? 1;
}

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}
async function findBlogDir() {
  for (const c of CANDIDATES) {
    const full = join(ROOT, c);
    if (await exists(full)) return full;
  }
  return null;
}

async function listPosts(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await listPosts(full)));
    else if (e.isFile()) {
      const ext = extname(e.name).toLowerCase();
      if (ext === ".md" || ext === ".mdx") out.push(full);
    }
  }
  return out;
}

function splitFm(raw) {
  if (!raw.startsWith("---")) return { fm: "", body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { fm: "", body: raw };
  return { fm: raw.slice(3, end), body: raw.slice(end + 4).replace(/^\n/, "") };
}
function fmField(fm, key) {
  const m = fm.match(
    new RegExp(`^\\s*${key}\\s*:\\s*"?([^"\\n]+?)"?\\s*$`, "im"),
  );
  return m ? m[1].trim() : "";
}

async function callOpenAI(summary) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return;
  const body = {
    model: process.env.BLOG_LLM_MODEL || "gpt-5.6-terra",
    max_completion_tokens: 1200,
    reasoning_effort: "none",
    messages: [
      {
        role: "system",
        content:
          "You are a strict editorial reviewer for a small business blog. Read the submitted post titles and body openings. Flag any pair that looks like the same template with swapped nouns. Reward concrete, specific, original content. Be terse. Output sections: SUMMARY, RISKS, REWRITE PRIORITIES.",
      },
      {
        role: "user",
        content: `Review these blog posts for duplication, template-feel, and editorial quality. Each item shows: slug | title | first 280 chars of body.\n\n${summary}`,
      },
    ],
  };
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.error(
      `[blog-opposing-review] OpenAI API ${res.status}: ${txt.slice(0, 500)}`,
    );
    return;
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";
  console.log("\n[blog-opposing-review] OpenAI review:\n" + text + "\n");
}

async function main() {
  // 1. Always run uniqueness gate (must exit 0)
  const uniq = join(SCRIPT_DIR, "check-blog-uniqueness.mjs");
  const code = run(process.execPath, [uniq]);
  if (code !== 0) process.exit(code);

  // 2. Opt-in LLM review
  if (process.env.BLOG_LLM_REVIEW !== "1") {
    console.log(
      "[blog-opposing-review] BLOG_LLM_REVIEW!=1 — skipping LLM pass (uniqueness OK).",
    );
    return;
  }
  if (!process.env.OPENAI_API_KEY) {
    console.log(
      "[blog-opposing-review] OPENAI_API_KEY not set — skipping LLM pass.",
    );
    return;
  }

  const dir = await findBlogDir();
  if (!dir) return;
  const files = await listPosts(dir);
  const items = [];
  for (const f of files) {
    const raw = await readFile(f, "utf8");
    const { fm, body } = splitFm(raw);
    const slug = basename(f).replace(/\.(md|mdx)$/i, "");
    const title = fmField(fm, "title") || slug;
    const opening = body.replace(/\s+/g, " ").trim().slice(0, 280);
    items.push(`- ${slug} | ${title} | ${opening}`);
  }
  if (items.length === 0) return;
  const summary = items.join("\n");
  await callOpenAI(summary);
}

main().catch((err) => {
  console.error("[blog-opposing-review] unexpected:", err);
  // Do not fail build on reviewer errors.
});
