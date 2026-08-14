const CANONICAL_HOST = "torontorestaurantgrowth.ca";

export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.hostname === `www.${CANONICAL_HOST}`) {
    url.protocol = "https:";
    url.hostname = CANONICAL_HOST;
    return Response.redirect(url.toString(), 301);
  }

  const response = await context.next();

  // Cloudflare serves the built error asset at /404; keep the HTTP contract.
  if ((url.pathname === "/404" || url.pathname === "/404/") && response.ok) {
    const headers = new Headers(response.headers);
    headers.set("X-Robots-Tag", "noindex, nofollow");
    headers.set("Cache-Control", "no-store");
    return new Response(response.body, { status: 404, statusText: "Not Found", headers });
  }

  if (response.status === 404) {
    const headers = new Headers(response.headers);
    headers.set("X-Robots-Tag", "noindex, nofollow");
    return new Response(response.body, { status: 404, statusText: response.statusText, headers });
  }

  return response;
}
