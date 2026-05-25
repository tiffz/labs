import type { StanzaSong } from '../db/stanzaDb';
import type { StanzaSongDriveRow } from '../drive/stanzaDriveEnvelope';

/**
 * Stable content key for local uploads across devices (same bytes + duration → same fingerprint).
 * YouTube and Drive-linked rows use their own ids instead; see `stanzaSongContentKey`.
 */
export function computeStanzaLocalMediaFingerprint(opts: {
  sizeBytes: number;
  durationSec?: number | null;
  fileName?: string | null;
}): string {
  const size = Math.max(0, Math.floor(opts.sizeBytes));
  const dur = opts.durationSec;
  if (typeof dur === 'number' && Number.isFinite(dur) && dur > 0) {
    return `${size}:${dur.toFixed(2)}`;
  }
  const name = opts.fileName?.trim().toLowerCase();
  if (name) return `${size}:name:${name}`;
  return `${size}:unknown`;
}

type FingerprintSource = Pick<StanzaSong, 'localMediaFingerprint' | 'localAudioBlob' | 'title'>;

export function stanzaLocalMediaFingerprintForRow(row: FingerprintSource): string | null {
  const stored = row.localMediaFingerprint?.trim();
  if (stored) return stored;
  const blob = row.localAudioBlob;
  if (!blob) return null;
  return computeStanzaLocalMediaFingerprint({
    sizeBytes: blob.size,
    fileName: row.title,
  });
}

export function stanzaLocalMediaFingerprintForDriveRow(row: StanzaSongDriveRow): string | null {
  const stored = row.localMediaFingerprint?.trim();
  if (stored) return stored;
  return null;
}
