export function getProgressPercent(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  return Math.min(100, Math.max(0, (value / max) * 100));
}

const numberFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export function formatMedocaNumber(value: number): string {
  return numberFormatter.format(Number.isFinite(value) ? Math.max(0, value) : 0);
}
