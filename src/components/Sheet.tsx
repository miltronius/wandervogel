import { useState } from "react";
import type { DiffFilter, DurFilter, Filters, Hike, RuheFilter } from "../types";
import HikeCard from "./HikeCard";
import DetailPanel from "./DetailPanel";

interface SheetProps {
  filteredHikes: Hike[];
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  selectedHike: Hike | null;
  onSelect: (id: string) => void;
  onBack: () => void;
  onHoverChange: (id: string, hovering: boolean) => void;
  onPoiClick: (lat: number, lng: number) => void;
}

function Chip({ on, meadow, onClick, children }: { on: boolean; meadow?: boolean; onClick: () => void; children: React.ReactNode }) {
  const base = "whitespace-nowrap rounded-full border px-[11px] py-[5px] text-[11.5px] font-medium transition-colors duration-150";
  const off = "border-line bg-transparent text-muted hover:border-muted-2 hover:text-text";
  const onCls = meadow ? "border-meadow bg-meadow text-[#0c1503] font-semibold" : "border-marker bg-marker text-[#1a1500] font-semibold";
  return (
    <button className={`${base} ${on ? onCls : off}`} onClick={onClick}>
      {children}
    </button>
  );
}

export default function Sheet({
  filteredHikes,
  filters,
  onFiltersChange,
  selectedHike,
  onSelect,
  onBack,
  onHoverChange,
  onPoiClick,
}: SheetProps) {
  const [mobileUp, setMobileUp] = useState(false);

  const handleBack = () => {
    onBack();
  };

  return (
    <aside
      className={`relative z-[500] flex h-full w-full flex-col border-r border-line bg-panel shadow-sheet md:w-[380px]
        max-md:absolute max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:top-auto max-md:h-[74%] max-md:rounded-t-2xl max-md:border-r-0 max-md:border-t max-md:transition-transform max-md:duration-300
        ${mobileUp ? "max-md:translate-y-0" : "max-md:translate-y-[calc(100%-64px)]"}`}
    >
      <button
        className="relative z-[2] hidden h-16 w-full items-center justify-center gap-[9px] border-none bg-transparent font-display text-sm font-semibold text-text max-md:flex"
        onClick={() => setMobileUp((v) => !v)}
      >
        <span className="absolute left-1/2 top-[9px] h-1 w-[38px] -translate-x-1/2 rounded-[3px] bg-line" />
        Wanderungen entdecken ↑
      </button>

      <div className="relative z-[1] border-b border-line p-[18px_20px_14px] max-md:pt-1.5">
        <div className="flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[.22em] text-muted-2">
          <span>Schweiz · Wanderplaner</span>
          <span className="text-marker">Blatt 1 : 50 000</span>
        </div>
        <h1 className="m-0 mt-[9px] mb-[5px] font-display text-[25px] font-bold leading-[1.04] tracking-tight">
          Stille <em className="font-normal not-italic text-marker">Pfade</em>
        </h1>
        <p className="max-w-[31ch] text-[12.5px] leading-[1.45] text-muted">
          Schöne Touren abseits der viralen Hotspots — mit Ruhe-Index, markanten Aussichten und allem für die Anreise.
        </p>
        <div className="mt-3 flex items-center gap-[7px] font-mono text-[10px] tracking-wide text-muted-2">
          <span>0</span>
          <div className="flex h-[6px] w-20 border border-muted-2">
            <span className="flex-1 bg-muted-2" />
            <span className="flex-1" />
            <span className="flex-1 bg-muted-2" />
            <span className="flex-1" />
          </div>
          <span>5 km</span>
        </div>
      </div>

      <div className="relative z-[1] border-b border-line p-[14px_20px]">
        <FilterRow label="Ruhe — wie einsam darf's sein?">
          <Chip meadow on={filters.ruhe === "all"} onClick={() => onFiltersChange({ ...filters, ruhe: "all" as RuheFilter })}>Alle</Chip>
          <Chip meadow on={filters.ruhe === "quiet"} onClick={() => onFiltersChange({ ...filters, ruhe: "quiet" as RuheFilter })}>Nur ruhig & einsam</Chip>
        </FilterRow>
        <FilterRow label="Schwierigkeit (SAC-Skala)">
          <Chip on={filters.diff === "all"} onClick={() => onFiltersChange({ ...filters, diff: "all" as DiffFilter })}>Alle</Chip>
          <Chip on={filters.diff === "T1"} onClick={() => onFiltersChange({ ...filters, diff: "T1" as DiffFilter })}>T1–T2 leicht</Chip>
          <Chip on={filters.diff === "T3"} onClick={() => onFiltersChange({ ...filters, diff: "T3" as DiffFilter })}>T3 anspruchsvoll</Chip>
          <Chip on={filters.diff === "T4"} onClick={() => onFiltersChange({ ...filters, diff: "T4" as DiffFilter })}>T4 alpin</Chip>
        </FilterRow>
        <FilterRow label="Dauer" last>
          <Chip on={filters.dur === "all"} onClick={() => onFiltersChange({ ...filters, dur: "all" as DurFilter })}>Alle</Chip>
          <Chip on={filters.dur === "half"} onClick={() => onFiltersChange({ ...filters, dur: "half" as DurFilter })}>Halbtag ≤ 4 h</Chip>
          <Chip on={filters.dur === "full"} onClick={() => onFiltersChange({ ...filters, dur: "full" as DurFilter })}>Tagestour</Chip>
        </FilterRow>
      </div>

      <div className="relative z-[1] flex items-center justify-between p-[11px_20px_6px] font-mono text-[10px] uppercase tracking-[.14em] text-muted-2">
        <span>{filteredHikes.length} Touren</span>
        <span>↓ tippen für Details</span>
      </div>
      <div className="relative z-[1] flex-1 overflow-y-auto">
        <div className="flex flex-col gap-[9px] p-[0_14px_18px]">
          {filteredHikes.map((h, i) => (
            <HikeCard
              key={h.id}
              hike={h}
              index={i}
              active={selectedHike?.id === h.id}
              onSelect={onSelect}
              onHoverChange={onHoverChange}
            />
          ))}
        </div>
      </div>

      <div className="relative z-[1] border-t border-line p-[10px_20px_16px] text-[10.5px] leading-[1.5] text-muted-2">
        <b className="text-muted">Karten:</b> © swisstopo (Landeskarte, Relief, Luftbild) · <b className="text-muted">Wege:</b> offizielles
        Wanderwegnetz swisstopo &amp; SchweizMobil/ASTRA — live als Layer einblendbar. Dauer, Höhenmeter und Ruhe-Index sind kuratierte
        Schätzungen; vor der Tour Verhältnisse &amp; Fahrplan prüfen.
      </div>

      {selectedHike && (
        <DetailPanel
          hike={selectedHike}
          onBack={handleBack}
          onPoiClick={onPoiClick}
        />
      )}
    </aside>
  );
}

function FilterRow({ label, last, children }: { label: string; last?: boolean; children: React.ReactNode }) {
  return (
    <div className={`flex flex-wrap gap-[6px] ${last ? "" : "mb-[11px]"}`}>
      <div className="mb-0.5 w-full font-mono text-[9.5px] uppercase tracking-[.18em] text-muted-2">{label}</div>
      {children}
    </div>
  );
}
