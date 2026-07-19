interface Day {
  date: string; // YYYY-MM-DD
  /** 0..1 intensité */
  intensity: number;
}
interface CalendarHeatmapProps {
  days: Day[];
  weeks?: number;
}

/**
 * Heatmap style GitHub — 7 lignes (jours), N colonnes (semaines).
 * Chaque cellule est colorée du muted au primary selon l'intensité.
 */
export function CalendarHeatmap({ days, weeks = 12 }: CalendarHeatmapProps) {
  // Group days by column of `weeks` most recent
  const map = new Map(days.map((d) => [d.date, d.intensity]));
  const cells: { date: string; intensity: number }[] = [];
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - (weeks * 7 - 1));
  // Align to Monday
  const shift = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - shift);
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    cells.push({ date: iso, intensity: map.get(iso) ?? 0 });
  }

  const colorFor = (v: number) => {
    if (v <= 0) return "oklch(1 0 0 / 0.05)";
    const a = 0.2 + Math.min(1, v) * 0.8;
    return `oklch(0.78 0.15 210 / ${a})`;
  };

  return (
    <div className="overflow-x-auto">
      <div
        className="grid gap-1"
        style={{
          gridTemplateRows: "repeat(7, 1fr)",
          gridAutoFlow: "column",
          gridAutoColumns: 14,
        }}
        aria-label="Activité des dernières semaines"
      >
        {cells.map((c) => (
          <div
            key={c.date}
            title={`${c.date} · ${Math.round(c.intensity * 100)}%`}
            className="h-3.5 w-3.5 rounded-[3px]"
            style={{ background: colorFor(c.intensity) }}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
        Moins
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <span key={v} className="h-3 w-3 rounded-[3px]" style={{ background: colorFor(v) }} />
        ))}
        Plus
      </div>
    </div>
  );
}
