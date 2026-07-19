import {
  driveCreateFolder,
  driveGetFileMetadata,
  driveGetMediaArrayBuffer,
  driveListFiles,
  driveTrashFile,
  driveUploadFileResumable,
} from '../../shared/drive/driveFetch';
import { inferMediaMimeType } from '../../shared/drive/inferMediaMimeType';
import { stanzaDb, type StanzaSong, type StanzaStemTrack } from '../db/stanzaDb';
import { escapeDriveQueryLiteral } from '../../shared/drive/escapeDriveQueryLiteral';

/** Child folder under `Tiff Zhang Labs/Stanza` for mix-layer audio bytes. */
export const STANZA_DRIVE_STEM_AUDIO_FOLDER = 'stem_audio';

export function stanzaStemBytesFingerprint(blob: Blob): string {
  const type = blob.type?.trim() || 'application/octet-stream';
  return `${blob.size}:${type}`;
}

function stemNeedsDriveUpload(stem: StanzaStemTrack): boolean {
  if (!stem.localBlob?.size) return false;
  const fp = stanzaStemBytesFingerprint(stem.localBlob);
  if (!stem.driveFileId?.trim()) return true;
  return stem.driveStemBytesFingerprint !== fp;
}

function stemDriveFileName(songId: string, stem: StanzaStemTrack): string {
  const safeLabel = stem.label.replace(/[^\w.-]+/g, '_').slice(0, 40) || 'layer';
  const ext =
    stem.localBlob.type.includes('wav')
      ? 'wav'
      : stem.localBlob.type.includes('ogg')
        ? 'ogg'
        : stem.localBlob.type.includes('mpeg') || stem.localBlob.type.includes('mp3')
          ? 'mp3'
          : 'audio';
  return `stem_${songId.slice(0, 8)}_${stem.id.slice(0, 8)}_${safeLabel}.${ext}`;
}

function blobToUploadFile(blob: Blob, name: string): File {
  const file = new File([blob], name, { type: blob.type || 'application/octet-stream' });
  const type = inferMediaMimeType(file);
  return new File([blob], name, { type });
}

async function ensureStanzaStemAudioFolder(accessToken: string, appFolderId: string): Promise<string> {
  const q = `name='${escapeDriveQueryLiteral(STANZA_DRIVE_STEM_AUDIO_FOLDER)}' and mimeType='application/vnd.google-apps.folder' and '${appFolderId}' in parents and trashed=false`;
  const list = await driveListFiles(accessToken, q);
  const existing = (list.files?.[0] as { id?: string } | undefined)?.id;
  if (existing) return existing;
  const created = await driveCreateFolder(accessToken, STANZA_DRIVE_STEM_AUDIO_FOLDER, appFolderId);
  return created.id;
}

async function uploadOneStem(
  accessToken: string,
  stemsFolderId: string,
  songId: string,
  stem: StanzaStemTrack,
): Promise<StanzaStemTrack> {
  if (!stemNeedsDriveUpload(stem)) return stem;
  const fp = stanzaStemBytesFingerprint(stem.localBlob);
  const fileName = stemDriveFileName(songId, stem);
  const file = blobToUploadFile(stem.localBlob, fileName);
  const { id } = await driveUploadFileResumable(accessToken, file, [stemsFolderId], fileName);
  const prevId = stem.driveFileId?.trim();
  if (prevId && prevId !== id) {
    try {
      await driveTrashFile(accessToken, prevId);
    } catch {
      /* best-effort */
    }
  }
  return { ...stem, driveFileId: id, driveStemBytesFingerprint: fp };
}

/**
 * Upload mix-layer blobs for local songs and persist `driveFileId` on each stem.
 * Does not bump `updatedAt` (avoids re-triggering auto-push loops mid-backup).
 */
export async function syncStanzaLibraryStemsToDrive(
  accessToken: string,
  appFolderId: string,
): Promise<number> {
  const stemsFolderId = await ensureStanzaStemAudioFolder(accessToken, appFolderId);
  const rows = await stanzaDb.songs.toArray();
  let uploaded = 0;
  for (const row of rows) {
    if (!(row.stems?.length)) continue;
    const nextStems: StanzaStemTrack[] = [];
    let changed = false;
    for (const stem of row.stems) {
      if (!stemNeedsDriveUpload(stem)) {
        nextStems.push(stem);
        continue;
      }
      nextStems.push(await uploadOneStem(accessToken, stemsFolderId, row.id, stem));
      changed = true;
      uploaded += 1;
    }
    if (changed) {
      const fresh = await stanzaDb.songs.get(row.id);
      if (!fresh) continue;
      await stanzaDb.songs.put({ ...fresh, stems: nextStems, updatedAt: fresh.updatedAt });
    }
  }
  return uploaded;
}

export function stanzaSongStemsNeedHydration(song: Pick<StanzaSong, 'stems'>): boolean {
  return (song.stems ?? []).some(
    (s) => Boolean(s.driveFileId?.trim()) && (!s.localBlob || s.localBlob.size === 0),
  );
}

/** Download stem bytes referenced by `driveFileId` when this device only has metadata. */
export async function hydrateStanzaSongStems(opts: {
  accessToken: string;
  row: StanzaSong;
}): Promise<StanzaSong> {
  const { accessToken, row } = opts;
  if (!stanzaSongStemsNeedHydration(row)) return row;
  const nextStems: StanzaStemTrack[] = [];
  let changed = false;
  for (const stem of row.stems ?? []) {
    const fid = stem.driveFileId?.trim();
    if (fid && (!stem.localBlob || stem.localBlob.size === 0)) {
      try {
        const meta = await driveGetFileMetadata(accessToken, fid);
        const buf = await driveGetMediaArrayBuffer(accessToken, fid);
        const mime =
          meta.mimeType && meta.mimeType !== 'application/octet-stream'
            ? meta.mimeType
            : 'audio/mpeg';
        nextStems.push({ ...stem, localBlob: new Blob([buf], { type: mime }) });
        changed = true;
        continue;
      } catch {
        nextStems.push(stem);
        continue;
      }
    }
    nextStems.push(stem);
  }
  if (!changed) return row;
  const next = { ...row, stems: nextStems };
  await stanzaDb.songs.put({ ...next, updatedAt: row.updatedAt });
  return next;
}

/** After a Drive metadata pull or snapshot restore, fetch any missing mix-layer audio. */
export async function hydrateStanzaLibraryStemsFromDrive(accessToken: string): Promise<number> {
  const rows = await stanzaDb.songs.toArray();
  let count = 0;
  for (const row of rows) {
    if (!stanzaSongStemsNeedHydration(row)) continue;
    await hydrateStanzaSongStems({ accessToken, row });
    count += 1;
  }
  return count;
}
