import type { Filters, Hike, SacGrade } from "../types";

export function passesFilters(h: Hike, filt: Filters): boolean {
  if (filt.ruhe === "quiet" && h.crowd > 2) return false;
  if (filt.diff === "T1" && !(h.diff.g === "T1" || h.diff.g === "T2")) return false;
  if (filt.diff === "T3" && h.diff.g !== "T3") return false;
  if (filt.diff === "T4" && h.diff.g !== "T4") return false;
  if (filt.dur === "half" && h.time > 4) return false;
  if (filt.dur === "full" && h.time <= 4) return false;
  return true;
}

export function difClass(g: SacGrade): string {
  return g === "T1" ? "t1" : g === "T2" ? "t2" : g === "T3" ? "t3" : "t4";
}
