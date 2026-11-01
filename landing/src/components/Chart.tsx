import { useId } from "react";

type AreaChartProps = {
  values: number[];
  /** Height of the plot in viewBox units; width is fixed so the aspect stays stable. */
  height?: number;
  className?: string;
  grid?: boolean;
  endDot?: boolean;
  fill?: boolean;
  strokeWidth?: number;
};

const WIDTH = 640;
const PAD_X = 6;
const PAD_TOP = 14;
const PAD_BOTTOM = 8;

// Catmull-Rom-ish smoothing: control points sit at the horizontal midpoint of
// each segment, which keeps the curve from overshooting the data.
function smoothPath(points: { x: number; y: number }[]): string {
  return points.reduce((d, point, i) => {
    if (i === 0) return `M${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    const prev = points[i - 1];
    const cx = (prev.x + point.x) / 2;
    return `${d} C${cx.toFixed(2)} ${prev.y.toFixed(2)} ${cx.toFixed(2)} ${point.y.toFixed(2)} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  }, "");
}

export function AreaChart({
  values,
  height = 220,
  className,
  grid = true,
  endDot = true,
  fill = true,
  strokeWidth = 2,
}: AreaChartProps) {
  const gradientId = `area-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const plotHeight = height - PAD_TOP - PAD_BOTTOM;

  const points = values.map((value, i) => ({
    x: PAD_X + (i * (WIDTH - PAD_X * 2)) / Math.max(values.length - 1, 1),
    y: PAD_TOP + plotHeight - ((value - min) / span) * plotHeight,
  }));

  const line = smoothPath(points);
  const last = points[points.length - 1];
  const baseline = height - PAD_BOTTOM;
  const area = `${line} L${last.x.toFixed(2)} ${baseline} L${points[0].x.toFixed(2)} ${baseline} Z`;

  return (
    <svg
      className={`area-chart${className ? ` ${className}` : ""}`}
      viewBox={`0 0 ${WIDTH} ${height}`}
      role="presentation"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0079C2" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#0079C2" stopOpacity="0" />
        </linearGradient>
      </defs>
      {grid
        ? [0, 1, 2, 3].map((i) => {
            const y = PAD_TOP + (plotHeight / 3) * i;
            return (
              <line
                key={i}
                x1="0"
                x2={WIDTH}
                y1={y}
                y2={y}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1"
              />
            );
          })
        : null}
      {fill ? <path d={area} fill={`url(#${gradientId})`} /> : null}
      <path
        d={line}
        fill="none"
        stroke="#4FA3D1"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {endDot ? (
        <circle cx={last.x} cy={last.y} r="3.5" fill="#0A0A0B" stroke="#4FA3D1" strokeWidth="2" />
      ) : null}
    </svg>
  );
}
