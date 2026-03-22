export function parseOptionalNumberParam(
  rawValue: string | null
): number | null {
  if (rawValue === null) return null;
  if (rawValue.trim().length === 0) return null;
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : null;
}
