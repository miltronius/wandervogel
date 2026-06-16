export type SacGrade = "T1" | "T2" | "T3" | "T4";

export type PoiType =
  | "viewpoint"
  | "panorama"
  | "peak"
  | "restaurant"
  | "fountain"
  | "picnic"
  | "lake"
  | "hut"
  | "station";

export interface Poi {
  t: PoiType;
  n: string;
  note?: string;
  lat: number;
  lng: number;
}

export interface Hike {
  id: string;
  name: string;
  region: string;
  canton: string;
  diff: { g: SacGrade; label: string };
  time: number;
  dist: number;
  asc: number;
  /** crowd estimate: 1 = einsam … 5 = belebt */
  crowd: 1 | 2 | 3 | 4 | 5;
  season: string;
  summary: string;
  highlights: string[];
  trailhead: { name: string; lat: number; lng: number };
  transport: { station: string; note: string };
  pois: Poi[];
  /** trail-snapped waypoints [lat, lng] (real OSM geometry via ORS where routeable) */
  route: [number, number][];
  /** elevation profile along `route`, present once enriched via scripts/enrich-hikes.mjs */
  elevation?: ElevationPoint[];
  /** shown when part of the route could not be matched to a mapped trail (e.g. off-path scrambling) */
  routeNotice?: string;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface PlannerWaypoint extends LatLng {
  id: string;
  label?: string;
}

export interface ElevationPoint {
  distanceM: number;
  elevationM: number;
  lat: number;
  lng: number;
}

export interface RouteStats {
  distanceM: number;
  ascentM: number;
  descentM: number;
  durationEstimateMin: number;
}

export interface RouteOption {
  profile: "foot-hiking" | "foot-walking";
  label: string;
  geometry: [number, number][];
  elevationProfile: ElevationPoint[];
  stats: RouteStats;
}

export interface PlannedHike {
  id: string;
  name: string;
  plannedDate: string | null;
  notes?: string;
  waypoints: PlannerWaypoint[];
  geometry: [number, number][];
  stats: RouteStats;
  elevationProfile: ElevationPoint[];
  createdAt: string;
}

export type RuheFilter = "all" | "quiet";
export type DiffFilter = "all" | "T1" | "T3" | "T4";
export type DurFilter = "all" | "half" | "full";

export interface Filters {
  ruhe: RuheFilter;
  diff: DiffFilter;
  dur: DurFilter;
}

export type BaseLayerKey = "map" | "relief" | "sat";
export type OverlayKey = "wander" | "schweizmobil";
