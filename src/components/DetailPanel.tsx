import type { Hike } from "../types";
import { POI_CFG, RUHE } from "../data/hikes";
import { gmaps, swisstopoUrl } from "../lib/geo";
import RuheGauge from "./RuheGauge";
import ElevationChart from "./ElevationChart";

interface DetailPanelProps {
  hike: Hike;
  onBack: () => void;
  onPoiClick: (lat: number, lng: number) => void;
}

export default function DetailPanel({ hike, onBack, onPoiClick }: DetailPanelProps) {
  const ru = RUHE[hike.crowd];

  return (
    <div className="absolute inset-0 z-10 flex translate-x-0 flex-col bg-panel shadow-sheet transition-transform duration-300">
      <div className="relative z-[1] border-b border-line p-[15px_20px_13px]">
        <button
          className="mb-[11px] inline-flex items-center gap-[6px] border-none bg-transparent p-0 font-mono text-xs uppercase tracking-wide text-muted hover:text-marker"
          onClick={onBack}
        >
          ← Zurück zur Auswahl
        </button>
        <h2 className="m-0 mb-1 font-display text-[22px] font-bold leading-[1.07] tracking-tight">{hike.name}</h2>
        <div className="text-xs text-muted">
          {hike.region} · Kanton {hike.canton} · {hike.season}
        </div>
      </div>

      <div className="relative z-[1] flex-1 overflow-y-auto p-[16px_20px_26px]">
        <div className="mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-line bg-line">
          <Stat k="Dauer" v={hike.time} unit="h" />
          <Stat k="Distanz" v={hike.dist} unit="km" />
          <Stat k="Aufstieg" v={hike.asc} unit="m ↗" />
          <Stat k="SAC-Grad" v={hike.diff.g} unit={hike.diff.label} />
        </div>

        <div className="mb-4 flex items-center gap-[9px] rounded-[10px] border border-line bg-panel-2 p-[13px]">
          <RuheGauge crowd={hike.crowd} size={48} />
          <div className="text-[11px] leading-[1.25]">
            <b className="block text-[15px]">{ru.label}</b>
            <span className="font-mono text-[9.5px] uppercase tracking-[.1em] text-muted-2">{ru.code} · Andrang-Schätzung</span>
          </div>
        </div>

        <p className="mb-[18px] text-[13.5px] leading-[1.6] text-[#d6ddcf]">{hike.summary}</p>

        {hike.elevation && (
          <Section title="Höhenprofil">
            <ElevationChart points={hike.elevation} color="#FFC300" onHoverPoint={() => {}} />
          </Section>
        )}

        {hike.routeNotice && (
          <div className="mb-[18px] rounded-[10px] border border-marker/40 bg-marker/10 p-[11px_13px] text-[12px] leading-[1.5] text-marker">
            ⚠ {hike.routeNotice}
          </div>
        )}

        <Section title="Markante Stellen & POIs">
          {hike.pois.map((p) => {
            const cfg = POI_CFG[p.t];
            return (
              <div
                key={p.n}
                className="-mx-1.5 flex cursor-pointer gap-[10px] rounded-md border-b border-line-soft px-1.5 py-[7px] text-[13px] last:border-b-0 hover:bg-panel-2"
                onClick={() => onPoiClick(p.lat, p.lng)}
              >
                <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[7px] border border-line bg-panel-2 text-sm">
                  {cfg.g}
                </div>
                <div>
                  <div className="font-medium">{p.n}</div>
                  <div className="mt-px text-[11.5px] text-muted">
                    {cfg.n}
                    {p.note ? ` · ${p.note}` : ""}
                  </div>
                </div>
              </div>
            );
          })}
        </Section>

        <Section title="Höhepunkte">
          <div className="flex flex-wrap gap-[6px]">
            {hike.highlights.map((x) => (
              <span key={x} className="rounded-[7px] border border-line bg-panel-2 px-[9px] py-1 text-[11.5px] text-[#cfd6c8]">
                {x}
              </span>
            ))}
          </div>
        </Section>

        <Section title={`Hin & zurück — ${hike.transport.station}`}>
          <div className="grid grid-cols-3 gap-2">
            <TravelButton href={gmaps(hike.trailhead.lat, hike.trailhead.lng, "transit")} icon="🚆" label="ÖV" />
            <TravelButton href={gmaps(hike.trailhead.lat, hike.trailhead.lng, "bicycling")} icon="🚲" label="Velo" />
            <TravelButton href={gmaps(hike.trailhead.lat, hike.trailhead.lng, "driving")} icon="🚗" label="Auto" />
          </div>
          <div className="mt-[9px] text-[11.5px] leading-[1.5] text-muted">{hike.transport.note}</div>
        </Section>

        <Section title="Karte & 3D-Gelände">
          <div className="flex flex-col gap-2">
            <a
              className="flex items-center justify-center gap-2 rounded-[10px] bg-marker p-3 text-[13px] font-semibold text-[#1a1500] transition-all duration-150 hover:brightness-110"
              target="_blank"
              rel="noopener"
              href={swisstopoUrl(hike.trailhead.lat, hike.trailhead.lng, true)}
            >
              ⛰️ 3D-Gelände auf swisstopo öffnen
            </a>
            <a
              className="flex items-center justify-center gap-2 rounded-[10px] border border-line p-3 text-[13px] font-semibold text-text transition-all duration-150 hover:border-muted-2"
              target="_blank"
              rel="noopener"
              href={swisstopoUrl(hike.trailhead.lat, hike.trailhead.lng, false)}
            >
              🗺️ Auf swisstopo-Karte mit Wanderwegen ansehen
            </a>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Stat({ k, v, unit }: { k: string; v: string | number; unit: string }) {
  return (
    <div className="bg-panel-2 p-[11px_12px]">
      <div className="font-mono text-[9px] uppercase tracking-[.16em] text-muted-2">{k}</div>
      <div className="mt-[3px] font-display text-[18px] font-semibold">
        {v} <small className="text-[11px] font-normal text-muted">{unit}</small>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-[18px]">
      <div className="mb-[9px] flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.2em] text-marker">
        {title}
        <span className="h-px flex-1 bg-line" />
      </div>
      {children}
    </div>
  );
}

function TravelButton({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <a
      className="block rounded-[10px] border border-line bg-panel-2 p-[11px_6px] text-center text-text transition-colors duration-150 hover:border-glacier hover:bg-[#1f2a23]"
      target="_blank"
      rel="noopener"
      href={href}
    >
      <div className="text-lg">{icon}</div>
      <div className="mt-1 text-[11px] text-muted">{label}</div>
    </a>
  );
}
