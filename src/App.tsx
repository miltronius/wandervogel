import { useCallback, useMemo, useState } from "react";
import { HIKES } from "./data/hikes";
import { passesFilters } from "./lib/filters";
import type { Filters } from "./types";
import Sheet from "./components/Sheet";
import MapView from "./components/MapView";

export default function App() {
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
      />
      <MapView
        filteredHikes={filteredHikes}
        selectedHike={selectedHike}
        hoveredId={hoveredId}
        focusPoi={focusPoi}
        onSelectHike={handleSelect}
      />
    </div>
  );
}
