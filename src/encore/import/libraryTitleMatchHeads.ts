/** Characters that may open the show/film name after `From` in soundtrack-style titles. */
const FROM_OPEN_QUOTE = "[\"'\u201c\u2018]";

/**
 * Returns the full title plus shorter "heads" used for fuzzy matching (e.g. Spotify-style
 * `Let It Go - From "Frozen"/…` → also `Let It Go`). Avoids splitting on ` - From ` when there is
 * no opening quote (e.g. a literal place name after "From").
 */
export function libraryTitleMatchHeads(raw: string): readonly string[] {
  const t = raw.trim();
  if (!t) return [];
  const out: string[] = [];
  const push = (s: string) => {
    const x = s.trim();
    if (!x) return;
    if (!out.some((o) => o.toLowerCase() === x.toLowerCase())) out.push(x);
  };
  push(t);

  const stripDashFrom = t.match(new RegExp(`^(.*?)\\s+[-–—]\\s+From\\s+${FROM_OPEN_QUOTE}`, 'i'));
  if (stripDashFrom?.[1]) push(stripDashFrom[1]);

  const stripParenFrom = t.match(new RegExp(`^(.*?)\\s+\\(\\s*From\\s+${FROM_OPEN_QUOTE}`, 'i'));
  if (stripParenFrom?.[1]) push(stripParenFrom[1]);

  return out;
}
