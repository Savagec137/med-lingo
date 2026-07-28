export interface HomeXpDay {
  date: string;
  xp: number;
}

export function aggregateXpHistory(
  rows: { amount: number; created_at: string }[],
  days: number,
  now = new Date(),
): HomeXpDay[] {
  const byDay: Record<string, number> = {};
  for (let index = 0; index < days; index++) {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (days - 1 - index));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate(),
    ).padStart(2, "0")}`;
    byDay[key] = 0;
  }
  rows.forEach((row) => {
    const date = new Date(row.created_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate(),
    ).padStart(2, "0")}`;
    if (key in byDay) byDay[key] += row.amount;
  });
  return Object.entries(byDay).map(([date, xp]) => ({ date, xp }));
}
