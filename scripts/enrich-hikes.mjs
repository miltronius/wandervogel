#!/usr/bin/env node
/**
 * One-off data-fix pass: re-routes each curated hike's existing `route`
 * waypoints through OpenRouteService's foot-hiking profile, so distance/
 * ascent reflect real trail geometry instead of the original straight-line
 * guesses. Prints a before/after report; results get merged into
 * src/data/hikes.ts by hand (see README "Enriching the curated hikes").
 *
 * Usage: ORS_API_KEY=your-key-here node scripts/enrich-hikes.mjs
 */
import { transformSync } from "esbuild";
import { readFileSync, writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ORS_API_KEY = process.env.ORS_API_KEY;
const ORS_URL = "https://api.openrouteservice.org/v2/directions/foot-hiking/geojson";

if (!ORS_API_KEY) {
  console.error("Set ORS_API_KEY in the environment first (see README).");
  process.exit(1);
}

async function loadHikes() {
  const hikesPath = join(__dirname, "../src/data/hikes.ts");
  const src = readFileSync(hikesPath, "utf-8");
  const { code } = transformSync(src, { loader: "ts", format: "esm" });
  const tmpFile = join(tmpdir(), `hikes-enrich-${Date.now()}.mjs`);
  writeFileSync(tmpFile, code);
  try {
    const mod = await import(`file://${tmpFile}`);
    return mod.HIKES;
  } finally {
    unlinkSync(tmpFile);
  }
}

function haversineM(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.asin(Math.sqrt(x));
}

function computeGain(coords) {
  let ascent = 0;
  let descent = 0;
  for (let i = 1; i < coords.length; i++) {
    const diff = (coords[i][2] ?? 0) - (coords[i - 1][2] ?? 0);
    if (diff > 0) ascent += diff;
    else descent += -diff;
  }
  return { ascent, descent };
}

async function routeHike(hike) {
  const res = await fetch(ORS_URL, {
    method: "POST",
    headers: { Authorization: ORS_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      coordinates: hike.route.map(([lat, lng]) => [lng, lat]),
      elevation: true,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message || `HTTP ${res.status}`);
  }

  const geojson = await res.json();
  const feature = geojson.features?.[0];
  if (!feature) throw new Error("Keine Route gefunden.");

  const coords = feature.geometry.coordinates; // [lng, lat, ele][]
  let distanceM = 0;
  for (let i = 1; i < coords.length; i++) {
    distanceM += haversineM([coords[i - 1][1], coords[i - 1][0]], [coords[i][1], coords[i][0]]);
  }
  const { ascent, descent } = computeGain(coords);
  const route = coords.map(([lng, lat]) => [lat, lng]);
  const elevation = coords.map(([lng, lat, ele], i) => ({
    distanceM: i === 0 ? 0 : null, // filled below
    elevationM: ele ?? 0,
    lat,
    lng,
  }));
  let cum = 0;
  for (let i = 0; i < elevation.length; i++) {
    if (i > 0) cum += haversineM([route[i - 1][0], route[i - 1][1]], [route[i][0], route[i][1]]);
    elevation[i].distanceM = cum;
  }

  return { distanceM, ascentM: ascent, descentM: descent, route, elevation };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const hikes = await loadHikes();
  const results = [];

  for (const hike of hikes) {
    process.stdout.write(`Routing ${hike.id}... `);
    try {
      const result = await routeHike(hike);
      const oldDistKm = hike.dist;
      const newDistKm = (result.distanceM / 1000).toFixed(1);
      console.log(`ok — dist ${oldDistKm}km -> ${newDistKm}km, asc ${hike.asc}m -> ${Math.round(result.ascentM)}m`);
      results.push({ id: hike.id, ok: true, ...result });
    } catch (err) {
      console.log(`FAILED — ${err.message} (likely off-trail/unmapped section; needs manual routeNotice)`);
      results.push({ id: hike.id, ok: false, error: err.message });
    }
    await sleep(700);
  }

  console.log("\n--- Summary ---");
  for (const r of results) {
    if (r.ok) {
      console.log(
        `${r.id}: dist=${(r.distanceM / 1000).toFixed(2)}km asc=${Math.round(r.ascentM)}m desc=${Math.round(r.descentM)}m points=${r.route.length}`,
      );
    } else {
      console.log(`${r.id}: FAILED (${r.error})`);
    }
  }
  const outPath = join(__dirname, "enrich-results.json");
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nFull results (route + elevation arrays) written to ${outPath}`);
  console.log(
    "Merge the successful results' `route`/`dist`/`asc`/`elevation` into src/data/hikes.ts by hand. " +
      "For failed hikes, keep the original approximated route and add a `routeNotice`.",
  );
}

main();
