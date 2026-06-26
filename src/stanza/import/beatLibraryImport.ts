import { stanzaDb, type StanzaMarker, type StanzaSegmentMetronomeCalibration, type StanzaSong } from '../db/stanzaDb';
import {
  computeStanzaLocalMediaFingerprint,
  stanzaLocalMediaFingerprintForRow,
  stanzaLocalMediaFingerprintsMatch,
} from '../utils/stanzaLocalMediaFingerprint';
import type { StanzaPlaybackUrlParams } from '../utils/stanzaDriveUrlParams';
import { probeFileAudioDurationSeconds } from '../utils/probeFileAudioDuration';
import { ensureMarkerIds } from '../utils/segments';
import { buildStanzaSegmentCalibration } from '../utils/stanzaMetronome';
import { parseYoutubeVideoId } from '../utils/parseYoutubeVideoId';
import { ALL_KEYS, type MusicKey } from '../../shared/music/musicInputConstants';
import type { PersistedAnalysisBundle } from '../../shared/beat/analysisVersion';
import { isAnalysisVersionStale } from '../../shared/beat/analysisVersion';
import { calibrationFromBeatAnalysis, markAnalysisBundleStale } from '../../shared/beat/wholeSongBeatAnalysis';
import { beatPracticeSectionsToStanzaMarkers } from '../utils/beatPracticeSectionsToMarkers';

const BEAT_DB_NAME = 'beat-finder-library';
/** Tracks per-entry migration and purges Beat IDB once everything is converted. */
export const BEAT_MIGRATION_STATE_KEY = 'stanza:beat-library-migration-v3';

interface BeatLibraryEntryRow {
  id: string;
  sourceType: 'local' | 'youtube';
  mediaKind: 'audio' | 'video';
  title: string;
  fingerprint: string;
  youtubeVideoId?: string;
  sourceUrl?: string;
  updatedAt?: number;
}

interface BeatPracticeSectionRowFromIdb {
  id: string;
  label: string;
  startTime: number;
  endTime: number;
}

interface BeatPracticeDataRow {
  lanes?: unknown[];
  sections: BeatPracticeSectionRowFromIdb[];
}

interface BeatSongSettingsRow {
  settings: {
    bpm?: number;
    youtubeManualBpm?: number;
    syncStartTime?: number | null;
    metronomeEnabled?: boolean;
    metronomeVolume?: number;
    drumEnabled?: boolean;
    drumVolume?: number;
    audioVolume?: number;
    audioMuted?: boolean;
    drumMuted?: boolean;
    metronomeMuted?: boolean;
    transposeSemitones?: number;
    correctedDetectedKey?: string | null;
  };
}

interface BeatMigrationState {
  migratedEntryIds: string[];
  entryToSongId: Record<string, string>;
  /** Beat SHA256 (or other stable) fingerprint → Stanza song id for `?f=` deep links after upgrade. */
  fingerprintToSongId?: Record<string, string>;
  beatLibraryPurged?: boolean;
}

export interface BeatLibraryImportResult {
  imported: number;
  merged: number;
  skipped: number;
  /** Rows upgraded from an earlier partial Beat import (fingerprint / marker ids). */
  upgraded: number;
}

function readMigrationState(): BeatMigrationState {
  try {
    const raw = localStorage.getItem(BEAT_MIGRATION_STATE_KEY);
    if (!raw) return { migratedEntryIds: [], entryToSongId: {}, fingerprintToSongId: {} };
    const parsed = JSON.parse(raw) as BeatMigrationState;
    return {
      migratedEntryIds: Array.isArray(parsed.migratedEntryIds) ? parsed.migratedEntryIds : [],
      entryToSongId: parsed.entryToSongId ?? {},
      fingerprintToSongId: parsed.fingerprintToSongId ?? {},
      beatLibraryPurged: parsed.beatLibraryPurged,
    };
  } catch {
    return { migratedEntryIds: [], entryToSongId: {}, fingerprintToSongId: {} };
  }
}

function recordBeatFingerprintMapping(
  state: BeatMigrationState,
  fingerprint: string | undefined,
  songId: string,
): void {
  const fp = fingerprint?.trim();
  if (!fp) return;
  if (!state.fingerprintToSongId) state.fingerprintToSongId = {};
  state.fingerprintToSongId[fp] = songId;
}

