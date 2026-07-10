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
  const size = Math.max(0, Math.floor(Number.isFinite(opts.sizeBytes) ? opts.sizeBytes : 0));
  const dur = opts.durationSec;
  if (typeof dur === 'number' && Number.isFinite(dur) && dur > 0) {
    return `${size}:${dur.toFixed(2)}`;
  }
  const name = opts.fileName?.trim().toLowerCase();
  if (name) return `${size}:name:${name}`;
  return `${size}:unknown`;
}

function fingerprintByteSize(token: string): string | null {
  const size = token.split(':')[0];
  return size && /^\d+$/.test(size) ? size : null;
}

/** Parses `size:duration` fingerprints produced by {@link computeStanzaLocalMediaFingerprint}. */
export function stanzaFingerprintDurationSec(token: string | undefined | null): number | null {
  const trimmed = token?.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(':');
  if (parts.length !== 2) return null;
  const dur = Number(parts[1]);
  return Number.isFinite(dur) && dur > 0 ? dur : null;
}

function fingerprintDurationSec(token: string): number | null {
  return stanzaFingerprintDurationSec(token);
}

function fingerprintNameHint(token: string): string | null {
  const marker = ':name:';
  const idx = token.indexOf(marker);
  if (idx < 0) return null;
  const name = token.slice(idx + marker.length).trim().toLowerCase();
  return name || null;
}

/** True when two fingerprints likely refer to the same uploaded bytes (cross-device id drift). */
export function stanzaLocalMediaFingerprintsMatch(
  a: string | undefined | null,
  b: string | undefined | null,
): boolean {
  const left = a?.trim();
  const right = b?.trim();
  if (!left || !right) return false;
  if (left === right) return true;

  const leftSize = fingerprintByteSize(left);
  const rightSize = fingerprintByteSize(right);
  if (!leftSize || leftSize !== rightSize) return false;

  const leftDur = fingerprintDurationSec(left);
  const rightDur = fingerprintDurationSec(right);
  if (leftDur != null && rightDur != null) {
    return Math.abs(leftDur - rightDur) <= 0.5;
  }

  const leftName = fingerprintNameHint(left);
  const rightName = fingerprintNameHint(right);
  if (leftName && rightName) {
    return leftName === rightName;
  }

  // Cross-format: one device stored size+duration, another stored size+filename before probing.
  if ((leftDur != null && rightName) || (rightDur != null && leftName)) {
    return true;
  }

  return false;
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
