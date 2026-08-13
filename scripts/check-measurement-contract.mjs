import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INDEXNOW_KEY = "ae30d3d7-a441-4846-a8fc-59e36bdc205a";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function text(relativePath) {
  return readFile(path.join(ROOT, relativePath), "utf8");
}

async function scriptsUnder(relativePath) {
  const directory = path.join(ROOT, relativePath);
  const names = await readdir(directory);
  const scripts = await Promise.all(
    names
      .filter((name) => name.endsWith(".js"))
      .map((name) => readFile(path.join(directory, name), "utf8")),
  );
  return scripts.join("\n");
}

const [home, contact, resource, thankYou, sourceKey, builtKey, releaseJson, clientScripts] =
  await Promise.all([
    text("dist/index.html"),
    text("dist/contact/index.html"),
    text("dist/resources/google-review-response-templates/index.html"),
    text("dist/contact/thank-you/index.html"),
    text(`public/${INDEXNOW_KEY}.txt`),
    text(`dist/${INDEXNOW_KEY}.txt`),
    text("dist/release.json"),
    scriptsUnder("dist/_astro"),
  ]);

assert(home.includes("GTM-WH4XSW4L"), "GTM container is missing from the homepage");
assert(home.includes("event: 'email_click'"), "email_click dataLayer contract is missing");
assert(
  home.includes('<link rel="canonical" href="https://torontorestaurantgrowth.ca/">'),
  "Homepage canonical is invalid",
);

assert(contact.includes('data-tally-form-id="2Evezg"'), "Audit Tally form ID is missing");
assert(contact.includes('data-tally-confirms-audit="true"'), "Audit confirmation marker is missing");
assert(resource.includes('data-tally-form-id="Xxg9Kd"'), "Lead-magnet Tally form ID is missing");
assert(clientScripts.includes("Tally.FormSubmitted"), "Official Tally success event is missing");
assert(clientScripts.includes("https://tally.so"), "Tally origin allowlist is missing");
assert(clientScripts.includes("submission_id"), "Unique Tally submission ID is not forwarded");
assert(clientScripts.includes("generate_lead"), "Success-only generate_lead contract is missing");

assert(thankYou.includes('content="noindex, follow"'), "Thank-you page is not noindex");
assert(
  thankYou.includes('<link rel="canonical" href="https://torontorestaurantgrowth.ca/contact/">'),
  "Thank-you canonical is not /contact/",
);
assert(!thankYou.includes("data-tally-embed"), "Thank-you page must not contain a Tally conversion listener");

assert(sourceKey === `${INDEXNOW_KEY}\n`, "Source IndexNow key file is not exact");
assert(builtKey === `${INDEXNOW_KEY}\n`, "Built IndexNow key file is not exact");

const release = JSON.parse(releaseJson);
const expectedCommit = process.env.PUBLIC_RELEASE_COMMIT || "local";
assert(release.commit === expectedCommit, "Built release commit identity is not exact");
assert(release.branch === (process.env.PUBLIC_RELEASE_BRANCH || "local"), "Built release branch identity is not exact");

console.log("TRG measurement and metadata contract passed.");
