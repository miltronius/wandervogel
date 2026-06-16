/**
 * Shared OpenRouteService proxy logic, used by both the Vercel serverless
 * function (api/route.ts, production) and the Vite dev-server middleware
 * (vite.config.ts, local `npm run dev`) so the ORS key never reaches the
 * browser in either environment.
 */
const ORS_BASE_URL = "https://api.openrouteservice.org/v2/directions";

// Allowlist: prevents the client-supplied `profile` field from being used to
// hit arbitrary ORS endpoints through this proxy.
const ALLOWED_PROFILES = new Set(["foot-hiking", "foot-walking"]);
const DEFAULT_PROFILE = "foot-hiking";

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

  const { profile, ...orsBody } = (requestBody ?? {}) as { profile?: string } & Record<string, unknown>;
  const resolvedProfile = profile && ALLOWED_PROFILES.has(profile) ? profile : DEFAULT_PROFILE;

  const res = await fetch(`${ORS_BASE_URL}/${resolvedProfile}/geojson`, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(orsBody),
  });

  const body = await res.json().catch(() => ({ error: { message: "Ungültige Antwort von OpenRouteService." } }));
  return { status: res.status, body };
}
