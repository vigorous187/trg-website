/**
 * TRG blog slot — opens PR from automation/topic-queue.json.
 * When BLOG_AUTO_GENERATE=1 (default in CI), drafts full body via Anthropic.
 */
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { execSync, spawnSync } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import { generateBlogBody } from "./blog-generate-body.mjs";

const ROOT = process.cwd();
const queueFile = path.join(ROOT, "automation", "topic-queue.json");
const blogDir = path.join(ROOT, "src", "content", "blog");
const runsDir = path.join(ROOT, "automation", "blog-runs");

const autoGenerate = process.env.BLOG_AUTO_GENERATE !== "0";
const forceRegenerate =
  process.env.BLOG_FORCE_REGENERATE === "1" ||
  process.argv.includes("--regenerate");
const topicSlug = process.env.BLOG_TOPIC_SLUG || "";

async function fileExists(p) {
  try {
    await access(p, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function isoWeek(d = new Date()) {
  const t = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t - y) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function yamlQuote(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function runBuild() {
  const r = spawnSync("npm", ["run", "build"], {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });
  if (r.status !== 0) {
    throw new Error("npm run build failed after generating post");
  }
}

function ensurePullRequest(branch, slug, generated) {
  const body = generated
    ? "Automated TRG blog post (AI-drafted, build gates passed). Review before merge."
    : "Automated TRG blog slot (outline draft). Replace body before merge.";
  const title = generated ? `Blog: ${slug}` : `Blog draft: ${slug}`;
  try {
    execSync(
      `gh pr create --head ${branch} --title ${JSON.stringify(title)} --body ${JSON.stringify(body)}`,
      { stdio: "inherit", cwd: ROOT, env: { ...process.env } },
    );
  } catch {
    console.log(`gh pr create failed for ${branch} — open PR manually.`);
  }
}

async function isPlaceholderPost(filePath) {
  if (!(await fileExists(filePath))) return true;
  const raw = await readFile(filePath, "utf8");
  return (
    /howCreated:\s*["']human-outlined-queue["']/i.test(raw) ||
    /Replace with production copy/i.test(raw) ||
    /## Draft/i.test(raw)
  );
}

function buildFrontmatter(picked, { generated, slotOpened }) {
  const howCreated = generated ? "automation-llm-ai" : "human-outlined-queue";
  const desc = String(picked.description || "Draft for editorial.")
    .slice(0, 160)
    .replace(/"/g, '\\"');
  const tags = JSON.stringify(picked.tags || ["toronto", "restaurants"]);
  return `---
title: "${yamlQuote(picked.title)}"
description: "${desc}"
author: "Toronto Restaurant Growth"
publishDate: "${picked.publishDate || slotOpened}"
category: "${picked.category || "Strategy"}"
readTime: "${picked.readTime || "8 min read"}"
tags: ${tags}
draft: true
howCreated: ${howCreated}
---

`;
}

async function writePost(picked, outPath, slotOpened) {
  let body;
  let generated = false;

  if (autoGenerate) {
    console.log(`[blog-open-slot] Generating body for ${picked.slug}…`);
    body = await generateBlogBody(picked);
    generated = true;
  } else {
    body = `## Draft

Replace with production copy. Link to [pricing](/pricing/) or [contact](/contact/) before publishing.

## How this was created

Queued in \`automation/topic-queue.json\`.
`;
  }

  const fm = buildFrontmatter(picked, { generated, slotOpened });
  await mkdir(blogDir, { recursive: true });
  await writeFile(outPath, fm + body, "utf8");
  console.log("[blog-open-slot] Running npm run build…");
  runBuild();
  return generated;
}

async function pickTopic(pending) {
  if (topicSlug) {
    const found = pending.find((entry) => entry.slug === topicSlug);
    if (!found) throw new Error(`Topic slug not found in queue: ${topicSlug}`);
    return found;
  }
  for (const entry of pending) {
    if (!entry?.slug) continue;
    const mdx = path.join(blogDir, `${entry.slug}.mdx`);
    if (!(await fileExists(mdx))) return entry;
  }
  return null;
}

async function main() {
  const raw = JSON.parse(await readFile(queueFile, "utf8"));
  const pending = Array.isArray(raw) ? raw : raw.pending || [];
  const today = new Date().toISOString().slice(0, 10);
  const picked = await pickTopic(pending);
  if (!picked) {
    console.log("No pending topic without file — skipping.");
    return;
  }

  const branch = `automation/blog/${isoWeek()}-${picked.slug}`;
  const outPath = path.join(blogDir, `${picked.slug}.mdx`);

  try {
    execSync("git fetch origin", { stdio: "pipe", cwd: ROOT });
  } catch {
    /* ignore */
  }

  try {
    execSync("git checkout main", { stdio: "inherit", cwd: ROOT });
    execSync("git pull --ff-only origin main", { stdio: "inherit", cwd: ROOT });
  } catch {
    /* ignore */
  }

  const remote = execSync(`git ls-remote --heads origin "${branch}"`, {
    encoding: "utf8",
    cwd: ROOT,
  }).trim();

  if (remote) {
    execSync(`git checkout ${branch}`, { stdio: "inherit", cwd: ROOT });
    const placeholder = await isPlaceholderPost(outPath);
    if (!forceRegenerate && !placeholder) {
      console.log(`Branch ${branch} already has content — skipping.`);
      return;
    }
  } else {
    execSync(`git checkout -b ${branch}`, { stdio: "inherit", cwd: ROOT });
  }

  const generated = await writePost(picked, outPath, today);

  await mkdir(runsDir, { recursive: true });
  const logPath = path.join(runsDir, `${today}-${picked.slug}.md`);
  await writeFile(
    logPath,
    `# Blog run ${today} — ${picked.slug}\n- Branch: ${branch}\n- Status: ${generated ? "AI-generated" : "outline"}\n`,
    "utf8",
  );

  execSync(`git add "${outPath}" "${logPath}"`, {
    stdio: "inherit",
    cwd: ROOT,
  });
  execSync(
    `git commit -m ${JSON.stringify(generated ? `chore(blog): generate post ${picked.slug}` : `chore(blog): draft slot ${picked.slug}`)}`,
    { stdio: "inherit", cwd: ROOT },
  );
  execSync(`git push -u origin ${branch}`, { stdio: "inherit", cwd: ROOT });
  ensurePullRequest(branch, picked.slug, generated);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
