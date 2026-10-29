/**
 * Read-only access to Encore's original songs on Drive, for apps other than Encore (ADR 0032).
 *
 * Encore owns the songs; a reader never creates, edits or trashes anything under `Encore_App`.
 * This module imports only Drive *read* helpers, and a guardrail test holds it to that.
 *
 * Layout (Encore's own sync writes it, `src/encore/originals/drive/originalsSharded.ts`):
 *   My Drive/Encore_App/Originals/originals_manifest.json  →  { originals: { [songId]: { fileId, updatedAt } } }
 *   one JSON file per song, opened through the manifest's `fileId`, never by name
 */
import { escapeDriveQueryLiteral } from '../drive/escapeDriveQueryLiteral';
import { driveGetMedia, driveListFiles } from '../drive/driveFetch';

export const ENCORE_APP_FOLDER_NAME = 'Encore_App';
export const ENCORE_ORIGINALS_FOLDER_NAME = 'Originals';
export const ENCORE_ORIGINALS_MANIFEST_NAME = 'originals_manifest.json';

/** The few song fields another app may rely on. Encore's round-trip test guards them. */
export type EncoreOriginalSummary = {
  id: string;
  title: string;
  /** Inline ChordPro, as Encore stores it. */
  lyricsAndChords: string;
  instrumental: boolean;
  /** YYYY-MM-DD when songwriting began, when known. */
  startedAt?: string;
  updatedAt: string;
};

/**
 * `unavailable` means the songs could not be checked (no Encore folder yet, no manifest, a Drive
 * error). It never comes back as an empty list, which would read as "you have no songs".
 */
export type EncoreOriginalsRead =
  | { status: 'ok'; songs: EncoreOriginalSummary[] }
  | { status: 'unavailable'; reason: string };

/** Parse one song file. Null when it is not a song this reader understands. */
export function parseEncoreOriginalSong(json: string): EncoreOriginalSummary | null {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (typeof data.id !== 'string' || typeof data.updatedAt !== 'string') return null;
  return {
    id: data.id,
    title: typeof data.title === 'string' && data.title.trim() ? data.title : 'Untitled song',
    lyricsAndChords: typeof data.lyricsAndChords === 'string' ? data.lyricsAndChords : '',
    instrumental: data.instrumental === true,
    startedAt: typeof data.startedAt === 'string' ? data.startedAt : undefined,
    updatedAt: data.updatedAt,
  };
}

type ManifestEntry = { fileId: string; updatedAt: string };

function parseManifest(json: string): Record<string, ManifestEntry> | null {
  try {
    const data = JSON.parse(json) as { version?: unknown; originals?: unknown };
    if (data.version !== 1 || !data.originals || typeof data.originals !== 'object') return null;
    return data.originals as Record<string, ManifestEntry>;
  } catch {
    return null;
  }
}

async function findFolder(token: string, name: string, parentId: string): Promise<string | undefined> {
  const q = `name='${escapeDriveQueryLiteral(name)}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`;
  return (await driveListFiles(token, q)).files?.[0]?.id;
}

/** Song files already parsed, keyed by file id and version, so a re-read fetches only what changed. */
const songCache = new Map<string, EncoreOriginalSummary | null>();

/**
 * Every original song in the owner's Encore, newest first. Fetches the manifest, then each song
 * file whose version this tab has not read yet, a few at a time.
 */
export async function readEncoreOriginals(token: string): Promise<EncoreOriginalsRead> {
  try {
    const appId = await findFolder(token, ENCORE_APP_FOLDER_NAME, 'root');
    if (!appId) return { status: 'unavailable', reason: 'No Encore folder in Drive yet.' };
    const originalsId = await findFolder(token, ENCORE_ORIGINALS_FOLDER_NAME, appId);
    if (!originalsId) return { status: 'unavailable', reason: 'Encore has not backed up any songs yet.' };
    const manifestQ = `name='${ENCORE_ORIGINALS_MANIFEST_NAME}' and '${originalsId}' in parents and trashed=false`;
    const manifestId = (await driveListFiles(token, manifestQ)).files?.[0]?.id;
    if (!manifestId) return { status: 'unavailable', reason: 'Encore has not backed up any songs yet.' };
    const entries = parseManifest(await driveGetMedia(token, manifestId));
    if (!entries) return { status: 'unavailable', reason: 'Encore’s song list could not be read.' };

    const list = Object.values(entries).filter((e) => typeof e?.fileId === 'string');
    const songs: EncoreOriginalSummary[] = [];
    for (let i = 0; i < list.length; i += 6) {
      const batch = await Promise.all(
        list.slice(i, i + 6).map(async (entry) => {
          const key = `${entry.fileId}@${entry.updatedAt}`;
          if (!songCache.has(key)) songCache.set(key, parseEncoreOriginalSong(await driveGetMedia(token, entry.fileId)));
          return songCache.get(key) ?? null;
        }),
      );
      for (const song of batch) if (song) songs.push(song);
    }
    songs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return { status: 'ok', songs };
  } catch (e) {
    return { status: 'unavailable', reason: e instanceof Error ? e.message : 'Drive could not be reached.' };
  }
}

/** Lyrics without the ChordPro chords and directives, for quoting. */
export function encoreLyricsPlainText(lyricsAndChords: string): string {
  return lyricsAndChords
    .split('\n')
    .filter((line) => !/^\s*\{[^}]*\}\s*$/.test(line))
    .map((line) => line.replace(/\[[^\]]*\]/g, '').trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
