import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import type { BaseLayerKey, Hike, OverlayKey } from "../types";
import { POI_CFG } from "../data/hikes";

interface MapViewProps {
  filteredHikes: Hike[];
  selectedHike: Hike | null;
  hoveredId: string | null;
  focusPoi: { lat: number; lng: number; nonce: number } | null;
  onSelectHike: (id: string) => void;
}

const DEFAULT_CENTER: L.LatLngTuple = [46.8, 8.2];
const DEFAULT_ZOOM = 8;

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

export default function MapView({ filteredHikes, selectedHike, hoveredId, focusPoi, onSelectHike }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const basesRef = useRef<Record<BaseLayerKey, L.TileLayer> | null>(null);
  const overlaysRef = useRef<Record<OverlayKey, L.TileLayer> | null>(null);
  const startMarkersRef = useRef<{ id: string; marker: L.Marker }[]>([]);
  const routeLayersRef = useRef<L.Polyline[]>([]);
  const poiMarkersRef = useRef<{ lat: number; lng: number; marker: L.Marker }[]>([]);

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

  // start markers for currently filtered hikes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    startMarkersRef.current.forEach((m) => map.removeLayer(m.marker));
    startMarkersRef.current = [];

    filteredHikes.forEach((h) => {
      const marker = L.marker([h.trailhead.lat, h.trailhead.lng], { icon: startIcon() }).addTo(map);
      marker.bindPopup(`<span class="pop-type">Startpunkt · ${h.diff.g}</span><br><b>${h.name}</b><br>${h.region}`);
      marker.on("click", () => onSelectHike(h.id));
      startMarkersRef.current.push({ id: h.id, marker });
    });
  }, [filteredHikes, onSelectHike]);

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

  // route + POI markers for selected hike
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    routeLayersRef.current.forEach((l) => map.removeLayer(l));
    routeLayersRef.current = [];
    poiMarkersRef.current.forEach((m) => map.removeLayer(m.marker));
    poiMarkersRef.current = [];

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
  }, [selectedHike]);

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

      <div className="absolute bottom-[14px] left-1/2 z-[600] -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-[rgba(14,20,17,.84)] px-3 py-[5px] font-mono text-[11px] tracking-wide text-muted backdrop-blur-sm max-md:bottom-auto max-md:top-[14px]">
        SCHWEIZ · <b className="font-bold text-marker">{readout.coord}</b> · <span>Zoom {readout.zoom}</span>
      </div>
    </div>
  );
}
