import type { Hike } from "../types";
import { RUHE } from "../data/hikes";
import { difClass } from "../lib/filters";
import RuheGauge from "./RuheGauge";

interface HikeCardProps {
  hike: Hike;
  index: number;
  active: boolean;
  onSelect: (id: string) => void;
  onHoverChange: (id: string, hovering: boolean) => void;
}

const GRADE_CLASSES: Record<string, string> = {
  t1: "bg-meadow/15 text-meadow border border-meadow/40",
  t2: "bg-glacier/15 text-glacier border border-glacier/40",
  t3: "bg-marker/15 text-marker border border-marker/40",
  t4: "bg-blaze/15 text-[#ff7b72] border border-blaze/45",
};

export default function HikeCard({ hike, index, active, onSelect, onHoverChange }: HikeCardProps) {
  const ru = RUHE[hike.crowd];

  return (
    <div
      className={`hike-card relative cursor-pointer overflow-hidden rounded-[11px] border bg-panel-2 p-[13px_14px] transition-all duration-150 hover:-translate-y-px hover:border-muted-2 ${
        active ? "border-marker shadow-[inset_0_0_0_1px_#FFC300]" : "border-line"
      }`}
      style={{ animationDelay: `${index * 0.04}s` }}
      onClick={() => onSelect(hike.id)}
      onMouseEnter={() => onHoverChange(hike.id, true)}
      onMouseLeave={() => onHoverChange(hike.id, false)}
    >
      <div className="flex items-start justify-between gap-[10px]">
        <div>
          <h3 className="m-0 font-display text-[15.5px] font-semibold leading-[1.15] tracking-tight">
            {hike.name}
          </h3>
          <div className="mt-[3px] text-[11px] text-muted">
            {hike.region} · {hike.canton}
          </div>
        </div>
        <span className={`shrink-0 whitespace-nowrap rounded-md px-[7px] py-[3px] font-mono text-[10px] font-bold tracking-wide ${GRADE_CLASSES[difClass(hike.diff.g)]}`}>
          {hike.diff.g}
        </span>
      </div>

      <div className="mt-[10px] flex gap-[13px] font-mono text-[11px] text-muted">
        <span><b className="font-bold text-text">{hike.time}</b> h</span>
        <span><b className="font-bold text-text">{hike.dist}</b> km</span>
        <span>↗ <b className="font-bold text-text">{hike.asc}</b> m</span>
      </div>

      <div className="mt-[11px] flex items-center gap-[9px] border-t border-dashed border-line pt-[10px]">
        <RuheGauge crowd={hike.crowd} size={38} />
        <div className="text-[11px] leading-[1.25]">
          <b className="block font-display text-[12.5px] font-semibold">{ru.label}</b>
          <span className="font-mono text-[9.5px] uppercase tracking-[.1em] text-muted-2">{ru.code}</span>
        </div>
      </div>
    </div>
  );
}
