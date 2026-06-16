import { useEffect, useRef } from "react";
import { Chart, type ChartConfiguration } from "chart.js/auto";
import type { ElevationPoint } from "../types";

interface ElevationChartProps {
  points: ElevationPoint[];
  color: string;
  onHoverPoint: (point: ElevationPoint | null) => void;
}

export default function ElevationChart({
  points,
  color,
  onHoverPoint,
}: ElevationChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || points.length < 2) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, 0, 150);
    grad.addColorStop(0, `${color}cc`);
    grad.addColorStop(1, `${color}10`);

    const labels = points.map((p) => p.distanceM / 1000);
    const data = points.map((p) => p.elevationM);

    const config: ChartConfiguration<"line"> = {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            data,
            borderColor: color,
            backgroundColor: grad,
            borderWidth: 2,
            fill: true,
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: "#fff",
            pointHoverBorderColor: color,
            pointHoverBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400, easing: "easeOutCubic" },
        interaction: { mode: "index", intersect: false },
        onHover: (_evt, els) => {
          if (els.length > 0) {
            onHoverPoint(points[els[0].index] ?? null);
          } else {
            onHoverPoint(null);
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#151C17",
            titleColor: "#ECEFE6",
            bodyColor: "#ECEFE6",
            displayColors: false,
            padding: 8,
            cornerRadius: 4,
            callbacks: {
              title: (items) =>
                `${parseFloat(String(items[0].label)).toFixed(2)} km`,
              label: (item) => `${Math.round(item.parsed.y ?? 0)} m`,
            },
          },
        },
        scales: {
          x: {
            type: "linear",
            min: 0,
            max: labels[labels.length - 1],
            offset: false,
            ticks: {
              color: "#94A38C",
              callback: (v) => `${Number(v).toFixed(1)} km`,
              maxTicksLimit: 6,
            },
            grid: { color: "rgba(148,163,140,0.2)" },
          },
          y: {
            ticks: {
              color: "#94A38C",
              callback: (v) => `${Math.round(Number(v))}`,
              maxTicksLimit: 5,
            },
            grid: { color: "rgba(148,163,140,0.2)" },
          },
        },
      },
    };

    chartRef.current?.destroy();
    chartRef.current = new Chart(ctx, config);

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [points, color, onHoverPoint]);

  if (points.length < 2) {
    return (
      <div className="flex h-[150px] items-center justify-center rounded-[10px] border border-line bg-panel-2 text-[12px] text-muted">
        Höhenprofil erscheint, sobald eine Route berechnet ist.
      </div>
    );
  }

  return (
    <div className="relative h-[150px] rounded-[10px] border border-line bg-panel-2 p-2">
      <canvas ref={canvasRef} />
    </div>
  );
}
