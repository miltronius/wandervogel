/**
 * Shared OpenRouteService proxy logic, used by both the Vercel serverless
 * function (api/route.ts, production) and the Vite dev-server middleware
 * (vite.config.ts, local `npm run dev`) so the ORS key never reaches the
 * browser in either environment.
 */
const ORS_URL = "https://api.openrouteservice.org/v2/directions/foot-hiking/geojson";

export interface ProxyResult {
  status: number;
  body: unknown;
}

export async function proxyOrsRequest(apiKey: string | undefined, requestBody: unknown): Promise<ProxyResult> {
  if (!apiKey) {
    return {
      status: 500,
      body: { error: { message: "ORS_API_KEY ist auf dem Server nicht konfiguriert." } },
    };
  }

  const res = await fetch(ORS_URL, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const body = await res.json().catch(() => ({ error: { message: "Ungültige Antwort von OpenRouteService." } }));
  return { status: res.status, body };
}
