import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import type { BaseLayerKey, ElevationPoint, Hike, LatLng, OverlayKey, PlannerWaypoint } from "../types";
import { POI_CFG } from "../data/hikes";
import { nearestSegmentInsertIndex } from "../lib/routing";

type Mode = "discover" | "plan";

interface MapViewProps {
  mode: Mode;
  filteredHikes: Hike[];
  selectedHike: Hike | null;
  hoveredId: string | null;
  focusPoi: { lat: number; lng: number; nonce: number } | null;
  onSelectHike: (id: string) => void;
  waypoints: PlannerWaypoint[];
  routeGeometry: [number, number][];
  hoverElevationPoint: ElevationPoint | null;
  onAddWaypoint: (latlng: LatLng) => void;
  onInsertWaypoint: (index: number, latlng: LatLng) => void;
  onMoveWaypoint: (id: string, latlng: LatLng) => void;
  onRemoveWaypoint: (id: string) => void;
}

const DEFAULT_CENTER: L.LatLngTuple = [46.8, 8.2];
const DEFAULT_ZOOM = 8;
const INSERT_TOLERANCE_PX = 16;

const ST = "https://wmts.geo.admin.ch/1.0.0/";
const ATTR = '© <a href="https://www.swisstopo.admin.ch">swisstopo</a> · Wege: swisstopo / SchweizMobil, ASTRA';

function stLayer(layer: string, ext: string) {
  return L.tileLayer(`${ST}${layer}/default/current/3857/{z}/{x}/{y}.${ext}`, {
    attribution: ATTR,
    maxZoom: 18,
    maxNativeZoom: 17,
  });
}

const BASE_LAYERS: { key: BaseLayerKey; label: string }[] = [
  { key: "map", label: "Landeskarte" },
  { key: "relief", label: "Relief / Schummerung" },
  { key: "sat", label: "Luftbild" },
];
const OVERLAY_LAYERS: { key: OverlayKey; label: string }[] = [
  { key: "wander", label: "Wanderwege" },
  { key: "schweizmobil", label: "SchweizMobil-Routen" },
];

