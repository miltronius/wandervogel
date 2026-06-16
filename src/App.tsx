import { useCallback, useEffect, useMemo, useState } from "react";
import { HIKES } from "./data/hikes";
import { passesFilters } from "./lib/filters";
import { fetchHikingRoute, RoutingError } from "./lib/routing";
import { estimateHikingMinutes } from "./lib/hikeEstimate";
import { usePlannedHikes } from "./hooks/usePlannedHikes";
import type { ElevationPoint, Filters, LatLng, PlannedHike, PlannerWaypoint, RouteStats } from "./types";
import Sheet from "./components/Sheet";
import MapView from "./components/MapView";

type Tab = "discover" | "plan";

function makeWaypoint(latlng: LatLng): PlannerWaypoint {
  return { id: crypto.randomUUID(), ...latlng };
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
  const [geometry, setGeometry] = useState<[number, number][]>([]);
  const [elevationProfile, setElevationProfile] = useState<ElevationPoint[]>([]);
  const [stats, setStats] = useState<RouteStats | null>(null);
  const [routingLoading, setRoutingLoading] = useState(false);
  const [routingError, setRoutingError] = useState<string | null>(null);
  const [hoverElevationPoint, setHoverElevationPoint] = useState<ElevationPoint | null>(null);

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
    setGeometry([]);
    setElevationProfile([]);
    setStats(null);
    setRoutingError(null);
  }, []);

  // debounced re-routing whenever the waypoint sequence changes
  useEffect(() => {
    if (waypoints.length < 2) {
      setGeometry([]);
      setElevationProfile([]);
      setStats(null);
      setRoutingError(null);
      return;
    }
    const handle = setTimeout(async () => {
      setRoutingLoading(true);
      setRoutingError(null);
      try {
        const result = await fetchHikingRoute(waypoints);
        setGeometry(result.geometry.map((p) => [p.lat, p.lng]));
        setElevationProfile(result.elevationProfile);
        setStats({
          distanceM: result.distanceM,
          ascentM: result.ascentM,
          descentM: result.descentM,
          durationEstimateMin: estimateHikingMinutes(result.distanceM, result.ascentM, result.descentM),
        });
      } catch (err) {
        const message = err instanceof RoutingError ? err.message : "Route konnte nicht berechnet werden.";
        setRoutingError(message);
      } finally {
        setRoutingLoading(false);
      }
    }, 600);
    return () => clearTimeout(handle);
  }, [waypoints]);

  const onSavePlan = useCallback((plan: PlannedHike) => savePlan(plan), [savePlan]);
  const onLoadPlan = useCallback((plan: PlannedHike) => {
    setWaypoints(plan.waypoints);
    setGeometry(plan.geometry);
    setElevationProfile(plan.elevationProfile);
    setStats(plan.stats);
    setRoutingError(null);
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
        hoverElevationPoint={hoverElevationPoint}
        onAddWaypoint={onAddWaypoint}
        onInsertWaypoint={onInsertWaypoint}
        onMoveWaypoint={onMoveWaypoint}
        onRemoveWaypoint={onRemoveWaypoint}
      />
    </div>
  );
}
