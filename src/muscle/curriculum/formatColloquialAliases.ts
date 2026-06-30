/** Drop aliases that repeat the display name or add no artist-facing value. */
export function formatColloquialAliases(
  displayName: string,
  colloquialNames?: string[],
  latinName?: string,
): string[] {
  if (!colloquialNames?.length) return [];
  const normalize = (value: string) => value.trim().toLowerCase();
  const blocked = new Set([normalize(displayName)]);
  if (latinName) blocked.add(normalize(latinName));

  const seen = new Set<string>();
  const result: string[] = [];
  for (const alias of colloquialNames) {
    const key = normalize(alias);
    if (!key || blocked.has(key) || seen.has(key)) continue;
    seen.add(key);
    result.push(alias);
  }
  return result;
}
