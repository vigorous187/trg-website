#!/usr/bin/env node
/**
 * Patch TRG Tally forms via API (audit + shared lead magnet).
 *
 *   API_TALLY=$(cc-vault get api-tally) node scripts/patch-trg-tally-forms.mjs
 *   API_TALLY=$(cc-vault get api-tally) node scripts/patch-trg-tally-forms.mjs --audit-only
 *   API_TALLY=$(cc-vault get api-tally) node scripts/patch-trg-tally-forms.mjs --lead-magnet-only
 */
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const TOKEN = process.env.API_TALLY;
const API = "https://api.tally.so";
const SITE = "https://torontorestaurantgrowth.ca";
const NOTIFY_EMAIL = "hello@torontorestaurantgrowth.ca";

const AUDIT_FORM_ID = "2Evezg";
const LEAD_MAGNET_FORM_ID = process.env.PUBLIC_TALLY_LEAD_MAGNET || "Xxg9Kd";

const SERVICE_OPTIONS = [
  "Website Design",
  "Social Media Management",
  "Google Maps & SEO",
  "Review Management",
  "Grand Opening Marketing",
];

const REFERRAL_OPTIONS = ["Google", "Referral", "Social Media", "Other"];

const LEAD_MAGNET_RESOURCES = {
  reviews: {
    label: "Google Review Response Templates",
    pdfPath: "/resources/downloads/google-review-response-templates.pdf",
  },
  seoChecklist: {
    label: "Restaurant SEO Checklist",
    pdfPath: "/resources/downloads/restaurant-seo-checklist.pdf",
  },
  grandOpening: {
    label: "Restaurant Grand Opening Timeline",
    pdfPath: "/resources/downloads/restaurant-grand-opening-timeline.pdf",
  },
};

if (!TOKEN) {
  console.error(
    "Missing API_TALLY. Run: API_TALLY=$(cc-vault get api-tally) node scripts/patch-trg-tally-forms.mjs",
  );
  process.exit(1);
}

const u = () => randomUUID();

function formTitle(text) {
  const groupUuid = u();
  return [
    {
      uuid: u(),
      type: "FORM_TITLE",
      groupUuid,
      groupType: "TEXT",
      payload: { html: text, title: text },
    },
  ];
}

function textBlock(html) {
  return [
    {
      uuid: u(),
      type: "TEXT",
      groupUuid: u(),
      groupType: "TEXT",
      payload: { html },
    },
  ];
}

function title(text, groupUuid = u()) {
  return [
    {
      uuid: u(),
      type: "TITLE",
      groupUuid,
      groupType: "QUESTION",
      payload: { html: text },
    },
  ];
}

function inputText(titleHtml, opts = {}) {
  const inputGroupUuid = u();
  return [
    ...title(titleHtml),
    {
      uuid: u(),
      type: "INPUT_TEXT",
      groupUuid: inputGroupUuid,
      groupType: "INPUT_TEXT",
      payload: {
        isRequired: !!opts.required,
        placeholder: opts.placeholder ?? "",
        ...(opts.hidden ? { isHidden: true } : {}),
      },
    },
  ];
}

function inputEmail(titleHtml, opts = {}) {
  const inputGroupUuid = u();
  return [
    ...title(titleHtml),
    {
      uuid: u(),
      type: "INPUT_EMAIL",
      groupUuid: inputGroupUuid,
      groupType: "INPUT_EMAIL",
      payload: {
        isRequired: opts.required !== false,
        placeholder: opts.placeholder ?? "",
      },
    },
  ];
}

function inputPhone(titleHtml, opts = {}) {
  const inputGroupUuid = u();
  return [
    ...title(titleHtml),
    {
      uuid: u(),
      type: "INPUT_PHONE_NUMBER",
      groupUuid: inputGroupUuid,
      groupType: "INPUT_PHONE_NUMBER",
      payload: {
        isRequired: !!opts.required,
        placeholder: opts.placeholder ?? "Optional",
      },
    },
  ];
}

function textarea(titleHtml, opts = {}) {
  const inputGroupUuid = u();
  return [
    ...title(titleHtml),
    {
      uuid: u(),
      type: "TEXTAREA",
      groupUuid: inputGroupUuid,
      groupType: "TEXTAREA",
      payload: {
        isRequired: !!opts.required,
        placeholder: opts.placeholder ?? "",
      },
    },
  ];
}

function dropdown(titleHtml, optionTexts, opts = {}) {
  const blocks = [];
  blocks.push(...title(titleHtml));
  const groupUuid = u();
  const n = optionTexts.length;
  optionTexts.forEach((text, index) => {
    blocks.push({
      uuid: u(),
      type: "DROPDOWN_OPTION",
      groupUuid,
      groupType: "DROPDOWN",
      payload: {
        index,
        isFirst: index === 0,
        isLast: index === n - 1,
        text,
        ...(opts.required && index === 0 ? { isRequired: true } : {}),
      },
    });
  });
  return blocks;
}