/** Resolve the Beat `?f=` fingerprint for a migrated song (survives Stanza-style fingerprint upgrades). */
 
export function readBeatFingerprintForStanzaSong(songId: string): string | null {
  const state = readMigrationState();
  for (const [fp, id] of Object.entries(state.fingerprintToSongId ?? {})) {
    if (id === songId) return fp;
  }
  return null;
}

/** Map playback URL params for a library row (YouTube `v`, Drive `df`, or local upload `f`). */
 
export function resolveStanzaPlaybackUrlParamsForSong(song: StanzaSong): StanzaPlaybackUrlParams {
  const youtubeId = song.ytId ?? null;
  if (youtubeId) {
    return { youtubeId, driveFileId: null, driveTitle: null, mediaFingerprint: null };
  }
  const driveFileId = song.driveSourceFileId ?? null;
  if (driveFileId) {
    return { youtubeId: null, driveFileId, driveTitle: song.title, mediaFingerprint: null };
  }
  // Prefer the syncable size/duration fingerprint (written to Drive `progress.json`) over the
  // device-local Beat SHA256 mapping so shared `?f=` links work on other devices after pull.
  const mediaFingerprint =
    stanzaLocalMediaFingerprintForRow(song) ?? readBeatFingerprintForStanzaSong(song.id) ?? null;
  return { youtubeId: null, driveFileId: null, driveTitle: null, mediaFingerprint };
}

/** Resolve a song from a Find the Beat or Stanza local-upload `?f=` fingerprint. */
 
export async function findStanzaSongByMediaFingerprint(
  fingerprint: string,
): Promise<StanzaSong | undefined> {
  const fp = fingerprint.trim();
  if (!fp) return undefined;

  const state = readMigrationState();
  const mappedId = state.fingerprintToSongId?.[fp];
  if (mappedId) {
    const mapped = await stanzaDb.songs.get(mappedId);
    if (mapped) return mapped;
  }

  const byExact = await stanzaDb.songs.filter((song) => song.localMediaFingerprint === fp).first();
  if (byExact) return byExact;

  if (isBeatSha256Fingerprint(fp)) {
    const legacyPrefix = `local-${fp.slice(0, 16)}`;
    const legacy = await stanzaDb.songs.filter((song) => song.id.startsWith(legacyPrefix)).first();
    if (legacy) return legacy;
  }

  const all = await stanzaDb.songs.toArray();
  return all.find((song) => stanzaLocalMediaFingerprintsMatch(song.localMediaFingerprint, fp));
}

function writeMigrationState(state: BeatMigrationState): void {
  localStorage.setItem(BEAT_MIGRATION_STATE_KEY, JSON.stringify(state));
}

function openBeatDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(BEAT_DB_NAME);
      request.onerror = () => resolve(null);
      request.onsuccess = () => resolve(request.result);
    } catch {
      resolve(null);
    }
  });
}

async function deleteBeatLibraryDb(): Promise<void> {
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(BEAT_DB_NAME);
    req.onsuccess = () => resolve();
    req.onblocked = () => resolve();
    req.onerror = () => resolve();
  });
}

function idbGetAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve((req.result as T[]) ?? []);
    req.onerror = () => reject(req.error ?? new Error(`Failed to read ${store}`));
  });
}

function idbGet<T>(db: IDBDatabase, store: string, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error ?? new Error(`Failed to read ${store}/${key}`));
  });
}

function readLegacySongSettings(entryId: string): BeatSongSettingsRow['settings'] | null {
  try {
    const raw = localStorage.getItem(`beat:song-settings:${entryId}`);
    if (!raw) return null;
    return JSON.parse(raw) as BeatSongSettingsRow['settings'];
  } catch {
    return null;
  }
}

function clearLegacyBeatLocalStorage(entryIds: readonly string[]): void {
  for (const entryId of entryIds) {
    localStorage.removeItem(`beat:song-settings:${entryId}`);
  }
}

/** Map Beat `correctedDetectedKey` (12-key display set) to Stanza `localOriginalKey`. */
export function beatCorrectedKeyToStanzaLocalKey(raw: string | null | undefined): MusicKey | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  if ((ALL_KEYS as readonly string[]).includes(trimmed)) {
    return trimmed as MusicKey;
  }
  return undefined;
}

