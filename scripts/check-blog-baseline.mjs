/**
 * TRG blog baseline — depth + conversion link.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const BLOG_DIR = path.join(process.cwd(), "src", "content", "blog");
const MIN_WORDS = 450;
const MIN_H2 = 3;

function parseFrontmatter(raw) {
  if (!raw.startsWith("---")) return { data: {}, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { data: {}, body: raw };
  const block = raw.slice(3, end).trim();
  const data = {};
  for (const line of block.split("\n")) {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    )
      v = v.slice(1, -1);
    if (v === "true") data[m[1]] = true;
    else if (v === "false") data[m[1]] = false;
    else data[m[1]] = v;
  }
  return { data, body: raw.slice(end + 4) };
}

function countWords(md) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*]\([^)]*\)/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

function countH2(md) {
  return (md.match(/^##\s+/gm) || []).length;
}

async function main() {
  const files = (await readdir(BLOG_DIR)).filter((f) => /\.(md|mdx)$/i.test(f));
  const failures = [];
  for (const file of files) {
    const raw = await readFile(path.join(BLOG_DIR, file), "utf8");
    const { data, body } = parseFrontmatter(raw);
    if (data.draft === true) continue;
    const wc = countWords(body);
    const h2 = countH2(body);
    if (wc < MIN_WORDS)
      failures.push(`${file}: ${wc} words (min ${MIN_WORDS})`);
    if (h2 < MIN_H2) failures.push(`${file}: ${h2} H2 (min ${MIN_H2})`);
    if (!body.includes("/pricing/") && !body.includes("/contact/")) {
      failures.push(`${file}: add /pricing/ or /contact/ markdown link`);
    }
  }
  if (failures.length) {
    console.error("TRG blog baseline failed:");
    failures.forEach((f) => console.error("- " + f));
    process.exit(1);
  }
  console.log("TRG blog baseline passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