function multipleChoice(titleHtml, optionTexts) {
  const blocks = [];
  blocks.push(...title(titleHtml));
  const groupUuid = u();
  const n = optionTexts.length;
  optionTexts.forEach((text, index) => {
    blocks.push({
      uuid: u(),
      type: "MULTIPLE_CHOICE_OPTION",
      groupUuid,
      groupType: "MULTIPLE_CHOICE",
      payload: {
        index,
        isFirst: index === 0,
        isLast: index === n - 1,
        text,
        ...(index === 0 ? { hasBadge: false, badgeType: "OFF" } : {}),
      },
    });
  });
  return blocks;
}

function auditFormBlocks() {
  return [
    ...formTitle("Book Your Free Google Audit"),
    ...textBlock(
      "<p>15-minute diagnosis of your Google presence. No pitch — we'll email you within one business day to schedule.</p>",
    ),
    ...inputText("Restaurant name", {
      required: true,
      placeholder: "e.g. Mystic Caribbean Resto & Bar",
    }),
    ...inputText("Your name", {
      required: true,
      placeholder: "e.g. Alex Patel",
    }),
    ...inputEmail("Email", {
      required: true,
      placeholder: "you@restaurant.com",
    }),
    ...inputPhone("Phone", {
      required: false,
      placeholder: "Optional — for scheduling only",
    }),
    ...multipleChoice("Services interested in", SERVICE_OPTIONS),
    ...dropdown("How did you hear about us?", REFERRAL_OPTIONS, {
      required: false,
    }),
    ...textarea("Anything else you want us to know?", {
      required: false,
      placeholder: "Budget, timeline, specific goals, number of locations…",
    }),
  ];
}

function leadMagnetBlocks() {
  const resourceField = inputText("Resource", {
    required: true,
    hidden: true,
    placeholder: "reviews | seoChecklist | grandOpening",
  });
  return [
    ...formTitle("Download Your Free Resource"),
    ...textBlock(
      "<p>Enter your details below. You'll get instant access to the PDF on the next screen.</p>",
    ),
    ...resourceField,
    ...inputText("Restaurant name", {
      required: true,
      placeholder: "Your restaurant",
    }),
    ...inputEmail("Email", { required: true }),
  ];
}

const AUDIT_SETTINGS = {
  language: "en",
  hasProgressBar: false,
  hasPartialSubmissions: false,
  pageAutoJump: false,
  saveForLater: true,
  redirectOnCompletion: `${SITE}/contact/thank-you/`,
  hasSelfEmailNotifications: true,
  selfEmailTo: NOTIFY_EMAIL,
  selfEmailSubject: "[New Audit Request] {{Restaurant name}} — {{Email}}",
  metaSiteName: "Toronto Restaurant Growth",
  metaTitle: "Book a Free Google Audit",
  metaDescription:
    "Free 15-minute Google audit for independent Toronto restaurants. No pitch.",
};

const LEAD_MAGNET_SETTINGS = {
  language: "en",
  hasProgressBar: false,
  hasPartialSubmissions: false,
  pageAutoJump: false,
  saveForLater: false,
  hasSelfEmailNotifications: true,
  selfEmailTo: NOTIFY_EMAIL,
  selfEmailSubject: "[Lead Magnet] {{Resource}} — {{Restaurant name}}",
  metaSiteName: "Toronto Restaurant Growth",
  metaTitle: "TRG Resource Download",
  metaDescription:
    "Free restaurant marketing resources from Toronto Restaurant Growth.",
};

async function patchForm(formId, { blocks, settings, name }) {
  const body = {
    status: "PUBLISHED",
    ...(name ? { name } : {}),
    blocks,
    settings,
  };
  const res = await fetch(`${API}/forms/${formId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(
      `HTTP ${res.status} patching ${formId}: ${text.slice(0, 2500)}`,
    );
    throw new Error("Tally API PATCH error");
  }
  return JSON.parse(text);
}

async function main() {
  const auditOnly = process.argv.includes("--audit-only");
  const leadOnly = process.argv.includes("--lead-magnet-only");
  const runAll = !auditOnly && !leadOnly;

  if (runAll || auditOnly) {
    await patchForm(AUDIT_FORM_ID, {
      name: "TRG — Free Google Audit",
      blocks: auditFormBlocks(),
      settings: AUDIT_SETTINGS,
    });
    console.log(`Patched audit form: https://tally.so/r/${AUDIT_FORM_ID}`);
  }

  if (runAll || leadOnly) {
    await patchForm(LEAD_MAGNET_FORM_ID, {
      name: "TRG — Lead Magnet Download",
      blocks: leadMagnetBlocks(),
      settings: LEAD_MAGNET_SETTINGS,
    });
    console.log(
      `Patched lead magnet form: https://tally.so/r/${LEAD_MAGNET_FORM_ID}`,
    );
    writeFileSync(
      join(ROOT, ".env.tally.generated"),
      `PUBLIC_TALLY_LEAD_MAGNET=${LEAD_MAGNET_FORM_ID}\n`,
      "utf8",
    );
  }

  console.log("\nResource PDF paths (host on site):");
  for (const [key, val] of Object.entries(LEAD_MAGNET_RESOURCES)) {
    console.log(`  ${key}: ${SITE}${val.pdfPath}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
