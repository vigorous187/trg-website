import { pathToFileURL } from "node:url";

export const ZARAZ_TOKEN_ENV = "CLOUDFLARE_ZARAZ_READ_TOKEN";

export function buildZarazConfigRequest({ token, zoneId }) {
  if (!token || !zoneId) throw new Error(`${ZARAZ_TOKEN_ENV} and CLOUDFLARE_ZONE_ID are required`);
  return {
    url: `https://api.cloudflare.com/client/v4/zones/${zoneId}/settings/zaraz/config`,
    options: { method: "GET", headers: { Authorization: `Bearer ${token}` } },
  };
}

export function auditZarazConfig(config) {
  return config?.settings?.autoInjectScript === false ? [] : ["Zaraz autoInjectScript must be false"];
}

async function main() {
  const request = buildZarazConfigRequest({ token: process.env[ZARAZ_TOKEN_ENV], zoneId: process.env.CLOUDFLARE_ZONE_ID });
  const response = await fetch(request.url, request.options);
  if (!response.ok) throw new Error(`Cloudflare Zaraz read failed with HTTP ${response.status}`);
  const body = await response.json();
  if (!body.success) throw new Error("Cloudflare Zaraz read returned an unsuccessful response");
  const failures = auditZarazConfig(body.result);
  if (failures.length) throw new Error(`TRG consent release blocked:\n- ${failures.join("\n- ")}`);
  console.log("TRG Zaraz consent release preflight passed.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
