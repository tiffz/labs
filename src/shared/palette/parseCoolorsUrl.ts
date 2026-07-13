import { normalizeHex } from '../color';

const COOLORS_HOST_RE = /^(?:https?:\/\/)?(?:www\.)?coolors\.co\//i;
const HEX_SEGMENT_RE = /^[0-9a-fA-F]{6}$/;

/** Parse Coolors palette URL or path like `cdb4db-ffc8dd-ffafcc`. */
export function parseCoolorsUrl(input: string): string[] | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let path = trimmed;
  if (COOLORS_HOST_RE.test(trimmed)) {
    try {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      path = url.pathname.replace(/^\//, '');
    } catch {
      return null;
    }
  }

  const segments = path.split('-').filter(Boolean);
  const hexes: string[] = [];
  for (const seg of segments) {
    if (!HEX_SEGMENT_RE.test(seg)) continue;
    const normalized = normalizeHex(seg);
    if (normalized) hexes.push(normalized);
  }
  return hexes.length > 0 ? hexes : null;
}

export function parseHexListPaste(input: string): string[] | null {
  const parts = input
    .split(/[\s,;]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const hexes: string[] = [];
  for (const part of parts) {
    const withHash = part.startsWith('#') ? part : `#${part}`;
    const normalized = normalizeHex(withHash);
    if (normalized) hexes.push(normalized);
  }
  return hexes.length > 0 ? hexes : null;
}

export function parseCssVariablesPaste(input: string): string[] | null {
  const matches = input.match(/#[0-9a-fA-F]{6}\b/g);
  if (!matches || matches.length === 0) return null;
  return matches.map((m) => normalizeHex(m)!).filter(Boolean);
}

export function parsePalettegenUrlPaste(input: string): string[] | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let search = '';
  if (trimmed.includes('?')) {
    const queryStart = trimmed.indexOf('?');
    search = trimmed.slice(queryStart + 1);
  } else if (/\/palette(?:gen)?\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `https://labs.local${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`);
      search = url.searchParams.toString();
    } catch {
      return null;
    }
  } else {
    return null;
  }

  const params = new URLSearchParams(search);
  const colorsParam = params.get('colors');
  if (!colorsParam) return null;

  const hexes: string[] = [];
  for (const segment of colorsParam.split(',')) {
    const normalized = normalizeHex(segment.trim().startsWith('#') ? segment.trim() : `#${segment.trim()}`);
    if (normalized) hexes.push(normalized);
  }
  return hexes.length > 0 ? hexes : null;
}

export function parsePalettePaste(input: string): string[] | null {
  return (
    parsePalettegenUrlPaste(input) ??
    parseCoolorsUrl(input) ??
    parseHexListPaste(input) ??
    parseCssVariablesPaste(input)
  );
}
