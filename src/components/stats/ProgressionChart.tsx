interface Point {
  label: string;
  value: number;
}
interface ProgressionChartProps {
  data: Point[];
  height?: number;
  showAxis?: boolean;
}

/**
 * Courbe XP en SVG (aire lissée + points + labels). Zero dep.
 */
export function ProgressionChart({ data, height = 160, showAxis = true }: ProgressionChartProps) {
  const w = 640;
  const h = height;
  const pad = { l: 28, r: 12, t: 14, b: 22 };
  const max = Math.max(1, ...data.map((d) => d.value));
  const dx = (w - pad.l - pad.r) / Math.max(1, data.length - 1);
  const y = (v: number) => pad.t + (1 - v / max) * (h - pad.t - pad.b);
  const x = (i: number) => pad.l + i * dx;

  // path lissé (Catmull-Rom -> Bezier)
  const path = data
    .map((d, i, arr) => {
      const p0 = arr[Math.max(0, i - 1)]!;
      const p1 = d;
      const p2 = arr[Math.min(arr.length - 1, i + 1)]!;
      if (i === 0) return `M ${x(i)} ${y(d.value)}`;
      const cp1x = x(i - 1) + (x(i) - x(i - 2 < 0 ? 0 : i - 2)) / 6;
      const cp1y = y(p0.value) + (y(p1.value) - y(arr[Math.max(0, i - 2)]!.value)) / 6;
      const cp2x = x(i) - (x(Math.min(arr.length - 1, i + 1)) - x(i - 1)) / 6;
      const cp2y = y(p1.value) - (y(p2.value) - y(p0.value)) / 6;
      return `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x(i)} ${y(p1.value)}`;
    })
    .join(" ");

  const area = `${path} L ${x(data.length - 1)} ${h - pad.b} L ${x(0)} ${h - pad.b} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Courbe de progression XP">
      <defs>
        <linearGradient id="progress-line" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="oklch(0.78 0.15 210)" />
          <stop offset="100%" stopColor="oklch(0.68 0.22 300)" />
        </linearGradient>
        <linearGradient id="progress-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.78 0.15 210 / 0.45)" />
          <stop offset="100%" stopColor="oklch(0.78 0.15 210 / 0)" />
        </linearGradient>
      </defs>

      {showAxis
        ? [0.25, 0.5, 0.75, 1].map((k) => (
            <line
              key={k}
              x1={pad.l}
              x2={w - pad.r}
              y1={y(max * k)}
              y2={y(max * k)}
              stroke="oklch(1 0 0 / 0.06)"
              strokeDasharray="4 4"
            />
          ))
        : null}

      <path d={area} fill="url(#progress-area)" />
      <path d={path} fill="none" stroke="url(#progress-line)" strokeWidth={2.5} strokeLinecap="round" />

      {data.map((d, i) => (
        <g key={d.label}>
          <circle cx={x(i)} cy={y(d.value)} r={3.5} fill="oklch(0.16 0.03 260)" stroke="oklch(0.78 0.15 210)" strokeWidth={2} />
          {showAxis && (
            <text
              x={x(i)}
              y={h - 6}
              textAnchor="middle"
              className="text-[10px]"
              style={{ fill: "var(--color-muted-foreground)" }}
            >
              {d.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
