const CANONICAL_HOST = "torontorestaurantgrowth.ca";

export async function onRequest(context) {
  const url = new URL(context.request.url);

  // HTTPS www → apex. HTTP www → HTTPS www is zone Always Use HTTPS, which
  // runs before Pages Functions, so this file cannot collapse that to one hop.
  if (url.hostname === `www.${CANONICAL_HOST}`) {
    url.protocol = "https:";
    url.hostname = CANONICAL_HOST;
    return Response.redirect(url.toString(), 301);
  }

  const response = await context.next();

  // dist/404.html is also a real asset at /404 (200). Serve it as HTTP 404.
  // /404/ 308s to /404 via Pages HTML extensionless redirects — leave that hop.
  if (url.pathname === "/404" && response.ok) {
    return new Response(response.body, {
      status: 404,
      headers: response.headers,
    });
  }

  return response;
}