/** Resolve a YouTube id from Beat library row fields (handles older rows missing `youtubeVideoId`). */
 
export function resolveBeatYoutubeVideoId(entry: Pick<BeatLibraryEntryRow, 'youtubeVideoId' | 'sourceUrl' | 'fingerprint' | 'title'>): string | null {
  if (entry.youtubeVideoId?.trim()) {
    const fromDirect = parseYoutubeVideoId(entry.youtubeVideoId.trim());
    if (fromDirect) return fromDirect;
  }

  if (entry.sourceUrl) {
    const fromUrl = parseYoutubeVideoId(entry.sourceUrl);
    if (fromUrl) return fromUrl;
  }

  const fp = entry.fingerprint?.trim();
  if (fp?.startsWith('youtube:')) {
    const fromFp = parseYoutubeVideoId(fp.slice('youtube:'.length));
    if (fromFp) return fromFp;
  }

  return inferYoutubeVideoIdFromBeatTitle(entry.title);
}

function inferYoutubeVideoIdFromBeatTitle(title: string): string | null {
  const match = title.match(/^YouTube(?:\s+| · )([a-zA-Z0-9_-]{11})$/);
  return match?.[1] && parseYoutubeVideoId(match[1]) ? match[1] : null;
}

/**
 * Map Beat per-song settings (+ optional analysis bundle) to Stanza whole-song calibration.
 * Mirrors Beat runtime: BPM from saved override or analysis; sync from saved override or `musicStartTime`.
 */
 
export function beatSettingsToMetronomeCalibration(
  settings: BeatSongSettingsRow['settings'] | null,
  analysisBundle: PersistedAnalysisBundle | undefined,
): StanzaSegmentMetronomeCalibration | undefined {
  const bpmFromSettings = settings?.bpm ?? settings?.youtubeManualBpm;
  const bpmFromAnalysis = analysisBundle?.beat?.bpm;
  const bpm =
    typeof bpmFromSettings === 'number' && Number.isFinite(bpmFromSettings)
      ? bpmFromSettings
      : typeof bpmFromAnalysis === 'number' && Number.isFinite(bpmFromAnalysis)
        ? bpmFromAnalysis
        : undefined;
  if (bpm == null) return undefined;

  let firstBeatOffsetSec: number;
  if (typeof settings?.syncStartTime === 'number' && Number.isFinite(settings.syncStartTime)) {
    firstBeatOffsetSec = settings.syncStartTime;
  } else if (analysisBundle?.beat) {
    firstBeatOffsetSec = calibrationFromBeatAnalysis(analysisBundle.beat, 0).firstBeatOffsetSec;
  } else {
    firstBeatOffsetSec = 0;
  }

  const usedAnalysis =
    (bpmFromSettings == null && bpmFromAnalysis != null) ||
    (settings?.syncStartTime == null && analysisBundle?.beat != null);

  return buildStanzaSegmentCalibration({
    segmentStart: 0,
    bpm: Math.round(bpm),
    firstBeatOffsetSec,
    source: usedAnalysis ? 'analysis' : 'tap',
    confidence: analysisBundle?.beat?.confidence,
    analyzedAt: analysisBundle?.metadata?.analyzedAt,
  });
}

function inferMetronomeCalibrationFromAnalysisCache(
  song: StanzaSong,
): StanzaSegmentMetronomeCalibration | undefined {
  const beat = song.analysisCache?.beat;
  if (!beat || !Number.isFinite(beat.bpm)) return undefined;

  // Any saved whole-song calibration (including explicit Beat 1 = 0) beats analysis.
  if (song.metronomeSongCalibration != null) return undefined;

  const cal = calibrationFromBeatAnalysis(beat, 0);
  return buildStanzaSegmentCalibration({
    segmentStart: 0,
    bpm: cal.bpm,
    firstBeatOffsetSec: cal.firstBeatOffsetSec,
    source: 'analysis',
    confidence: cal.confidence,
    analyzedAt: song.analysisCache?.metadata.analyzedAt,
  });
}

function practiceSectionsToMarkers(sections: BeatPracticeSectionRowFromIdb[]): StanzaMarker[] {
  return beatPracticeSectionsToStanzaMarkers(sections);
}

