/**
 * Stanza practice overlay Drive sync — Phase 1 dual-read / dual-write (ADR 0007 Option B).
 * Reads and writes `Encore_App/stanza_practice_overlay.json` alongside legacy Stanza `progress.json`.
 */

import type { StanzaSong } from '../db/stanzaDb';
import {
  driveCreateJsonFile,
  driveGetMedia,
  driveListFiles,
  drivePatchJsonMedia,
} from '../../shared/drive/driveFetch';
import {
  emptyStanzaPracticeOverlayV1,
  isStanzaPracticeOverlayV1,
  STANZA_PRACTICE_OVERLAY_FILE_NAME,
  type StanzaPracticeOverlayEntry,
  type StanzaPracticeOverlayKey,
  type StanzaPracticeOverlayV1,
} from './stanzaPracticeOverlay';

function qJsonInEncoreRoot(name: string, encoreRootId: string): string {
  return `name='${name.replace(/'/g, "\\'")}' and mimeType='application/json' and '${encoreRootId}' in parents and trashed=false`;
}

/** Must match Encore `ENCORE_ROOT_FOLDER` — duplicated to respect import boundaries. */
const ENCORE_APP_FOLDER_NAME = 'Encore_App';

function qEncoreRootFolder(): string {
  return `name='${ENCORE_APP_FOLDER_NAME.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false`;
}

export async function resolveEncoreAppFolderId(accessToken: string): Promise<string | null> {
  const list = await driveListFiles(accessToken, qEncoreRootFolder());
  return (list.files?.[0] as { id?: string } | undefined)?.id ?? null;
}

export async function readStanzaPracticeOverlayFromDrive(
  accessToken: string,
  encoreRootId: string,
): Promise<StanzaPracticeOverlayV1 | null> {
  const list = await driveListFiles(accessToken, qJsonInEncoreRoot(STANZA_PRACTICE_OVERLAY_FILE_NAME, encoreRootId));
  const fileId = (list.files?.[0] as { id?: string } | undefined)?.id;
  if (!fileId) return null;
  try {
    const raw = await driveGetMedia(accessToken, fileId);
    const parsed = JSON.parse(raw) as unknown;
    return isStanzaPracticeOverlayV1(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function overlayKeyForStanzaSong(row: StanzaSong): StanzaPracticeOverlayKey {
  if (row.encoreSongId) return row.encoreSongId;
  if (row.driveSourceFileId) return `drive:${row.driveSourceFileId}`;
  if (row.ytId) return `yt:${row.ytId}`;
  return row.id;
}

const OVERLAY_FIELDS: (keyof StanzaPracticeOverlayEntry)[] = [
  'markers',
  'stats',
  'primaryGain',
  'primaryMuted',
  'metronomeBySegmentId',
  'metronomeSongCalibration',
  'metronomeTimingScope',
  'metronomeEnabled',
  'metronomeGain',
  'metronomeMuted',
  'drumsEnabled',
  'drumPattern',
  'drumsGain',
  'drumsMuted',
  'localTransposeSemitones',
  'localOriginalKey',
  'skippedBySegmentId',
  'stems',
  'updatedAt',
];

function entryFromSong(row: StanzaSong): StanzaPracticeOverlayEntry {
  const entry: StanzaPracticeOverlayEntry = {
    updatedAt: row.updatedAt,
    markers: row.markers,
    stats: row.stats,
  };
  for (const key of OVERLAY_FIELDS) {
    if (key === 'updatedAt') continue;
    const value = row[key as keyof StanzaSong];
    if (value !== undefined) {
      (entry as Record<string, unknown>)[key] = value;
    }
  }
  if (row.encoreSongId) entry.encoreSongId = row.encoreSongId;
  if (row.driveSourceFileId) entry.driveSourceFileId = row.driveSourceFileId;
  if (row.ytId != null) entry.ytId = row.ytId;
  return entry;
}

export function buildStanzaPracticeOverlayFromRows(rows: StanzaSong[]): StanzaPracticeOverlayV1 {
  const overlay = emptyStanzaPracticeOverlayV1();
  overlay.exportedAt = new Date().toISOString();
  for (const row of rows) {
    overlay.entries[overlayKeyForStanzaSong(row)] = entryFromSong(row);
  }
  return overlay;
}

/** Marker-safe merge: overlay wins when it has equal or more markers per segment. */
export function mergeStanzaPracticeOverlayIntoRows(
  rows: StanzaSong[],
  overlay: StanzaPracticeOverlayV1,
): StanzaSong[] {
  const byKey = new Map<string, StanzaPracticeOverlayEntry>();
  for (const [key, entry] of Object.entries(overlay.entries)) {
    byKey.set(key, entry);
  }
  return rows.map((row) => {
    const entry = byKey.get(overlayKeyForStanzaSong(row));
    if (!entry) return row;
    const localMarkerCount = (row.markers ?? []).length;
    const overlayMarkerCount = (entry.markers ?? []).length;
    if (overlayMarkerCount < localMarkerCount) return row;
    const merged: StanzaSong = { ...row };
    for (const key of OVERLAY_FIELDS) {
      if (key === 'updatedAt') {
        if (entry.updatedAt >= row.updatedAt) merged.updatedAt = entry.updatedAt;
        continue;
      }
      const value = entry[key as keyof StanzaPracticeOverlayEntry];
      if (value !== undefined) {
        (merged as unknown as Record<string, unknown>)[key as string] = value;
      }
    }
    return merged;
  });
}

export async function writeStanzaPracticeOverlayToDrive(
  accessToken: string,
  encoreRootId: string,
  overlay: StanzaPracticeOverlayV1,
): Promise<void> {
  const body = JSON.stringify(overlay);
  const list = await driveListFiles(accessToken, qJsonInEncoreRoot(STANZA_PRACTICE_OVERLAY_FILE_NAME, encoreRootId));
  const existingId = (list.files?.[0] as { id?: string } | undefined)?.id;
  if (existingId) {
    await drivePatchJsonMedia(accessToken, existingId, body, undefined);
    return;
  }
  await driveCreateJsonFile(accessToken, body, STANZA_PRACTICE_OVERLAY_FILE_NAME, [encoreRootId]);
}
