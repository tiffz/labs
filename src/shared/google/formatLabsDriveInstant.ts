/**
 * Human-readable timestamp for Drive backup / sync captions (today, yesterday, or Mon DD).
 */
export function formatLabsDriveInstant(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const time = d.toLocaleTimeString(undefined, { timeStyle: 'short' });
    const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const dayDelta = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86_400_000);
    if (dayDelta === 0) return `today, ${time}`;
    if (dayDelta === 1) return `yesterday, ${time}`;
    return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${time}`;
  } catch {
    return iso;
  }
}