function mergeMarkers(existing: StanzaMarker[], imported: StanzaMarker[]): StanzaMarker[] {
  if (existing.length > 0) return ensureMarkerIds(existing);
  return imported;
}

function isBeatSha256Fingerprint(fingerprint: string | undefined): boolean {
  if (!fingerprint) return false;
  return /^[a-f0-9]{64}$/i.test(fingerprint.trim());
}

function isStanzaStyleFingerprint(fingerprint: string | undefined): boolean {
  if (!fingerprint) return false;
  return /^\d+:/.test(fingerprint.trim());
}

function hasLegacyBeatMarkerIds(markers: StanzaMarker[] | undefined): boolean {
  return (markers ?? []).some((m) => m.id?.startsWith('beat-import-'));
}

async function ownedBlob(blob: Blob): Promise<Blob> {
  if (typeof blob.arrayBuffer === 'function') {
    return new Blob([await blob.arrayBuffer()], { type: blob.type || 'application/octet-stream' });
  }
  return new Blob([blob], { type: blob.type || 'application/octet-stream' });
}

async function stanzaFingerprintForBlob(blob: Blob, fileNameHint: string): Promise<string> {
  const normalized = await ownedBlob(blob);
  const file = new File([normalized], fileNameHint, { type: normalized.type || 'application/octet-stream' });
  const durationSec = await probeFileAudioDurationSeconds(file);
  return computeStanzaLocalMediaFingerprint({
    sizeBytes: normalized.size,
    durationSec,
    fileName: fileNameHint,
  });
}

async function localBlobIsPlayable(blob: Blob, fileNameHint: string): Promise<boolean> {
  const normalized = await ownedBlob(blob);
  const file = new File([normalized], fileNameHint, { type: normalized.type || 'audio/mpeg' });
  const durationSec = await probeFileAudioDurationSeconds(file);
  return durationSec != null && Number.isFinite(durationSec) && durationSec > 0;
}

function normalizeAnalysisCache(
  bundle: PersistedAnalysisBundle | undefined,
): PersistedAnalysisBundle | undefined {
  if (!bundle) return undefined;
  return isAnalysisVersionStale(bundle.metadata.analysisVersion)
    ? markAnalysisBundleStale(bundle, 'Imported from Find the Beat')
    : bundle;
}

function beatFieldsFromEntry(opts: {
  entry: BeatLibraryEntryRow;
  settings: BeatSongSettingsRow['settings'] | null;
  importedMarkers: StanzaMarker[];
  analysisBundle: PersistedAnalysisBundle | undefined;
  localAudioBlob?: Blob;
  localMediaFingerprint?: string;
  updatedAt: number;
}): Partial<StanzaSong> {
  const { entry, settings, analysisBundle, localAudioBlob, localMediaFingerprint, updatedAt } = opts;
  const metronomeSongCalibration = beatSettingsToMetronomeCalibration(settings, analysisBundle);
  return {
    title: entry.title,
    updatedAt,
    localAudioBlob,
    localMediaFingerprint,
    metronomeSongCalibration,
    metronomeEnabled: settings?.metronomeEnabled ?? false,
    metronomeGain: settings?.metronomeVolume != null ? settings.metronomeVolume / 100 : 0.5,
    metronomeMuted: settings?.metronomeMuted ?? false,
    drumsEnabled: settings?.drumEnabled ?? false,
    drumsGain: settings?.drumVolume != null ? settings.drumVolume / 100 : 0.7,
    drumsMuted: settings?.drumMuted ?? false,
    primaryGain: settings?.audioVolume != null ? settings.audioVolume / 100 : 0.8,
    primaryMuted: settings?.audioMuted ?? false,
    localTransposeSemitones: settings?.transposeSemitones ?? 0,
    localOriginalKey: beatCorrectedKeyToStanzaLocalKey(settings?.correctedDetectedKey),
    analysisCache: normalizeAnalysisCache(analysisBundle),
  };
}

