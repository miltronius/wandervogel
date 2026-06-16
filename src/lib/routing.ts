import type { ElevationPoint, LatLng } from "../types";

// Same-origin proxy (api/route.ts on Vercel, mirrored by a Vite dev-server
// middleware locally) — keeps the ORS key server-side only, never shipped
// to the browser bundle.
const PROXY_URL = "/api/route";

export type RouteProfile = "foot-hiking" | "foot-walking";

export class RoutingError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "RoutingError";
  }
}

export interface RoutingResult {
  geometry: LatLng[];
  elevationProfile: ElevationPoint[];
  distanceM: number;
  ascentM: number;
  descentM: number;
}

function haversineM(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.asin(Math.sqrt(x));
}

/**
 * Routes a sequence of waypoints onto real hiking trails via OpenRouteService.
 * Throws RoutingError if the key is missing, the request fails, or ORS can't
 * find a path between the given points.
 */
export async function fetchHikingRoute(
  waypoints: LatLng[],
  profile: RouteProfile = "foot-hiking",
): Promise<RoutingResult> {
  if (waypoints.length < 2) {
    throw new RoutingError("Mindestens zwei Wegpunkte nötig.");
  }

  let res: Response;
  try {
    res = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile,
        coordinates: waypoints.map((w) => [w.lng, w.lat]),
        elevation: true,
      }),
    });
  } catch (err) {
    throw new RoutingError("Routing-Anfrage fehlgeschlagen (Netzwerk).", err);
  }

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error?.message ?? "";
    } catch {
      // ignore — body wasn't JSON
    }
    throw new RoutingError(
      detail || `OpenRouteService antwortete mit Status ${res.status}.`,
    );
  }

  const geojson = await res.json();
  const feature = geojson?.features?.[0];
  if (!feature) {
    throw new RoutingError("Keine Route zwischen diesen Punkten gefunden.");
  }

  const coords: [number, number, number?][] = feature.geometry.coordinates;
  const geometry: LatLng[] = coords.map(([lng, lat]) => ({ lat, lng }));

  const elevationProfile: ElevationPoint[] = [];
  let cumDist = 0;
  for (let i = 0; i < coords.length; i++) {
    const [lng, lat, ele] = coords[i];
    if (i > 0) cumDist += haversineM({ lat: coords[i - 1][1], lng: coords[i - 1][0] }, { lat, lng });
    elevationProfile.push({ distanceM: cumDist, elevationM: ele ?? 0, lat, lng });
  }

  const summary = feature.properties?.summary ?? {};
  const ascentExtra = feature.properties?.ascent;
  const descentExtra = feature.properties?.descent;

  return {
    geometry,
    elevationProfile,
    distanceM: summary.distance ?? cumDist,
    ascentM: ascentExtra ?? computeGain(elevationProfile).ascent,
    descentM: descentExtra ?? computeGain(elevationProfile).descent,
  };
}

function computeGain(profile: ElevationPoint[]): { ascent: number; descent: number } {
  let ascent = 0;
  let descent = 0;
  for (let i = 1; i < profile.length; i++) {
    const diff = profile[i].elevationM - profile[i - 1].elevationM;
    if (diff > 0) ascent += diff;
    else descent += -diff;
  }
  return { ascent, descent };
}

/** Finds the route segment (by start index) nearest to a clicked point, for inserting a via-waypoint "in between". */
export function nearestSegmentInsertIndex(waypoints: LatLng[], click: LatLng): number {
  let bestIndex = waypoints.length - 1;
  let bestDist = Infinity;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const dist = pointToSegmentDistance(click, waypoints[i], waypoints[i + 1]);
    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = i + 1;
    }
  }
  return bestIndex;
}

function pointToSegmentDistance(p: LatLng, a: LatLng, b: LatLng): number {
  const ax = a.lng, ay = a.lat;
  const bx = b.lng, by = b.lat;
  const px = p.lng, py = p.lat;
  const dx = bx - ax, dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return Math.hypot(px - projX, py - projY);
}
