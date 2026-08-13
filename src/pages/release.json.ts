import type { APIRoute } from "astro";

export const prerender = true;

const releaseCommit = import.meta.env["PUBLIC_RELEASE_COMMIT"] || "local";
const releaseBranch = import.meta.env["PUBLIC_RELEASE_BRANCH"] || "local";

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      commit: releaseCommit,
      branch: releaseBranch,
      site: "toronto-restaurant-growth",
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
    },
  );
