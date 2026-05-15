/**
 * TRG: draft slot from automation/topic-queue.json (minimal valid frontmatter).
 */
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import { constants as fsConstants } from "node:fs";

const ROOT = process.cwd();
const queueFile = path.join(ROOT, "automation", "topic-queue.json");
const blogDir = path.join(ROOT, "src", "content", "blog");
const runsDir = path.join(ROOT, "automation", "blog-runs");

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

async function main() {
  const raw = JSON.parse(await readFile(queueFile, "utf8"));
  const pending = Array.isArray(raw) ? raw : raw.pending || [];
  const today = new Date().toISOString().slice(0, 10);
  let picked = null;
  for (const entry of pending) {
    if (!entry?.slug) continue;
    const mdx = path.join(blogDir, `${entry.slug}.mdx`);
    if (!(await fileExists(mdx))) {
      picked = entry;
      break;
    }
  }
  if (!picked) {
    console.log("No pending topic without file — skipping.");
    return;
  }

  const branch = `automation/blog/${isoWeek()}-${picked.slug}`;
  try {
    execSync("git fetch origin", { stdio: "pipe", cwd: ROOT });
  } catch {
    /* ignore */
  }
  const remote = execSync(`git ls-remote --heads origin "${branch}"`, {
    encoding: "utf8",
    cwd: ROOT,
  }).trim();
  if (remote) {
    console.log(`Branch ${branch} already exists — skipping.`);
    return;
  }
  try {
    execSync(`git checkout -b ${branch}`, { stdio: "inherit", cwd: ROOT });
  } catch {
    execSync(`git checkout ${branch}`, { stdio: "inherit", cwd: ROOT });
  }

  const title = String(picked.title).replace(/"/g, '\\"');
  const desc = String(picked.description || "Draft for editorial.")
    .slice(0, 160)
    .replace(/"/g, '\\"');
  const cat = String(picked.category || "Strategy");

  const fm = `---
title: "${title}"
description: "${desc}"
author: "Toronto Restaurant Growth"
publishDate: "${picked.publishDate || today}"
category: "${cat}"
readTime: "8 min read"
tags: ["draft", "toronto"]
draft: true
howCreated: human-outlined-queue
---

## Draft

Replace with production copy. Link to [pricing](/pricing/) or [contact](/contact/) before publishing.

## How this was created

Queued in \`automation/topic-queue.json\`.

## Outline section

${desc}

## Checklist

- Confirm GBP category matches cuisine.
- Align NAP sitewide.
- Track reservations from blog CTAs.
`;

  await mkdir(blogDir, { recursive: true });
  const outPath = path.join(blogDir, `${picked.slug}.mdx`);
  await writeFile(outPath, fm, "utf8");
  await mkdir(runsDir, { recursive: true });
  const logPath = path.join(runsDir, `${today}.md`);
  await writeFile(logPath, `# Blog run ${today}\n- ${picked.slug}\n`, {
    flag: "a",
  });
  execSync(`git add "${outPath}" "${logPath}"`, {
    stdio: "inherit",
    cwd: ROOT,
  });
  execSync(`git commit -m "chore(blog): draft slot ${picked.slug}"`, {
    stdio: "inherit",
    cwd: ROOT,
  });
  execSync(`git push -u origin ${branch}`, { stdio: "inherit", cwd: ROOT });
  try {
    execSync(
      `gh pr create --head ${branch} --title "Blog draft: ${picked.slug}" --body "TRG automated draft."`,
      { stdio: "inherit", cwd: ROOT, env: { ...process.env } },
    );
  } catch {
    console.log("gh pr create failed");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
