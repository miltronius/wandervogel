/**
 * Swiss-style hiking time approximation — not ORS's flat-terrain walking
 * duration, which under-counts ascent. Roughly: 4 km/h on the flat, plus
 * 1 h per 400 m of ascent, plus 1 h per 800 m of descent. A heuristic, not
 * a substitute for curated/experience-based estimates on technical terrain.
 */
export function estimateHikingMinutes(distanceM: number, ascentM: number, descentM: number): number {
  const flatMinutes = (distanceM / 1000 / 4) * 60;
  const ascentMinutes = (ascentM / 400) * 60;
  const descentMinutes = (descentM / 800) * 60;
  return Math.round(flatMinutes + ascentMinutes + descentMinutes);
}
