interface RadarAxis {
  label: string;
  /** 0..100 */
  value: number;
}
interface RadarChartProps {
  data: RadarAxis[];
  size?: number;
  max?: number;
}

/**
 * Radar de compétences en SVG pur. Aucun dep, aucune logique métier.
 */
export function RadarChart({ data, size = 260, max = 100 }: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 34;
  const n = data.length;
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;

  const point = (v: number, i: number) => {
    const rad = (v / max) * r;
    return [cx + Math.cos(angle(i)) * rad, cy + Math.sin(angle(i)) * rad] as const;
  };

  const rings = [0.25, 0.5, 0.75, 1];
  const polygon = data.map((d, i) => point(d.value, i).join(",")).join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[280px]" role="img" aria-label="Radar de compétences">
      <defs>
        <linearGradient id="radar-grad" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.78 0.15 210 / 0.7)" />
          <stop offset="100%" stopColor="oklch(0.68 0.22 300 / 0.7)" />
        </linearGradient>
      </defs>

      {rings.map((k) => (
        <polygon
          key={k}
          points={data.map((_, i) => point(max * k, i).join(",")).join(" ")}
          fill="none"
          stroke="oklch(1 0 0 / 0.10)"
        />
      ))}

      {data.map((_, i) => {
        const [x, y] = point(max, i);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="oklch(1 0 0 / 0.08)" />;
      })}

      <polygon points={polygon} fill="url(#radar-grad)" fillOpacity={0.35} stroke="url(#radar-grad)" strokeWidth={2} />

      {data.map((d, i) => {
        const [x, y] = point(d.value, i);
        return <circle key={i} cx={x} cy={y} r={4} fill="oklch(0.78 0.15 210)" />;
      })}

      {data.map((d, i) => {
        const [x, y] = point(max * 1.15, i);
        return (
          <text
            key={d.label}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-current text-[10px] font-bold"
            style={{ fill: "var(--color-muted-foreground)" }}
          >
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}