function startIcon() {
  return L.divIcon({
    className: "",
    html: `<div class="pin start"><span>${POI_CFG.station.g}</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });
}
function poiIcon(t: keyof typeof POI_CFG) {
  const cfg = POI_CFG[t] ?? { g: "•", n: t };
  return L.divIcon({
    className: "",
    html: `<div class="pin poi"><span>${cfg.g}</span></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
  });
}
function waypointIcon(label: string) {
  return L.divIcon({
    className: "",
    html: `<div class="pin start"><span>${label}</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });
}

function pixelPointToSegmentDistance(p: L.Point, a: L.Point, b: L.Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

export default function MapView({
  mode,
  filteredHikes,
  selectedHike,
  hoveredId,
  focusPoi,
  onSelectHike,
  waypoints,
  routeGeometry,
  hoverElevationPoint,
  onAddWaypoint,
  onInsertWaypoint,
  onMoveWaypoint,
  onRemoveWaypoint,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const basesRef = useRef<Record<BaseLayerKey, L.TileLayer> | null>(null);
  const overlaysRef = useRef<Record<OverlayKey, L.TileLayer> | null>(null);
  const startMarkersRef = useRef<{ id: string; marker: L.Marker }[]>([]);
  const routeLayersRef = useRef<L.Polyline[]>([]);
  const poiMarkersRef = useRef<{ lat: number; lng: number; marker: L.Marker }[]>([]);
  const waypointMarkersRef = useRef<L.Marker[]>([]);
  const planRouteLayersRef = useRef<L.Polyline[]>([]);
  const hoverMarkerRef = useRef<L.CircleMarker | null>(null);

  const [activeBase, setActiveBase] = useState<BaseLayerKey>("map");
  const [activeOvl, setActiveOvl] = useState<Set<OverlayKey>>(new Set(["wander"]));
  const [readout, setReadout] = useState({ coord: "46.80 N, 8.20 E", zoom: DEFAULT_ZOOM });

  // init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: 7,
      maxBounds: [[45.5, 5.5], [48.0, 11.0]],
      maxBoundsViscosity: 0.5,
    });
    L.control.zoom({ position: "bottomright" }).addTo(map);

    const bases: Record<BaseLayerKey, L.TileLayer> = {
      map: stLayer("ch.swisstopo.pixelkarte-farbe", "jpeg"),
      relief: stLayer("ch.swisstopo.pixelkarte-grau", "jpeg"),
      sat: stLayer("ch.swisstopo.swissimage", "jpeg"),
    };
    const overlays: Record<OverlayKey, L.TileLayer> = {
      wander: stLayer("ch.swisstopo.swisstlm3d-wanderwege", "png"),
      schweizmobil: stLayer("ch.astra.wanderland", "png"),
    };
    bases.map.addTo(map);
    overlays.wander.addTo(map);

    map.on("mousemove", (e: L.LeafletMouseEvent) => {
      setReadout((r) => ({ ...r, coord: `${e.latlng.lat.toFixed(2)} N, ${e.latlng.lng.toFixed(2)} E` }));
    });
    map.on("zoomend", () => setReadout((r) => ({ ...r, zoom: map.getZoom() })));

    mapRef.current = map;
    basesRef.current = bases;
    overlaysRef.current = overlays;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // base layer switching
  useEffect(() => {
    const map = mapRef.current;
    const bases = basesRef.current;
    if (!map || !bases) return;
    Object.entries(bases).forEach(([key, layer]) => {
      if (key === activeBase) {
        if (!map.hasLayer(layer)) layer.addTo(map).bringToBack();
      } else if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    });
  }, [activeBase]);

  // overlay layer toggling
  useEffect(() => {
    const map = mapRef.current;
    const overlays = overlaysRef.current;
    if (!map || !overlays) return;
    Object.entries(overlays).forEach(([key, layer]) => {
      const should = activeOvl.has(key as OverlayKey);
      const has = map.hasLayer(layer);
      if (should && !has) layer.addTo(map);
      if (!should && has) map.removeLayer(layer);
    });
  }, [activeOvl]);

  // start markers for currently filtered hikes (discover mode only)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    startMarkersRef.current.forEach((m) => map.removeLayer(m.marker));
    startMarkersRef.current = [];
    if (mode !== "discover") return;

    filteredHikes.forEach((h) => {
      const marker = L.marker([h.trailhead.lat, h.trailhead.lng], { icon: startIcon() }).addTo(map);
      marker.bindPopup(`<span class="pop-type">Startpunkt · ${h.diff.g}</span><br><b>${h.name}</b><br>${h.region}`);
      marker.on("click", () => onSelectHike(h.id));
      startMarkersRef.current.push({ id: h.id, marker });
    });
  }, [mode, filteredHikes, onSelectHike]);

  // hover highlight on start markers
  useEffect(() => {
    startMarkersRef.current.forEach(({ id, marker }) => {
      const el = marker.getElement();
      if (!el) return;
      const pin = el.querySelector<HTMLElement>(".pin");
      if (!pin) return;
      pin.style.transform = id === hoveredId ? "rotate(-45deg) scale(1.25)" : "rotate(-45deg) scale(1)";
    });
  }, [hoveredId]);

  // route + POI markers for selected hike (discover mode only)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    routeLayersRef.current.forEach((l) => map.removeLayer(l));
    routeLayersRef.current = [];
    poiMarkersRef.current.forEach((m) => map.removeLayer(m.marker));
    poiMarkersRef.current = [];

    if (mode !== "discover") return;

    if (!selectedHike) {
      map.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 0.7 });
      return;
    }

    const outline = L.polyline(selectedHike.route, { color: "#1a1500", weight: 7, opacity: 0.35 }).addTo(map);
    outline.bringToBack();
    const line = L.polyline(selectedHike.route, {
      color: "#FFC300",
      weight: 4,
      opacity: 0.95,
      dashArray: selectedHike.diff.g === "T4" ? "2,7" : undefined,
      lineJoin: "round",
    }).addTo(map);
    routeLayersRef.current = [outline, line];

    selectedHike.pois.forEach((p) => {
      const cfg = POI_CFG[p.t];
      const marker = L.marker([p.lat, p.lng], { icon: poiIcon(p.t) }).addTo(map);
      marker.bindPopup(`<span class="pop-type">${cfg.n}</span><br><b>${p.n}</b>${p.note ? "<br>" + p.note : ""}`);
      poiMarkersRef.current.push({ lat: p.lat, lng: p.lng, marker });
    });

    map.flyToBounds(line.getBounds().pad(0.35), { duration: 0.9 });
  }, [mode, selectedHike]);

  // focus a single POI (from detail-panel list click)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusPoi) return;
    map.setView([focusPoi.lat, focusPoi.lng], 14, { animate: true });
    const found = poiMarkersRef.current.find(
      (m) => Math.abs(m.lat - focusPoi.lat) < 1e-6 && Math.abs(m.lng - focusPoi.lng) < 1e-6,
    );
    found?.marker.openPopup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusPoi?.nonce]);

  // planner: map click adds/inserts a waypoint
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mode !== "plan") return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (waypoints.length >= 2) {
        const clickPx = map.latLngToContainerPoint(e.latlng);
        let nearest = Infinity;
        for (let i = 0; i < waypoints.length - 1; i++) {
          const a = map.latLngToContainerPoint(L.latLng(waypoints[i].lat, waypoints[i].lng));
          const b = map.latLngToContainerPoint(L.latLng(waypoints[i + 1].lat, waypoints[i + 1].lng));
          nearest = Math.min(nearest, pixelPointToSegmentDistance(clickPx, a, b));
        }
        if (nearest < INSERT_TOLERANCE_PX) {
          const index = nearestSegmentInsertIndex(waypoints, { lat: e.latlng.lat, lng: e.latlng.lng });
          onInsertWaypoint(index, { lat: e.latlng.lat, lng: e.latlng.lng });
          return;
        }
      }
      onAddWaypoint({ lat: e.latlng.lat, lng: e.latlng.lng });
    };

    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
  }, [mode, waypoints, onAddWaypoint, onInsertWaypoint]);

  // planner: render waypoint markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    waypointMarkersRef.current.forEach((m) => map.removeLayer(m));
    waypointMarkersRef.current = [];
    if (mode !== "plan") return;

    waypoints.forEach((wp, i) => {
      const label = i === 0 ? "S" : i === waypoints.length - 1 ? "Z" : String(i);
      const marker = L.marker([wp.lat, wp.lng], { icon: waypointIcon(label), draggable: true }).addTo(map);
      marker.on("dragend", () => {
        const ll = marker.getLatLng();
        onMoveWaypoint(wp.id, { lat: ll.lat, lng: ll.lng });
      });
      marker.bindPopup(
        `<div style="font-size:12px"><b>${i === 0 ? "Start" : i === waypoints.length - 1 ? "Ziel" : `Via ${i}`}</b><br/><button class="wp-remove-btn" style="margin-top:6px;cursor:pointer">Entfernen</button></div>`,
      );
      marker.on("popupopen", (e) => {
        const btn = e.popup.getElement()?.querySelector(".wp-remove-btn");
        btn?.addEventListener("click", () => {
          onRemoveWaypoint(wp.id);
          map.closePopup();
        });
      });
      waypointMarkersRef.current.push(marker);
    });
  }, [mode, waypoints, onMoveWaypoint, onRemoveWaypoint]);

  // planner: render ORS-snapped route line
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    planRouteLayersRef.current.forEach((l) => map.removeLayer(l));
    planRouteLayersRef.current = [];
    if (mode !== "plan" || routeGeometry.length < 2) return;

    const outline = L.polyline(routeGeometry, { color: "#1a1500", weight: 7, opacity: 0.35 }).addTo(map);
    outline.bringToBack();
    const line = L.polyline(routeGeometry, { color: "#FFC300", weight: 4, opacity: 0.95, lineJoin: "round" }).addTo(map);
    planRouteLayersRef.current = [outline, line];
  }, [mode, routeGeometry]);

  // planner: sync elevation-chart hover with a map marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!hoverElevationPoint) {
      if (hoverMarkerRef.current) {
        map.removeLayer(hoverMarkerRef.current);
        hoverMarkerRef.current = null;
      }
      return;
    }
    if (!hoverMarkerRef.current) {
      hoverMarkerRef.current = L.circleMarker([hoverElevationPoint.lat, hoverElevationPoint.lng], {
        radius: 7,
        color: "#fff",
        weight: 3,
        fillColor: "#FFC300",
        fillOpacity: 1,
        interactive: false,
      }).addTo(map);
    } else {
      hoverMarkerRef.current.setLatLng([hoverElevationPoint.lat, hoverElevationPoint.lng]);
    }
  }, [hoverElevationPoint]);

  return (
    <div className="relative min-w-0 flex-1">
      <div ref={containerRef} className="h-full bg-[#0b0f0c]" />

      <div className="absolute right-[14px] top-[14px] z-[600] flex flex-col items-end gap-2">
        <div className="flex flex-col gap-1 rounded-[11px] border border-line bg-[rgba(14,20,17,.9)] p-[7px] backdrop-blur-sm">
          {BASE_LAYERS.map(({ key, label }) => (
            <button
              key={key}
              className={`flex items-center gap-[7px] rounded-[7px] border px-[10px] py-[6px] text-[11.5px] font-medium transition-colors duration-150 ${
                activeBase === key ? "border-line bg-panel-2 text-text" : "border-transparent text-muted hover:text-text"
              }`}
              onClick={() => setActiveBase(key)}
            >
              <span className={`h-[9px] w-[9px] shrink-0 rounded-[3px] border border-muted-2 ${activeBase === key ? "border-marker bg-marker" : ""}`} />
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-1 rounded-[11px] border border-line bg-[rgba(14,20,17,.9)] p-[7px] backdrop-blur-sm">
          {OVERLAY_LAYERS.map(({ key, label }) => {
            const on = activeOvl.has(key);
            return (
              <button
                key={key}
                className={`flex items-center gap-[7px] rounded-[7px] border px-[10px] py-[6px] text-[11.5px] font-medium transition-colors duration-150 ${
                  on ? "border-line bg-panel-2 text-text" : "border-transparent text-muted hover:text-text"
                }`}
                onClick={() =>
                  setActiveOvl((prev) => {
                    const next = new Set(prev);
                    if (next.has(key)) next.delete(key);
                    else next.add(key);
                    return next;
                  })
                }
              >
                <span className={`h-[9px] w-[9px] shrink-0 rounded-[3px] border border-muted-2 ${on ? "border-blaze bg-blaze" : ""}`} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {mode === "plan" && (
        <div className="absolute left-[14px] top-[14px] z-[600] rounded-lg border border-line bg-[rgba(14,20,17,.84)] px-3 py-[8px] font-mono text-[11px] tracking-wide text-muted backdrop-blur-sm">
          {waypoints.length === 0
            ? "Klick auf die Karte: Startpunkt setzen"
            : "Weiter klicken zum Verlängern · auf die Linie klicken für Zwischenpunkt"}
        </div>
      )}

      <div className="absolute bottom-[14px] left-1/2 z-[600] -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-[rgba(14,20,17,.84)] px-3 py-[5px] font-mono text-[11px] tracking-wide text-muted backdrop-blur-sm max-md:bottom-auto max-md:top-[14px]">
        SCHWEIZ · <b className="font-bold text-marker">{readout.coord}</b> · <span>Zoom {readout.zoom}</span>
      </div>
    </div>
  );
}
