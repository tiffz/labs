/**
 * Generic compact key-value encoder/decoder for URL hash fragments.
 *
 * Convention: pairs are separated by `.`, sub-values within a pair
 * by `-`. Keys are a short prefix (1-3 chars) immediately followed
 * by the first value. Example:
 *
 *   #g100-50-0.q100-74-59-27.cv5
 *
 * This format avoids characters that require URL encoding in hash
 * fragments (%, +, /, =, &, space).
 */

export interface HashPair {
  key: string;
  values: string[];
}

/** Parse a hash fragment (without the leading `#`) into key-value pairs. */
export function parseHash(raw: string): HashPair[] {
  if (!raw) return [];
  const pairs = raw.split('.');
  const result: HashPair[] = [];

  for (const pair of pairs) {
    if (!pair) continue;
    const keyMatch = pair.match(/^([a-zA-Z]+)(.*)$/);
    if (!keyMatch) continue;
    const key = keyMatch[1];
    const rest = keyMatch[2];
    const values = rest ? rest.split('-') : [];
    result.push({ key, values });
  }

  return result;
}

/** Serialize key-value pairs into a hash fragment (without the leading `#`). */
export function serializeHash(pairs: HashPair[]): string {
  return pairs
    .filter((p) => p.values.length > 0)
    .map((p) => `${p.key}${p.values.join('-')}`)
    .join('.');
}

/** Look up a key in parsed pairs, returning its values or undefined. */
export function getHashValues(pairs: HashPair[], key: string): string[] | undefined {
  const found = pairs.find((p) => p.key === key);
  return found?.values;
}
