import { useCallback, useEffect, useMemo, useState } from "react";
import { HIKES } from "./data/hikes";
import { passesFilters } from "./lib/filters";
import { fetchHikingRoute, RoutingError, type RouteProfile } from "./lib/routing";
import { estimateHikingMinutes } from "./lib/hikeEstimate";
import { usePlannedHikes } from "./hooks/usePlannedHikes";
import type { ElevationPoint, Filters, LatLng, PlannedHike, PlannerWaypoint, RouteOption } from "./types";
import Sheet from "./components/Sheet";
import MapView from "./components/MapView";

type Tab = "discover" | "plan";

const PROFILE_LABELS: Record<RouteProfile, string> = {
  "foot-hiking": "Wanderweg",
  "foot-walking": "Direkt",
};

function makeWaypoint(latlng: LatLng): PlannerWaypoint {
  return { id: crypto.randomUUID(), ...latlng };
}

function routeSignature(option: RouteOption): string {
  const km = (option.stats.distanceM / 10).toFixed(0); // ~10m buckets
  const mid = option.geometry[Math.floor(option.geometry.length / 2)] ?? [0, 0];
  return `${km}|${mid[0].toFixed(3)},${mid[1].toFixed(3)}`;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("discover");

  const [filters, setFilters] = useState<Filters>({ ruhe: "all", diff: "all", dur: "all" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusPoi, setFocusPoi] = useState<{ lat: number; lng: number; nonce: number } | null>(null);

  const filteredHikes = useMemo(() => HIKES.filter((h) => passesFilters(h, filters)), [filters]);
  const selectedHike = useMemo(() => HIKES.find((h) => h.id === selectedId) ?? null, [selectedId]);

  const handleSelect = useCallback((id: string) => setSelectedId(id), []);
  const handleBack = useCallback(() => setSelectedId(null), []);
  const handleHoverChange = useCallback((id: string, hovering: boolean) => setHoveredId(hovering ? id : null), []);
  const handlePoiClick = useCallback(
    (lat: number, lng: number) => setFocusPoi((prev) => ({ lat, lng, nonce: (prev?.nonce ?? 0) + 1 })),
    [],
  );

  // --- planner state ---
  const [waypoints, setWaypoints] = useState<PlannerWaypoint[]>([]);
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
  const [activeRouteIndex, setActiveRouteIndex] = useState(0);
  const [routingLoading, setRoutingLoading] = useState(false);
  const [routingError, setRoutingError] = useState<string | null>(null);
  const [hoverElevationPoint, setHoverElevationPoint] = useState<ElevationPoint | null>(null);
  const [flyToRouteSignal, setFlyToRouteSignal] = useState(0);

  const activeRoute = routeOptions[activeRouteIndex] ?? null;
  const geometry = activeRoute?.geometry ?? [];
  const elevationProfile = activeRoute?.elevationProfile ?? [];
  const stats = activeRoute?.stats ?? null;

  const { plans, savePlan, removePlan } = usePlannedHikes();

  const onAddWaypoint = useCallback((latlng: LatLng) => setWaypoints((prev) => [...prev, makeWaypoint(latlng)]), []);
  const onInsertWaypoint = useCallback(
    (index: number, latlng: LatLng) =>
      setWaypoints((prev) => [...prev.slice(0, index), makeWaypoint(latlng), ...prev.slice(index)]),
    [],
  );
  const onMoveWaypoint = useCallback(
    (id: string, latlng: LatLng) =>
      setWaypoints((prev) => prev.map((wp) => (wp.id === id ? { ...wp, ...latlng } : wp))),
    [],
  );
  const onRemoveWaypoint = useCallback((id: string) => setWaypoints((prev) => prev.filter((wp) => wp.id !== id)), []);
  const onClearWaypoints = useCallback(() => {
    setWaypoints([]);
    setRouteOptions([]);
    setActiveRouteIndex(0);
    setRoutingError(null);
  }, []);

  // debounced re-routing whenever the waypoint sequence changes
  useEffect(() => {
    if (waypoints.length < 2) {
      setRouteOptions([]);
      setActiveRouteIndex(0);
      setRoutingError(null);
      return;
    }
    const handle = setTimeout(async () => {
      setRoutingLoading(true);
      setRoutingError(null);
      try {
        // Alternative-route comparison (e.g. trail-preferring vs direct) only
        // makes sense for a plain start->end request — ORS has no concept of
        // "alternatives" once via-points are involved.
        const profiles: RouteProfile[] = waypoints.length === 2 ? ["foot-hiking", "foot-walking"] : ["foot-hiking"];
        const results = await Promise.allSettled(profiles.map((p) => fetchHikingRoute(waypoints, p)));

        const options: RouteOption[] = [];
        results.forEach((r, i) => {
          if (r.status === "fulfilled") {
            options.push({
              profile: profiles[i],
              label: PROFILE_LABELS[profiles[i]],
              geometry: r.value.geometry.map((p) => [p.lat, p.lng]),
              elevationProfile: r.value.elevationProfile,
              stats: {
                distanceM: r.value.distanceM,
                ascentM: r.value.ascentM,
                descentM: r.value.descentM,
                durationEstimateMin: estimateHikingMinutes(r.value.distanceM, r.value.ascentM, r.value.descentM),
              },
            });
          }
        });

        if (options.length === 0) {
          const firstError = results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
          const message =
            firstError?.reason instanceof RoutingError
              ? firstError.reason.message
              : "Route konnte nicht berechnet werden.";
          setRoutingError(message);
          setRouteOptions([]);
          return;
        }

        // de-duplicate near-identical routes (e.g. both profiles pick the same path)
        const seen = new Set<string>();
        const deduped = options.filter((o) => {
          const sig = routeSignature(o);
          if (seen.has(sig)) return false;
          seen.add(sig);
          return true;
        });

        setRouteOptions(deduped);
        setActiveRouteIndex(0);
      } catch {
        setRoutingError("Route konnte nicht berechnet werden.");
        setRouteOptions([]);
      } finally {
        setRoutingLoading(false);
      }
    }, 600);
    return () => clearTimeout(handle);
  }, [waypoints]);

  const onSavePlan = useCallback((plan: PlannedHike) => savePlan(plan), [savePlan]);
  const onLoadPlan = useCallback((plan: PlannedHike) => {
    setWaypoints(plan.waypoints);
    setRouteOptions([
      {
        profile: "foot-hiking",
        label: "Gespeicherte Route",
        geometry: plan.geometry,
        elevationProfile: plan.elevationProfile,
        stats: plan.stats,
      },
    ]);
    setActiveRouteIndex(0);
    setRoutingError(null);
    setFlyToRouteSignal((s) => s + 1);
  }, []);

  return (
    <div id="app">
      <Sheet
        filteredHikes={filteredHikes}
        filters={filters}
        onFiltersChange={setFilters}
        selectedHike={selectedHike}
        onSelect={handleSelect}
        onBack={handleBack}
        onHoverChange={handleHoverChange}
        onPoiClick={handlePoiClick}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        planner={{
          waypoints,
          geometry,
          elevationProfile,
          stats,
          routeOptions,
          activeRouteIndex,
          onSelectRouteOption: setActiveRouteIndex,
          loading: routingLoading,
          error: routingError,
          onRemoveWaypoint,
          onClearWaypoints,
          onHoverElevationPoint: setHoverElevationPoint,
          savedPlans: plans,
          onSavePlan,
          onLoadPlan,
          onDeletePlan: removePlan,
        }}
      />
      <MapView
        mode={activeTab}
        filteredHikes={filteredHikes}
        selectedHike={selectedHike}
        hoveredId={hoveredId}
        focusPoi={focusPoi}
        onSelectHike={handleSelect}
        waypoints={waypoints}
        routeGeometry={geometry}
        flyToRouteSignal={flyToRouteSignal}
        hoverElevationPoint={hoverElevationPoint}
        onAddWaypoint={onAddWaypoint}
        onInsertWaypoint={onInsertWaypoint}
        onMoveWaypoint={onMoveWaypoint}
        onRemoveWaypoint={onRemoveWaypoint}
      />
    </div>
  );
}
