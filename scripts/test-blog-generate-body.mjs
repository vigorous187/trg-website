import assert from "node:assert/strict";
import test from "node:test";
import { generateBlogBody } from "./blog-generate-body.mjs";

function draftBody() {
  const words = Array.from({ length: 480 }, () => "guests").join(" ");
  return `## Maps visibility

${words}

- Confirm the GBP name matches the storefront
- Add today's menu as a link

## Reviews

Ask recent guests for a review after a good visit.

## Reservations

Point owners to [pricing](/pricing/) when they want a done-for-you plan.

## How this was created

Topic queued in automation/topic-queue.json. Body AI-drafted for human review.
`;
}

test("blog body generation uses OpenAI chat completions without a live key", async () => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.OPENAI_API_KEY;
  const previousModel = process.env.BLOG_LLM_MODEL;
  const calls = [];

  try {
    delete process.env.OPENAI_API_KEY;
    delete process.env.BLOG_LLM_MODEL;
    globalThis.fetch = async () => {
      throw new Error("fetch should not run without OPENAI_API_KEY");
    };
    await assert.rejects(
      () => generateBlogBody({ slug: "test-slug", title: "Test title" }),
      /OPENAI_API_KEY is not set/,
    );

    process.env.OPENAI_API_KEY = "test-openai-key";
    globalThis.fetch = async () =>
      new Response("invalid api key", { status: 401, statusText: "Unauthorized" });
    await assert.rejects(
      () => generateBlogBody({ slug: "test-slug", title: "Test title" }),
      /OpenAI API 401/,
    );

    const body = draftBody();
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options });
      const payload = JSON.parse(options.body);
      const content =
        payload.model === "gpt-5.6-sol"
          ? [{ type: "text", text: body }]
          : body;
      return new Response(
        JSON.stringify({ choices: [{ message: { content } }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };

    const generated = await generateBlogBody({
      slug: "test-slug",
      title: "Test title",
      description: "A practical guide",
      tags: ["toronto"],
    });
    assert.match(generated, /## How this was created/i);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://api.openai.com/v1/chat/completions");
    assert.equal(calls[0].options.method, "POST");
    assert.equal(
      calls[0].options.headers.Authorization,
      "Bearer test-openai-key",
    );
    const payload = JSON.parse(calls[0].options.body);
    assert.equal(payload.model, "gpt-5.6-terra");
    assert.equal(payload.reasoning_effort, "none");
    assert.equal(payload.max_completion_tokens, 8192);
    assert.deepEqual(
      payload.messages.map((message) => message.role),
      ["system", "user"],
    );
    assert.match(payload.messages[1].content, /test-slug/);
    assert.doesNotMatch(payload.messages[1].content, /Previous draft failed/);

    process.env.BLOG_LLM_MODEL = "gpt-5.6-sol";
    await generateBlogBody({ slug: "test-slug", title: "Test title" });
    const override = JSON.parse(calls[1].options.body);
    assert.equal(override.model, "gpt-5.6-sol");
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
    if (previousModel === undefined) delete process.env.BLOG_LLM_MODEL;
    else process.env.BLOG_LLM_MODEL = previousModel;
  }
});
