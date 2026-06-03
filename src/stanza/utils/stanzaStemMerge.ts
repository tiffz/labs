import type { StanzaStemTrack } from '../db/stanzaDb';
import type { StanzaStemDriveRow } from '../drive/stanzaDriveEnvelope';

type StemLike = StanzaStemTrack | StanzaStemDriveRow;

function emptyStemBlob(): Blob {
  return new Blob([], { type: 'application/octet-stream' });
}

function pickStemBlob(local: StanzaStemTrack | undefined, remote: StemLike | undefined): Blob {
  const localBlob = local?.localBlob;
  if (localBlob && localBlob.size > 0) return localBlob;
  const remoteBlob = remote && 'localBlob' in remote ? remote.localBlob : undefined;
  if (remoteBlob && remoteBlob.size > 0) return remoteBlob;
  return localBlob ?? remoteBlob ?? emptyStemBlob();
}

/**
 * Union mix-layer rows by stem id. Keeps local blobs when present; always carries forward
 * remote `driveFileId` metadata so other devices can hydrate bytes from `stem_audio/`.
 */
export function mergeStanzaStemTracks(
  localStems: StanzaStemTrack[] | undefined,
  remoteStems: StemLike[] | undefined,
): StanzaStemTrack[] | undefined {
  if (!localStems?.length && !remoteStems?.length) return undefined;

  const localById = new Map((localStems ?? []).map((s) => [s.id, s]));
  const out: StanzaStemTrack[] = [];
  const seen = new Set<string>();

  for (const remote of remoteStems ?? []) {
    seen.add(remote.id);
    const local = localById.get(remote.id);
    out.push({
      id: remote.id,
      label: remote.label || local?.label || 'Layer',
      muted: remote.muted ?? local?.muted,
      gain: remote.gain ?? local?.gain,
      driveFileId: remote.driveFileId ?? local?.driveFileId,
      driveStemBytesFingerprint: remote.driveStemBytesFingerprint ?? local?.driveStemBytesFingerprint,
      localBlob: pickStemBlob(local, remote),
    });
  }

  for (const local of localStems ?? []) {
    if (seen.has(local.id)) continue;
    if (local.localBlob?.size || local.driveFileId?.trim()) {
      out.push(local);
    }
  }

  return out.length > 0 ? out : undefined;
}
