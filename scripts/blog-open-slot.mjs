/**
 * TRG blog slot — opens one PR per topic from automation/topic-queue.json.
 * When BLOG_AUTO_GENERATE=1 (default in CI), drafts full body via OpenAI.
 *
 * A topic already published, or already opened as a PR, is skipped.
 * An existing automation/blog branch for that slug is updated or reused.
 * New branches are automation/blog/<slug> (no ISO week), so the next run
 * finds the same branch instead of opening another PR.
 */
import { readFile, writeFile, mkdir, access, readdir } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import { pathToFileURL } from "node:url";
import { generateBlogBody } from "./blog-generate-body.mjs";

const ROOT = process.cwd();
const queueFile = path.join(ROOT, "automation", "topic-queue.json");
const blogDir = path.join(ROOT, "src", "content", "blog");
const runsDir = path.join(ROOT, "automation", "blog-runs");
const BRANCH_PREFIX = "automation/blog/";

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

function yamlQuote(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed`);
}

function tryRun(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });
  return r.status === 0;
}

function capture(cmd, args) {
  return spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
  });
}

export function normalizeBranchName(name) {
  return String(name || "")
    .replace(/^refs\/heads\//, "")
    .replace(/^origin\//, "");
}

export function slugFromBlogBranch(branchName) {
  const name = normalizeBranchName(branchName);
  if (!name.startsWith(BRANCH_PREFIX)) return null;
  const rest = name.slice(BRANCH_PREFIX.length);
  if (!rest || rest.includes("/")) return null;
  // Older runs used automation/blog/<year>-W<week>-<slug>, which made a new
  // branch (and a new PR) every Monday for the same unpublished topic.
  const week = rest.match(/^\d{4}-W\d{1,2}-(.+)$/);
  return week ? week[1] : rest;
}

export function branchForSlug(slug) {
  return `${BRANCH_PREFIX}${slug}`;
}

export function parseRemoteBlogBranches(stdout) {
  return String(stdout || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => normalizeBranchName(line.split("\t")[1] || ""))
    .filter(Boolean);
}

export function prMatchesTopic(pr, slug) {
  if (!pr || !slug) return false;
  if (slugFromBlogBranch(pr.headRefName) === slug) return true;
  const title = String(pr.title || "");
  return (
    title === `Blog: ${slug}` ||
    title === `Blog draft: ${slug}` ||
    title.includes(slug)
  );
}

export function slugsWithPullRequests(knownSlugs, pulls) {
  const slugs = new Set();
  const list = Array.isArray(pulls) ? pulls : [];
  for (const slug of knownSlugs || []) {
    if (list.some((pr) => prMatchesTopic(pr, slug))) slugs.add(slug);
  }
  for (const pr of list) {
    const slug = slugFromBlogBranch(pr.headRefName);
    if (slug) slugs.add(slug);
  }
  return slugs;
}

export function pickTopic(
  pending,
  { topicSlug: forced = "", publishedSlugs = new Set(), prSlugs = new Set() } = {},
) {
  if (forced) {
    const found = (pending || []).find((entry) => entry?.slug === forced);
    if (!found) throw new Error(`Topic slug not found in queue: ${forced}`);
    return found;
  }
  for (const entry of pending || []) {
    if (!entry?.slug) continue;
    if (publishedSlugs.has(entry.slug)) continue;
    if (prSlugs.has(entry.slug)) continue;
    return entry;
  }
  return null;
}

export function findExistingSlot(slug, { branches = [], pulls = [] } = {}) {
  const matchingBranches = [
    ...new Set(
      branches
        .map((name) => normalizeBranchName(name))
        .filter((name) => slugFromBlogBranch(name) === slug),
    ),
  ].sort((a, b) => a.localeCompare(b));
  const matchingPulls = pulls
    .filter((pr) => prMatchesTopic(pr, slug))
    .slice()
    .sort((a, b) =>
      String(a.createdAt || "").localeCompare(String(b.createdAt || "")),
    );
  const openPr =
    matchingPulls.find(
      (pr) => String(pr.state || "").toUpperCase() === "OPEN",
    ) || null;
  return {
    branch: matchingBranches[0] || null,
    openPr,
    pulls: matchingPulls,
  };
}

export function decideSlotAction({
  slug,
  existing,
  forceRegenerate: force = false,
  placeholder = false,
}) {
  const pulls = existing?.pulls || [];
  const remoteBranch = existing?.branch || null;
  const openPr = existing?.openPr || null;
  const hasPr = pulls.length > 0;
  if (!remoteBranch) {
    if (hasPr) {
      return {
        action: "skip",
        branch: null,
        pr: openPr || pulls[0],
        createPr: false,
      };
    }
    return {
      action: "create",
      branch: branchForSlug(slug),
      pr: null,
      createPr: true,
    };
  }
  if (force || placeholder) {
    return {
      action: "update",
      branch: remoteBranch,
      pr: openPr,
      createPr: !hasPr,
    };
  }
  return {
    action: "skip",
    branch: remoteBranch,
    pr: openPr || pulls[0] || null,
    createPr: !hasPr,
  };
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

function listRemoteBlogBranches() {
  const r = capture("git", [
    "ls-remote",
    "--heads",
    "origin",
    "refs/heads/automation/blog/*",
  ]);
  if (r.status !== 0) {
    throw new Error(
      `git ls-remote failed; refusing to open a blog PR without a branch check.\n${r.stderr || ""}`,
    );
  }
  return parseRemoteBlogBranches(r.stdout);
}

function listPullRequests(slugs) {
  const fields = [
    "number",
    "title",
    "headRefName",
    "state",
    "isDraft",
    "url",
    "createdAt",
  ];
  const listed = capture("gh", [
    "pr",
    "list",
    "--state",
    "all",
    "--limit",
    "200",
    "--json",
    fields.join(","),
  ]);
  if (listed.status !== 0) {
    throw new Error(
      `gh pr list failed; refusing to open a blog PR without an existing-PR check.\n${listed.stderr || ""}`,
    );
  }
  let pulls = JSON.parse(listed.stdout || "[]");
  if (pulls.length >= 200) {
    console.warn(
      "[blog-open-slot] PR list hit 200 rows; searching each queued slug too.",
    );
    for (const slug of slugs || []) {
      const extra = capture("gh", [
        "pr",
        "list",
        "--state",
        "all",
        "--limit",
        "50",
        "--search",
        slug,
        "--json",
        fields.join(","),
      ]);
      if (extra.status !== 0) {
        throw new Error(
          `gh pr list search failed for ${slug}; refusing to open a blog PR.\n${extra.stderr || ""}`,
        );
      }
      pulls = pulls.concat(JSON.parse(extra.stdout || "[]"));
    }
  }
  const byNumber = new Map();
  for (const pr of pulls) {
    if (pr?.number != null) byNumber.set(pr.number, pr);
  }
  return [...byNumber.values()];
}

function ensurePullRequest(branch, slug, generated) {
  const pulls = listPullRequests([slug]);
  const existing = pulls.find((pr) => prMatchesTopic(pr, slug));
  if (existing) {
    console.log(
      `[blog-open-slot] PR #${existing.number} already covers ${slug} (${existing.state}, ${existing.headRefName}). Not creating another.`,
    );
    return;
  }
  const title = generated ? `Blog: ${slug}` : `Blog draft: ${slug}`;
  const body = generated
    ? "Automated TRG blog post (AI-drafted, build gates passed). Review before merge."
    : "Automated TRG blog slot (outline draft). Replace body before merge.";
  const r = spawnSync(
    "gh",
    [
      "pr",
      "create",
      "--base",
      "main",
      "--head",
      branch,
      "--title",
      title,
      "--body",
      body,
    ],
    { cwd: ROOT, stdio: "inherit", env: process.env },
  );
  if (r.status !== 0) {
    throw new Error(
      `gh pr create failed for ${branch}. Not opening a second branch.`,
    );
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

async function listPublishedSlugs() {
  let names = [];
  try {
    names = await readdir(blogDir);
  } catch {
    return new Set();
  }
  return new Set(
    names
      .filter((name) => /\.(md|mdx)$/i.test(name))
      .map((name) => name.replace(/\.(md|mdx)$/i, "")),
  );
}

function logSkip(slug, decision) {
  const prLabel = decision.pr
    ? ` PR #${decision.pr.number} (${decision.pr.state || "open"})`
    : "";
  const where = decision.branch ? `branch ${decision.branch}` : "an existing PR";
  console.log(
    `[blog-open-slot] Skipping ${slug}: ${where} already covers this topic.${prLabel} Not opening another PR.`,
  );
}

async function commitAndPush(branch, outPath, logPath, generated, slug) {
  run("git", ["add", outPath, logPath]);
  run("git", [
    "commit",
    "-m",
    generated
      ? `chore(blog): generate post ${slug}`
      : `chore(blog): draft slot ${slug}`,
  ]);
  run("git", ["push", "-u", "origin", branch]);
}

async function main() {
  const raw = JSON.parse(await readFile(queueFile, "utf8"));
  const pending = Array.isArray(raw) ? raw : raw.pending || [];
  const today = new Date().toISOString().slice(0, 10);
  const knownSlugs = pending.map((entry) => entry?.slug).filter(Boolean);

  tryRun("git", ["fetch", "origin"]);
  tryRun("git", ["checkout", "main"]);
  tryRun("git", ["pull", "--ff-only", "origin", "main"]);

  const publishedSlugs = await listPublishedSlugs();
  const branches = listRemoteBlogBranches();
  const pulls = listPullRequests(knownSlugs);
  const prSlugs = slugsWithPullRequests(knownSlugs, pulls);
  const picked = pickTopic(pending, {
    topicSlug,
    publishedSlugs,
    prSlugs,
  });
  if (!picked) {
    console.log(
      "[blog-open-slot] No pending topic without a published post or existing PR — skipping.",
    );
    return;
  }
  if (publishedSlugs.has(picked.slug) && !forceRegenerate) {
    console.log(
      `[blog-open-slot] ${picked.slug} is already published — skipping.`,
    );
    return;
  }

  const existing = findExistingSlot(picked.slug, { branches, pulls });
  const outPath = path.join(blogDir, `${picked.slug}.mdx`);

  if (!existing.branch) {
    const decision = decideSlotAction({
      slug: picked.slug,
      existing,
      forceRegenerate,
      placeholder: false,
    });
    if (decision.action === "skip") {
      logSkip(picked.slug, decision);
      return;
    }
    const branch = decision.branch;
    run("git", ["checkout", "-b", branch]);
    const generated = await writePost(picked, outPath, today);
    await finishSlot({ branch, picked, outPath, today, generated, decision });
    return;
  }

  if (!tryRun("git", ["fetch", "origin", existing.branch])) {
    throw new Error(
      `Could not fetch existing blog branch ${existing.branch}; refusing to open a new one.`,
    );
  }
  run("git", ["checkout", "-B", existing.branch, `origin/${existing.branch}`]);
  const placeholder = await isPlaceholderPost(outPath);
  const decision = decideSlotAction({
    slug: picked.slug,
    existing,
    forceRegenerate,
    placeholder,
  });
  if (decision.action === "skip") {
    if (decision.createPr) {
      ensurePullRequest(decision.branch, picked.slug, !placeholder);
      return;
    }
    logSkip(picked.slug, decision);
    return;
  }

  const generated = await writePost(picked, outPath, today);
  await finishSlot({
    branch: decision.branch,
    picked,
    outPath,
    today,
    generated,
    decision,
  });
}

async function finishSlot({ branch, picked, outPath, today, generated, decision }) {
  await mkdir(runsDir, { recursive: true });
  const logPath = path.join(runsDir, `${today}-${picked.slug}.md`);
  await writeFile(
    logPath,
    `# Blog run ${today} — ${picked.slug}\n- Branch: ${branch}\n- Status: ${generated ? "AI-generated" : "outline"}\n`,
    "utf8",
  );
  await commitAndPush(branch, outPath, logPath, generated, picked.slug);
  if (decision.createPr) {
    ensurePullRequest(branch, picked.slug, generated);
    return;
  }
  const prLabel = decision.pr ? ` PR #${decision.pr.number}` : " the existing PR";
  console.log(
    `[blog-open-slot] Updated ${branch} for${prLabel}. Not opening another PR.`,
  );
}

const invokedDirectly =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedDirectly) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
