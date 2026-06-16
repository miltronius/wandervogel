interface RuheGaugeProps {
  crowd: 1 | 2 | 3 | 4 | 5;
  size: number;
}

/** SIGNATURE: contour-ring Ruhe gauge — quiet hikes get more rings */
export default function RuheGauge({ crowd, size }: RuheGaugeProps) {
  const rings = 6 - crowd;
  const c = size / 2;
  const max = c - 2;
  const circles = Array.from({ length: rings }, (_, i) => {
    const r = max - (i * (max - 3)) / Math.max(rings - 1, 1);
    const op = (0.35 + 0.65 * (i / Math.max(rings - 1, 1))).toFixed(2);
    return { r: r.toFixed(1), op };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      {circles.map((circle, i) => (
        <circle
          key={i}
          cx={c}
          cy={c}
          r={circle.r}
          fill="none"
          stroke="#86B23F"
          strokeWidth={1.4}
          opacity={circle.op}
        />
      ))}
      <circle cx={c} cy={c} r={2} fill="#86B23F" />
    </svg>
  );
}