async function findExistingStanzaSong(opts: {
  entry: BeatLibraryEntryRow;
  state: BeatMigrationState;
  localBlob?: Blob;
}): Promise<StanzaSong | undefined> {
  const mappedId = opts.state.entryToSongId[opts.entry.id];
  if (mappedId) {
    const mapped = await stanzaDb.songs.get(mappedId);
    if (mapped) return mapped;
  }

  if (opts.entry.sourceType === 'youtube') {
    const ytId = resolveBeatYoutubeVideoId(opts.entry);
    if (ytId) {
      const byYt = await stanzaDb.songs.where('ytId').equals(ytId).first();
      if (byYt) return byYt;
      const legacy = await stanzaDb.songs.get(`yt-${ytId}`);
      if (legacy) return legacy;
    }
  }

  if (opts.entry.sourceType === 'local') {
    const byBeatFp = await stanzaDb.songs
      .filter((song) => song.localMediaFingerprint === opts.entry.fingerprint)
      .first();
    if (byBeatFp) return byBeatFp;

    if (opts.localBlob) {
      const stanzaFp = await stanzaFingerprintForBlob(opts.localBlob, opts.entry.title);
      const byStanzaFp = await stanzaDb.songs
        .filter((song) => song.localMediaFingerprint === stanzaFp)
        .first();
      if (byStanzaFp) return byStanzaFp;
    }

    const legacyPrefix = `local-${opts.entry.fingerprint.slice(0, 16)}`;
    const legacy = await stanzaDb.songs.filter((song) => song.id.startsWith(legacyPrefix)).first();
    if (legacy) return legacy;
  }

  return undefined;
}

async function upgradeLegacyBeatImportedSongs(): Promise<number> {
  const state = readMigrationState();
  const songs = await stanzaDb.songs.toArray();
  let upgraded = 0;
  for (const song of songs) {
    const needsFingerprintFix =
      Boolean(song.localAudioBlob) &&
      (isBeatSha256Fingerprint(song.localMediaFingerprint) || !isStanzaStyleFingerprint(song.localMediaFingerprint));
    const needsMarkerFix = hasLegacyBeatMarkerIds(song.markers);
    const inferredYtId = !song.ytId?.trim() ? inferYoutubeVideoIdFromBeatTitle(song.title) : null;
    const inferredCalibration = inferMetronomeCalibrationFromAnalysisCache(song);
    const beatFp = isBeatSha256Fingerprint(song.localMediaFingerprint)
      ? song.localMediaFingerprint
      : readBeatFingerprintForStanzaSong(song.id);
    const needsBeatFpMapping =
      Boolean(beatFp) && state.fingerprintToSongId?.[beatFp!.trim()] !== song.id;
    const needsMetronomeDefaultFix =
      song.metronomeEnabled === true &&
      !song.metronomeSongCalibration &&
      !song.analysisCache?.beat &&
      song.localAudioBlob != null;

    if (
      !needsFingerprintFix &&
      !needsMarkerFix &&
      !inferredYtId &&
      !inferredCalibration &&
      !needsBeatFpMapping &&
      !needsMetronomeDefaultFix
    ) {
      continue;
    }

    const patch: Partial<StanzaSong> = { updatedAt: Date.now() };
    if (needsMarkerFix && song.markers?.length) {
      patch.markers = ensureMarkerIds(
        song.markers.map((marker) =>
          marker.id?.startsWith('beat-import-') ? { ...marker, id: crypto.randomUUID() } : marker,
        ),
      );
    }
    if (needsFingerprintFix && song.localAudioBlob) {
      if (isBeatSha256Fingerprint(song.localMediaFingerprint)) {
        recordBeatFingerprintMapping(state, song.localMediaFingerprint, song.id);
      }
      patch.localMediaFingerprint = await stanzaFingerprintForBlob(song.localAudioBlob, song.title);
    }
    if (needsBeatFpMapping && beatFp) {
      recordBeatFingerprintMapping(state, beatFp, song.id);
    }
    if (inferredYtId) {
      patch.ytId = inferredYtId;
    }
    if (inferredCalibration) {
      patch.metronomeSongCalibration = inferredCalibration;
    }
    if (needsMetronomeDefaultFix) {
      patch.metronomeEnabled = false;
    }
    await stanzaDb.songs.update(song.id, patch);
    upgraded += 1;
  }
  if (upgraded > 0) {
    writeMigrationState(state);
  }
  return upgraded;
}

