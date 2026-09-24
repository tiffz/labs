/**
 * Leading metadata block on a pasted chart.
 *
 * Supported, case-insensitive, one per line, only BEFORE the first section header:
 *
 *     Key: C          key: Cm         {key: C}
 *     BPM: 84         Tempo: 84       {tempo: 84}
 *     Capo: 2
 *     Time: 6/8       Time signature: 6/8
 *
 * Restricted to the leading block on purpose. A lyric line that happens to read "Key: C" further
 * down the song is lyrics, and hijacking it would silently delete a line of someone's song.
 *
 * Before this existed, `Key: C` at the top of a paste became a section: type `Other`, header `""`,
 * one line of text. That is the "ghost section 1 I cannot delete" — it had no header to click. And
 * `BPM: 84` was dropped entirely, with no toast and nothing written to the song.
 */
export interface ChartMetadataHeader {
  key?: string;
  bpm?: number;
  capo?: number;
  timeSignature?: string;
  /** The chart with the metadata block removed. */
  body: string;
  /** Field names recognised, in source order — for telling the user what was picked up. */
  recognized: string[];
}

/** `Key: C` / `{key: C}` / `Tempo: 84`. Returns null when the line is not metadata. */
function parseMetadataLine(line: string): { field: string; value: string } | null {
  const trimmed = line.trim().replace(/^\{\s*/, '').replace(/\s*\}$/, '');
  if (!trimmed) return null;

  const match = /^([A-Za-z][A-Za-z ]{1,18}?)\s*[:=]\s*(.+)$/.exec(trimmed);
  if (!match) return null;

  const field = (match[1] ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  const value = (match[2] ?? '').trim();
  if (!value) return null;

  switch (field) {
    case 'key':
      return /^[A-G](?:#|b)?\s*(?:m|min|minor|maj|major)?$/i.test(value) ? { field: 'key', value } : null;
    case 'bpm':
    case 'tempo':
      return /^\d{2,3}$/.test(value) ? { field: 'bpm', value } : null;
    case 'capo':
      return /^\d{1,2}$/.test(value) ? { field: 'capo', value } : null;
    case 'time':
    case 'time signature':
      return /^\d{1,2}\s*\/\s*\d{1,2}$/.test(value) ? { field: 'timeSignature', value } : null;
    default:
      return null;
  }
}

export function parseChartMetadataHeader(text: string): ChartMetadataHeader {
  const lines = text.split(/\r?\n/);
  const out: ChartMetadataHeader = { body: text, recognized: [] };

  let consumed = 0;
  for (const line of lines) {
    if (!line.trim()) {
      consumed += 1;
      continue;
    }
    const parsed = parseMetadataLine(line);
    if (!parsed) break;

    if (parsed.field === 'key' && out.key == null) out.key = parsed.value;
    else if (parsed.field === 'bpm' && out.bpm == null) out.bpm = Number(parsed.value);
    else if (parsed.field === 'capo' && out.capo == null) out.capo = Number(parsed.value);
    else if (parsed.field === 'timeSignature' && out.timeSignature == null) {
      out.timeSignature = parsed.value.replace(/\s+/g, '');
    } else {
      // A repeat of a field we already have. Consume it rather than leaving it to become a section.
      consumed += 1;
      continue;
    }
    out.recognized.push(parsed.field);
    consumed += 1;
  }

  if (out.recognized.length === 0) return { body: text, recognized: [] };
  out.body = lines.slice(consumed).join('\n').replace(/^\s*\n/, '');
  return out;
}
