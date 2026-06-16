/** WGS84 -> CH1903+/LV95 (swisstopo approximation) for 3D deep-link */
export function toLV95(lat: number, lng: number): [number, number] {
  const p = (lat * 3600 - 169028.66) / 10000;
  const l = (lng * 3600 - 26782.5) / 10000;
  const E = 2600072.37 + 211455.93 * l - 10938.51 * l * p - 0.36 * l * p * p - 44.54 * l * l * l;
  const N = 1200147.07 + 308807.95 * p + 3745.25 * l * l + 76.63 * p * p - 194.56 * l * l * p + 119.79 * p * p * p;
  return [Math.round(E), Math.round(N)];
}

export function swisstopoUrl(lat: number, lng: number, threeD: boolean): string {
  const [E, N] = toLV95(lat, lng);
  const base =
    "https://map.geo.admin.ch/#/map?lang=de&center=" + E + "," + N + "&z=9" +
    "&bgLayer=ch.swisstopo.pixelkarte-farbe&topic=ech&layers=ch.swisstopo.swisstlm3d-wanderwege";
  return base + (threeD ? "&3d=true" : "");
}

export type TravelMode = "transit" | "bicycling" | "driving";

export function gmaps(lat: number, lng: number, mode: TravelMode): string {
  return "https://www.google.com/maps/dir/?api=1&destination=" + lat + "," + lng + "&travelmode=" + mode;
}
