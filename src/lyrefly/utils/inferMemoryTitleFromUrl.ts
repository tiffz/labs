import { richTextLinkPreview } from '../../shared/utils/richTextContent';
import { inferConceptLabelFromUrl } from './conceptShelfUtils';

/** Normalize optional memory URLs (adds https when omitted). */
export function normalizeMemoryUrl(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  try {
    return new URL(trimmed).href;
  } catch {
    try {
      return new URL(`https://${trimmed}`).href;
    } catch {
      return undefined;
    }
  }
}

function humanizePathSegment(segment: string): string | null {
  const decoded = decodeURIComponent(segment).replace(/[-_]+/g, ' ').replace(/\.\w+$/i, '').trim();
  if (decoded.length < 4) return null;
  return decoded.charAt(0).toUpperCase() + decoded.slice(1);
}

/** Best-effort title for a memory from its URL. */
export function inferMemoryTitleFromUrl(rawUrl: string): string {
  const normalized = normalizeMemoryUrl(rawUrl);
  if (!normalized) return '';

  const conceptLabel = inferConceptLabelFromUrl(normalized);
  const looksLikeBareHostname = /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(conceptLabel);
  if (conceptLabel && conceptLabel !== 'Reference' && !looksLikeBareHostname) {
    return conceptLabel;
  }

  try {
    const url = new URL(normalized);
    const segments = url.pathname.split('/').filter(Boolean);
    for (let index = segments.length - 1; index >= 0; index -= 1) {
      const humanized = humanizePathSegment(segments[index]!);
      if (humanized) return humanized;
    }
    const preview = richTextLinkPreview(normalized);
    return preview.title || normalized;
  } catch {
    return rawUrl.trim();
  }
}
