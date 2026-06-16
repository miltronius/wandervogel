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
  /** approx waypoints [lat, lng] */
  route: [number, number][];
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