async function migrateBeatEntry(
  db: IDBDatabase,
  entry: BeatLibraryEntryRow,
  state: BeatMigrationState,
): Promise<'imported' | 'merged' | 'skipped'> {
  const [fileRecord, analysisRecord, practiceRecord, songSettingsRecord] = await Promise.all([
    idbGet<{ videoId: string; blob: Blob }>(db, 'files', entry.id),
    idbGet<{ videoId: string; bundle: PersistedAnalysisBundle }>(db, 'analysis', entry.id),
    idbGet<{ videoId: string; sections: BeatPracticeDataRow | BeatPracticeSectionRowFromIdb[] }>(
      db,
      'practiceSections',
      entry.id,
    ),
    idbGet<BeatSongSettingsRow>(db, 'songSettings', entry.id),
  ]);

  const legacySettings = readLegacySongSettings(entry.id);
  const settings = songSettingsRecord?.settings ?? legacySettings;
  const practiceSections = Array.isArray(practiceRecord?.sections)
    ? practiceRecord.sections
    : practiceRecord?.sections?.sections ?? [];
  const importedMarkers = practiceSectionsToMarkers(practiceSections);
  const rawBlob = entry.sourceType === 'local' ? fileRecord?.blob : undefined;
  const localAudioBlob = rawBlob ? await ownedBlob(rawBlob) : undefined;
  if (entry.sourceType === 'local' && localAudioBlob && !(await localBlobIsPlayable(localAudioBlob, entry.title))) {
    return 'skipped';
  }
  const localMediaFingerprint =
    localAudioBlob != null ? await stanzaFingerprintForBlob(localAudioBlob, entry.title) : undefined;
  const updatedAt = Math.max(entry.updatedAt ?? 0, Date.now());

  const analysisBundle = analysisRecord?.bundle;
  const normalizedAnalysis = normalizeAnalysisCache(analysisBundle);

  const existing = await findExistingStanzaSong({ entry, state, localBlob: localAudioBlob });
  const resolvedYtId = entry.sourceType === 'youtube' ? resolveBeatYoutubeVideoId(entry) : null;
  if (entry.sourceType === 'youtube' && !resolvedYtId) {
    return 'skipped';
  }

  if (existing) {
    const patch: Partial<StanzaSong> = {
      title: entry.title,
      updatedAt,
      markers: mergeMarkers(existing.markers ?? [], importedMarkers),
      metronomeSongCalibration:
        existing.metronomeSongCalibration ??
        beatSettingsToMetronomeCalibration(settings, analysisBundle),
      metronomeEnabled: settings?.metronomeEnabled ?? existing.metronomeEnabled ?? false,
      metronomeGain:
        settings?.metronomeVolume != null ? settings.metronomeVolume / 100 : existing.metronomeGain,
      metronomeMuted: settings?.metronomeMuted ?? existing.metronomeMuted,
      drumsEnabled: settings?.drumEnabled ?? existing.drumsEnabled,
      drumsGain: settings?.drumVolume != null ? settings.drumVolume / 100 : existing.drumsGain,
      drumsMuted: settings?.drumMuted ?? existing.drumsMuted,
      primaryGain: settings?.audioVolume != null ? settings.audioVolume / 100 : existing.primaryGain,
      primaryMuted: settings?.audioMuted ?? existing.primaryMuted,
      localTransposeSemitones: settings?.transposeSemitones ?? existing.localTransposeSemitones,
      localOriginalKey:
        beatCorrectedKeyToStanzaLocalKey(settings?.correctedDetectedKey) ?? existing.localOriginalKey,
    };
    if (resolvedYtId && !existing.ytId) {
      patch.ytId = resolvedYtId;
    }
    const blobForFingerprint = localAudioBlob ?? existing.localAudioBlob;
    if (blobForFingerprint) {
      patch.localAudioBlob = blobForFingerprint;
      patch.localMediaFingerprint =
        localMediaFingerprint ??
        (await stanzaFingerprintForBlob(blobForFingerprint, entry.title));
    }
    if (normalizedAnalysis && !existing.analysisCache) {
      patch.analysisCache = normalizedAnalysis;
    }
    await stanzaDb.songs.update(existing.id, patch);
    state.entryToSongId[entry.id] = existing.id;
    recordBeatFingerprintMapping(state, entry.fingerprint, existing.id);
    if (!state.migratedEntryIds.includes(entry.id)) {
      state.migratedEntryIds.push(entry.id);
    }
    return 'merged';
  }

  if (entry.sourceType === 'local' && !localAudioBlob) {
    return 'skipped';
  }

  const id = crypto.randomUUID();
  const song: StanzaSong = {
    id,
    ytId: resolvedYtId,
    title: entry.title,
    markers: importedMarkers,
    stats: {},
    updatedAt,
    ...beatFieldsFromEntry({
      entry,
      settings,
      importedMarkers,
      analysisBundle,
      localAudioBlob,
      localMediaFingerprint,
      updatedAt,
    }),
  };

  await stanzaDb.songs.put(song);
  state.entryToSongId[entry.id] = id;
  recordBeatFingerprintMapping(state, entry.fingerprint, id);
  state.migratedEntryIds.push(entry.id);
  return 'imported';
}

