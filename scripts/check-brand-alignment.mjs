import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(process.cwd(), "src");
const SCAN_DIRS = ["pages", "components", "layouts"];
const FORBIDDEN = [
  /\brestaurants?\s+and\s+local\s+business(es)?\b/i,
  /\blocal\s+business(es)?\b/i,
  /\bgeneric\s+business(es)?\b/i,
  /\bhome service(s)?\b/i,
  /\bcontractor(s)?\b/i,
];

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(fullPath)));
      continue;
    }
    if (
      entry.name.endsWith(".astro") ||
      entry.name.endsWith(".mdx") ||
      entry.name.endsWith(".md")
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

function shouldSkip(relPath) {
  return relPath.includes("/blog/");
}

async function main() {
  const violations = [];
  for (const dir of SCAN_DIRS) {
    const target = path.join(ROOT, dir);
    const files = await listFiles(target);
    for (const file of files) {
      const rel = path.relative(process.cwd(), file);
      if (shouldSkip(rel)) continue;
      const content = await readFile(file, "utf8");
      for (const pattern of FORBIDDEN) {
        if (pattern.test(content)) {
          violations.push(`${rel}: matches ${pattern}`);
        }
      }
    }
  }

  if (violations.length > 0) {
    console.error("TRG brand alignment check failed:");
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    process.exit(1);
  }

  console.log("TRG brand alignment check passed.");
}

main().catch((error) => {
  console.error("Failed to run TRG brand alignment check:", error);
  process.exit(1);
});
