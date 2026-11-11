import assert from "node:assert/strict";
import test from "node:test";
import {
  branchForSlug,
  decideSlotAction,
  findExistingSlot,
  parseRemoteBlogBranches,
  pickTopic,
  prMatchesTopic,
  slugFromBlogBranch,
  slugsWithPullRequests,
} from "./blog-open-slot.mjs";

const REVIEW = "restaurant-review-response-automation";
const NEXT = "brampton-restaurant-google-maps-case-pattern";

const queue = [
  { slug: "google-business-profile-menu-photos" },
  { slug: REVIEW },
  { slug: NEXT },
  { slug: "restaurant-website-speed-gta" },
];

function pr(number, week, state, extra = {}) {
  return {
    number,
    title:
      number === 28
        ? "Blog W39: restaurant review response automation"
        : `Blog: ${REVIEW}`,
    headRefName: `automation/blog/2026-W${week}-${REVIEW}`,
    state,
    createdAt: `2026-09-${String(number).padStart(2, "0")}T00:00:00Z`,
    ...extra,
  };
}

const reviewPulls = [
  pr(28, "39", "OPEN", { createdAt: "2026-09-23T12:08:34Z" }),
  pr(29, "40", "OPEN", { createdAt: "2026-09-28T20:11:19Z" }),
  pr(30, "41", "OPEN", { createdAt: "2026-10-05T21:21:53Z" }),
  pr(31, "42", "OPEN", { createdAt: "2026-10-12T21:48:45Z" }),
  pr(33, "43", "OPEN", { createdAt: "2026-10-19T19:24:50Z" }),
  pr(34, "44", "OPEN", { createdAt: "2026-10-26T19:29:03Z" }),
  pr(36, "45", "OPEN", { createdAt: "2026-11-02T22:24:46Z" }),
  pr(41, "46", "OPEN", { createdAt: "2026-11-09T23:05:27Z" }),
  {
    number: 32,
    title: "Fix production deploy workflow dispatch injection",
    headRefName: "security/fix-deploy-dispatch-sha",
    state: "OPEN",
    isDraft: true,
    createdAt: "2026-10-13T23:09:59Z",
  },
];

const remoteListing = reviewPulls
  .filter((item) => item.number !== 32)
  .map((item) => `abc\trefs/heads/${item.headRefName}`)
  .join("\n");

test("week-prefixed and stable blog branches share a slug", () => {
  assert.equal(
    slugFromBlogBranch(
      "refs/heads/automation/blog/2026-W46-restaurant-review-response-automation",
    ),
    REVIEW,
  );
  assert.equal(
    slugFromBlogBranch(`origin/${branchForSlug(REVIEW)}`),
    REVIEW,
  );
  assert.equal(slugFromBlogBranch("security/fix-deploy-dispatch-sha"), null);
  assert.equal(branchForSlug(NEXT), `automation/blog/${NEXT}`);
});

test("parses ls-remote blog heads", () => {
  const branches = parseRemoteBlogBranches(`${remoteListing}\n`);
  assert.equal(branches.length, 8);
  assert.equal(branches[0], reviewPulls[0].headRefName);
});

test("a deploy draft is not a blog topic match", () => {
  const deploy = reviewPulls.find((item) => item.number === 32);
  assert.equal(prMatchesTopic(deploy, REVIEW), false);
  assert.equal(
    prMatchesTopic(
      { title: `Blog: ${REVIEW}`, headRefName: "unrelated" },
      REVIEW,
    ),
    true,
  );
  assert.equal(
    prMatchesTopic(
      { title: `Blog draft: ${NEXT}`, headRefName: "unrelated" },
      NEXT,
    ),
    true,
  );
});

test("picks the next topic when this slug already has a PR", () => {
  const published = new Set(["google-business-profile-menu-photos"]);
  const prSlugs = slugsWithPullRequests(
    queue.map((entry) => entry.slug),
    reviewPulls,
  );
  assert.equal(prSlugs.has(REVIEW), true);
  assert.equal(prSlugs.has(NEXT), false);
  assert.equal(
    pickTopic(queue, { publishedSlugs: published, prSlugs })?.slug,
    NEXT,
  );
});

test("closed PRs still count as already opened", () => {
  const pulls = [{ ...reviewPulls[0], state: "CLOSED" }];
  const prSlugs = slugsWithPullRequests([REVIEW, NEXT], pulls);
  assert.equal(
    pickTopic(queue, {
      publishedSlugs: new Set(["google-business-profile-menu-photos"]),
      prSlugs,
    })?.slug,
    NEXT,
  );
});

test("reuses the oldest week branch and does not create a second PR", () => {
  const branches = parseRemoteBlogBranches(remoteListing);
  const existing = findExistingSlot(REVIEW, {
    branches,
    pulls: reviewPulls,
  });
  assert.equal(existing.branch, reviewPulls[0].headRefName);
  assert.equal(existing.openPr.number, 28);
  const decision = decideSlotAction({
    slug: REVIEW,
    existing,
    forceRegenerate: false,
    placeholder: false,
  });
  assert.equal(decision.action, "skip");
  assert.equal(decision.createPr, false);
  assert.equal(decision.branch, existing.branch);
});

test("a branch with no PR is updated or reused instead of duplicated", () => {
  const existing = findExistingSlot(NEXT, {
    branches: [branchForSlug(NEXT)],
    pulls: [],
  });
  const ready = decideSlotAction({
    slug: NEXT,
    existing,
    placeholder: false,
  });
  assert.equal(ready.action, "skip");
  assert.equal(ready.createPr, true);
  assert.equal(ready.branch, branchForSlug(NEXT));

  const outline = decideSlotAction({
    slug: NEXT,
    existing,
    placeholder: true,
  });
  assert.equal(outline.action, "update");
  assert.equal(outline.createPr, true);
});

test("a new topic gets one stable branch", () => {
  const decision = decideSlotAction({
    slug: NEXT,
    existing: { branch: null, openPr: null, pulls: [] },
  });
  assert.deepEqual(decision, {
    action: "create",
    branch: branchForSlug(NEXT),
    pr: null,
    createPr: true,
  });
});

test("an existing PR without a branch does not open another", () => {
  const existing = findExistingSlot(REVIEW, {
    branches: [],
    pulls: [{ ...reviewPulls[0], state: "MERGED" }],
  });
  const decision = decideSlotAction({
    slug: REVIEW,
    existing,
    forceRegenerate: true,
  });
  assert.equal(decision.action, "skip");
  assert.equal(decision.createPr, false);
});
