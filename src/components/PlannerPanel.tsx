import { useState } from "react";
import type {
  ElevationPoint,
  PlannedHike,
  PlannerWaypoint,
  RouteOption,
  RouteStats,
} from "../types";
import ElevationChart from "./ElevationChart";
import { buildGpx, downloadGpx } from "../lib/gpx";

interface PlannerPanelProps {
  waypoints: PlannerWaypoint[];
  geometry: [number, number][];
  elevationProfile: ElevationPoint[];
  stats: RouteStats | null;
  routeOptions: RouteOption[];
  activeRouteIndex: number;
  onSelectRouteOption: (index: number) => void;
  loading: boolean;
  error: string | null;
  onRemoveWaypoint: (id: string) => void;
  onClearWaypoints: () => void;
  onHoverElevationPoint: (point: ElevationPoint | null) => void;
  savedPlans: PlannedHike[];
  onSavePlan: (plan: PlannedHike) => void;
  onLoadPlan: (plan: PlannedHike) => void;
  onDeletePlan: (id: string) => void;
}

function nextSaturday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = (6 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function formatKm(m: number) {
  return (m / 1000).toFixed(1);
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-CH");
}
function formatMin(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

export default function PlannerPanel({
  waypoints,
  geometry,
  elevationProfile,
  stats,
  routeOptions,
  activeRouteIndex,
  onSelectRouteOption,
  loading,
  error,
  onRemoveWaypoint,
  onClearWaypoints,
  onHoverElevationPoint,
  savedPlans,
  onSavePlan,
  onLoadPlan,
  onDeletePlan,
}: PlannerPanelProps) {
  const [name, setName] = useState("");
  const [date, setDate] = useState(nextSaturday());
  const [notes, setNotes] = useState("");

  const canSave = waypoints.length >= 2 && stats && geometry.length > 0;

  const handleSave = () => {
    if (!canSave || !stats) return;
    const plan: PlannedHike = {
      id: crypto.randomUUID(),
      name: name.trim() || `Tour vom ${date}`,
      plannedDate: date || null,
      notes: notes.trim() || undefined,
      waypoints,
      geometry,
      stats,
      elevationProfile,
      createdAt: new Date().toISOString(),
    };
    onSavePlan(plan);
    setName("");
    setNotes("");
  };

  const handleExportGpx = () => {
    if (geometry.length === 0) return;
    const points = elevationProfile.length
      ? elevationProfile.map((p) => ({
          lat: p.lat,
          lng: p.lng,
          ele: p.elevationM,
        }))
      : geometry.map(([lat, lng]) => ({ lat, lng }));
    const gpx = buildGpx(name.trim() || "Wandervogel-Route", points);
    downloadGpx(name.trim() || "wandervogel-route", gpx);
  };

  const handleExportPlanGpx = (plan: PlannedHike) => {
    const points = plan.elevationProfile.length
      ? plan.elevationProfile.map((p) => ({ lat: p.lat, lng: p.lng, ele: p.elevationM }))
      : plan.geometry.map(([lat, lng]) => ({ lat, lng }));
    const gpx = buildGpx(plan.name, points);
    downloadGpx(plan.name, gpx);
  };

  return (
    <div className="relative z-[1] flex-1 overflow-y-auto">
      <div className="border-b border-line p-[14px_20px]">
        <div className="mb-2 font-mono text-[9.5px] uppercase tracking-[.18em] text-muted-2">
          Eigene Route bauen
        </div>
        <p className="text-[12px] leading-[1.5] text-muted">
          Klicke auf die Karte: erster Klick setzt den Start, jeder weitere
          Klick verlängert die Route. Klicke direkt auf die gezeichnete Linie,
          um einen Zwischenpunkt einzufügen. Marker lassen sich verschieben oder
          per Klick entfernen.
        </p>
      </div>

      <div className="border-b border-line p-[14px_20px]">
        <div className="mb-2 flex items-center justify-between font-mono text-[9.5px] uppercase tracking-[.18em] text-muted-2">
          <span>Wegpunkte ({waypoints.length})</span>
          {waypoints.length > 0 && (
            <button
              className="text-muted hover:text-marker"
              onClick={onClearWaypoints}
            >
              Alle löschen
            </button>
          )}
        </div>
        {waypoints.length === 0 ? (
          <div className="text-[12px] text-muted-2">
            Noch keine Wegpunkte gesetzt.
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {waypoints.map((wp, i) => (
              <div
                key={wp.id}
                className="flex items-center justify-between rounded-md border border-line bg-panel-2 px-[10px] py-[6px] text-[12px]"
              >
                <span>
                  {i === 0
                    ? "Start"
                    : i === waypoints.length - 1
                      ? "Ziel"
                      : `Via ${i}`}{" "}
                  · {wp.lat.toFixed(4)}, {wp.lng.toFixed(4)}
                </span>
                <button
                  className="text-muted-2 hover:text-blaze"
                  onClick={() => onRemoveWaypoint(wp.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="border-b border-line p-[14px_20px] text-[12px] text-muted">
          Route wird berechnet…
        </div>
      )}
      {error && (
        <div className="border-b border-line p-[14px_20px] text-[12px] text-[#ff7b72]">
          {error}
        </div>
      )}

      {routeOptions.length > 1 && (
        <div className="border-b border-line p-[14px_20px]">
          <div className="mb-2 font-mono text-[9.5px] uppercase tracking-[.18em] text-muted-2">
            Routenvarianten
          </div>
          <div className="flex flex-col gap-[6px]">
            {routeOptions.map((opt, i) => (
              <button
                key={opt.profile}
                onClick={() => onSelectRouteOption(i)}
                className={`flex items-center justify-between rounded-md border px-[10px] py-[7px] text-left text-[12.5px] transition-colors duration-150 ${
                  i === activeRouteIndex
                    ? "border-marker bg-marker/10 text-text"
                    : "border-line bg-panel-2 text-muted hover:border-muted-2"
                }`}
              >
                <span className="font-medium">{opt.label}</span>
                <span className="font-mono text-[11px]">
                  {formatKm(opt.stats.distanceM)} km · ↗{Math.round(opt.stats.ascentM)} m
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {stats && (
        <div className="border-b border-line p-[14px_20px]">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-line bg-line">
            <Stat k="Distanz" v={formatKm(stats.distanceM)} unit="km" />
            <Stat
              k="Dauer (Schätzung)"
              v={formatMin(stats.durationEstimateMin)}
              unit=""
            />
            <Stat
              k="Aufstieg"
              v={Math.round(stats.ascentM).toString()}
              unit="m ↗"
            />
            <Stat
              k="Abstieg"
              v={Math.round(stats.descentM).toString()}
              unit="m ↘"
            />
          </div>

          <div className="mt-3">
            <ElevationChart
              points={elevationProfile}
              color="#22D3EE"
              onHoverPoint={onHoverElevationPoint}
            />
          </div>
        </div>
      )}

      {canSave && (
        <div className="border-b border-line p-[14px_20px]">
          <div className="mb-2 font-mono text-[9.5px] uppercase tracking-[.18em] text-muted-2">
            Diese Route speichern
          </div>
          <input
            className="mb-2 w-full rounded-md border border-line bg-panel-2 px-[10px] py-[7px] text-[13px] text-text outline-none focus:border-marker"
            placeholder="Name der Tour"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="date"
            className="mb-2 w-full rounded-md border border-line bg-panel-2 px-[10px] py-[7px] text-[13px] text-text outline-none focus:border-marker"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <textarea
            className="mb-2 w-full rounded-md border border-line bg-panel-2 px-[10px] py-[7px] text-[13px] text-text outline-none focus:border-marker"
            placeholder="Notizen (optional)"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              className="flex-1 rounded-[10px] bg-marker p-[10px] text-[13px] font-semibold text-[#1a1500] hover:brightness-110"
              onClick={handleSave}
            >
              Speichern
            </button>
            <button
              className="rounded-[10px] border border-line p-[10px] text-[13px] font-semibold text-text hover:border-muted-2"
              onClick={handleExportGpx}
            >
              GPX exportieren
            </button>
          </div>
        </div>
      )}

      <div className="p-[14px_20px]">
        <div className="mb-2 font-mono text-[9.5px] uppercase tracking-[.18em] text-muted-2">
          Meine Pläne
        </div>
        {savedPlans.length === 0 ? (
          <div className="text-[12px] text-muted-2">
            Noch keine gespeicherten Touren.
          </div>
        ) : (
          <div className="flex flex-col gap-[9px]">
            {savedPlans.map((plan) => (
              <div
                key={plan.id}
                className="rounded-[11px] border border-line bg-panel-2 p-[13px_14px]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-display text-[14px] font-semibold">
                      {plan.name}
                    </div>
                    {plan.plannedDate && (
                      <div className="text-[11px] text-muted">
                        {formatDate(plan.plannedDate)}
                      </div>
                    )}
                  </div>
                  <button
                    className="text-muted-2 hover:text-blaze"
                    onClick={() => onDeletePlan(plan.id)}
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-2 flex gap-[13px] font-mono text-[11px] text-muted">
                  <span>{formatKm(plan.stats.distanceM)} km</span>
                  <span>↗ {Math.round(plan.stats.ascentM)} m</span>
                  <span>{formatMin(plan.stats.durationEstimateMin)}</span>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    className="flex-1 rounded-md border border-line py-[6px] text-[11.5px] text-text hover:border-muted-2"
                    onClick={() => onLoadPlan(plan)}
                  >
                    Auf Karte laden
                  </button>
                  <button
                    className="flex-1 rounded-md border border-line py-[6px] text-[11.5px] text-text hover:border-muted-2"
                    onClick={() => handleExportPlanGpx(plan)}
                  >
                    GPX exportieren
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ k, v, unit }: { k: string; v: string; unit: string }) {
  return (
    <div className="bg-panel-2 p-[11px_12px]">
      <div className="font-mono text-[9px] uppercase tracking-[.16em] text-muted-2">
        {k}
      </div>
      <div className="mt-[3px] font-display text-[16px] font-semibold">
        {v} <small className="text-[11px] font-normal text-muted">{unit}</small>
      </div>
    </div>
  );
}