/**
 * One-time conversion of Find the Beat library rows into native Stanza songs (Dexie + Drive metadata).
 * After all Beat entries are migrated, the Beat IndexedDB is removed so Stanza is the sole library.
 */
let beatLibraryImportPromise: Promise<BeatLibraryImportResult | null> | null = null;

/** Dedupes concurrent Beat → Stanza migration (mount, `?f=` bootstrap, popstate). */
export function ensureBeatLibraryImported(): Promise<BeatLibraryImportResult | null> {
  if (!beatLibraryImportPromise) {
    beatLibraryImportPromise = importBeatLibraryIfNeeded().finally(() => {
      beatLibraryImportPromise = null;
    });
  }
  return beatLibraryImportPromise;
}

export async function importBeatLibraryIfNeeded(): Promise<BeatLibraryImportResult | null> {
  const state = readMigrationState();
  const upgraded = await upgradeLegacyBeatImportedSongs();

  const db = await openBeatDb();
  if (!db) {
    if (state.beatLibraryPurged && upgraded === 0) return null;
    if (upgraded > 0) {
      writeMigrationState({ ...state, beatLibraryPurged: state.beatLibraryPurged });
      return { imported: 0, merged: 0, skipped: 0, upgraded };
    }
    return null;
  }

  let dbOpen: IDBDatabase | null = db;
  try {
    if (!dbOpen.objectStoreNames.contains('entries')) {
      return upgraded > 0 ? { imported: 0, merged: 0, skipped: 0, upgraded } : null;
    }

    const entries = await idbGetAll<BeatLibraryEntryRow>(dbOpen, 'entries');
    if (entries.length === 0) {
      if (!state.beatLibraryPurged) {
        dbOpen.close();
        dbOpen = null;
        await deleteBeatLibraryDb();
        writeMigrationState({ ...state, beatLibraryPurged: true });
      }
      return upgraded > 0 ? { imported: 0, merged: 0, skipped: 0, upgraded } : null;
    }

    const pending = entries.filter((entry) => !state.migratedEntryIds.includes(entry.id));
    if (pending.length === 0) {
      return upgraded > 0 ? { imported: 0, merged: 0, skipped: 0, upgraded } : null;
    }

    let imported = 0;
    let merged = 0;
    let skipped = 0;
    const nextState: BeatMigrationState = {
      migratedEntryIds: [...state.migratedEntryIds],
      entryToSongId: { ...state.entryToSongId },
      beatLibraryPurged: state.beatLibraryPurged,
    };

    for (const entry of pending) {
      const outcome = await migrateBeatEntry(dbOpen, entry, nextState);
      if (outcome === 'imported') imported += 1;
      else if (outcome === 'merged') merged += 1;
      else skipped += 1;
    }

    const allMigrated =
      entries.every((entry) => nextState.migratedEntryIds.includes(entry.id)) && skipped === 0;
    if (allMigrated && !nextState.beatLibraryPurged) {
      dbOpen.close();
      dbOpen = null;
      await deleteBeatLibraryDb();
      clearLegacyBeatLocalStorage(entries.map((e) => e.id));
      nextState.beatLibraryPurged = true;
    }

    writeMigrationState(nextState);

    if (imported === 0 && merged === 0 && skipped === 0 && upgraded === 0) {
      return null;
    }
    return { imported, merged, skipped, upgraded };
  } finally {
    dbOpen?.close();
  }
}
