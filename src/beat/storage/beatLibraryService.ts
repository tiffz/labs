import { BEAT_ANALYSIS_VERSION } from '../utils/analysisVersion';
import type {
  BeatLibraryEntry,

  MediaKind,
  PersistedAnalysisBundle,
  UserPracticeData,
  UserPracticeSection,
} from '../types/library';
import {
  deleteLibraryEntry,
  getFileBlob,
  getLibraryEntryByFingerprint,
  getLibraryEntryById,
  getPracticeSections,
  listLibraryEntries,
  putAnalysisBundle,
  putFileBlob,
  putLibraryEntry,
  putPracticeSections,
} from './beatLibraryDb';

const STORAGE_LIMIT_MB = 1024;
const STORAGE_LIMIT_BYTES = STORAGE_LIMIT_MB * 1024 * 1024;

function now(): number {
  return Date.now();
}

function createId(): string {
  return `video-${crypto.randomUUID()}`;
}

function titleFromFileName(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, '');
}

export function extractYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.slice(1) || null;
    }
    if (parsed.hostname.includes('youtube.com')) {
      const value = parsed.searchParams.get('v');
      if (value) return value;
      if (parsed.pathname.startsWith('/shorts/')) {
        return parsed.pathname.split('/')[2] ?? null;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function buildYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;
}

function deriveInitialEntry(params: {
  title: string;
  mediaKind: MediaKind;
  sourceType: 'local' | 'youtube';
  fingerprint: string;
  sizeBytes: number;
  sourceUrl?: string;
  youtubeVideoId?: string;
}): BeatLibraryEntry {
  const stamp = now();
  return {
    id: createId(),
    sourceType: params.sourceType,
    mediaKind: params.mediaKind,
    title: params.title,
    createdAt: stamp,
    updatedAt: stamp,
    lastViewedAt: stamp,
    sizeBytes: params.sizeBytes,
    fingerprint: params.fingerprint,
    youtubeVideoId: params.youtubeVideoId,
    sourceUrl: params.sourceUrl,
    capabilities: {
      advancedAnalysis: params.sourceType === 'local',
      manualSections: true,
    },
    analysis: {
      analysisVersion: BEAT_ANALYSIS_VERSION,
      analyzedAt: 0,
      stale: false,
      staleReason: undefined,
    },
  };
}

async function enforceStorageLimit(): Promise<void> {
  const entries = await listLibraryEntries();
  let totalSize = entries.reduce((sum, item) => sum + item.sizeBytes, 0);
  if (totalSize <= STORAGE_LIMIT_BYTES) return;

  const oldestFirst = [...entries].sort((a, b) => a.lastViewedAt - b.lastViewedAt);
  for (const entry of oldestFirst) {
    if (totalSize <= STORAGE_LIMIT_BYTES) break;
    await deleteLibraryEntry(entry.id);
    totalSize -= entry.sizeBytes;
  }
}

export async function upsertLocalVideo(params: {
  file: File;
  fingerprint: string;
  mediaKind: MediaKind;
}): Promise<{ entry: BeatLibraryEntry; duplicateOf?: BeatLibraryEntry }> {
  const existing = await getLibraryEntryByFingerprint(params.fingerprint);
  if (existing) {
    const updated: BeatLibraryEntry = {
      ...existing,
      updatedAt: now(),
      lastViewedAt: now(),
    };
    await putLibraryEntry(updated);
    return { entry: updated, duplicateOf: existing };
  }

  const created = deriveInitialEntry({
    title: titleFromFileName(params.file.name),
    mediaKind: params.mediaKind,
    sourceType: 'local',
    fingerprint: params.fingerprint,
    sizeBytes: params.file.size,
  });
  await putLibraryEntry(created);
  await putFileBlob(created.id, params.file);
  await enforceStorageLimit();
  return { entry: created };
}

async function fetchYouTubeTitle(videoId: string): Promise<string | null> {
  try {
    const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    const data = await response.json();
    return typeof data.title === 'string' ? data.title : null;
  } catch {
    return null;
  }
}

export async function upsertYoutubeVideo(params: {
  url: string;
  videoId: string;
}): Promise<{ entry: BeatLibraryEntry; duplicateOf?: BeatLibraryEntry }> {
  const fingerprint = `youtube:${params.videoId}`;
  const existing = await getLibraryEntryByFingerprint(fingerprint);
  if (existing) {
    const updated: BeatLibraryEntry = {
      ...existing,
      updatedAt: now(),
      lastViewedAt: now(),
      sourceUrl: params.url,
    };
    // Backfill title if it was the placeholder
    if (updated.title === `YouTube ${params.videoId}`) {
      const realTitle = await fetchYouTubeTitle(params.videoId);
      if (realTitle) updated.title = realTitle;
    }
    await putLibraryEntry(updated);
    return { entry: updated, duplicateOf: existing };
  }

  const title = await fetchYouTubeTitle(params.videoId) ?? `YouTube ${params.videoId}`;
  const created = deriveInitialEntry({
    title,
    mediaKind: 'video',
    sourceType: 'youtube',
    fingerprint,
    sizeBytes: 0,
    sourceUrl: params.url,
    youtubeVideoId: params.videoId,
  });
  await putLibraryEntry(created);
  return { entry: created };
}

export async function renameLibraryEntry(videoId: string, newTitle: string): Promise<void> {
  const existing = await getLibraryEntryById(videoId);
  if (!existing) return;
  await putLibraryEntry({
    ...existing,
    title: newTitle.trim() || existing.title,
    updatedAt: now(),
  });
}

export async function markEntryViewed(videoId: string): Promise<void> {
  const existing = await getLibraryEntryById(videoId);
  if (!existing) return;
  await putLibraryEntry({
    ...existing,
    updatedAt: now(),
    lastViewedAt: now(),
  });
}

export async function saveAnalysisBundle(videoId: string, bundle: PersistedAnalysisBundle): Promise<void> {
  const existing = await getLibraryEntryById(videoId);
  if (!existing) return;
  await putAnalysisBundle(videoId, bundle);
  await putLibraryEntry({
    ...existing,
    updatedAt: now(),
    analysis: {
      ...bundle.metadata,
      stale: bundle.metadata.analysisVersion !== BEAT_ANALYSIS_VERSION,
      staleReason:
        bundle.metadata.analysisVersion !== BEAT_ANALYSIS_VERSION
          ? 'Analysis version changed'
          : undefined,
    },
  });
}

export async function loadLibraryEntries(): Promise<BeatLibraryEntry[]> {
  return listLibraryEntries();
}

export async function getLocalFileForEntry(videoId: string): Promise<File | null> {
  const entry = await getLibraryEntryById(videoId);
  if (!entry) return null;
  const blob = await getFileBlob(videoId);
  if (!blob) return null;
  const extension = entry.mediaKind === 'video' ? 'mp4' : 'mp3';
  return new File([blob], `${entry.title}.${extension}`, { type: blob.type || 'application/octet-stream' });
}

export async function saveUserPracticeSections(videoId: string, sections: UserPracticeData | UserPracticeSection[]): Promise<void> {
  await putPracticeSections(videoId, sections);
}

export async function getUserPracticeSections(videoId: string): Promise<UserPracticeData> {
  return getPracticeSections(videoId);
}

export async function markAllStaleIfVersionChanged(): Promise<void> {
  const entries = await listLibraryEntries();
  await Promise.all(
    entries.map(async (entry) => {
      if (!entry.analysis.analyzedAt) return;
      if (entry.analysis.analysisVersion === BEAT_ANALYSIS_VERSION) return;
      await putLibraryEntry({
        ...entry,
        analysis: {
          ...entry.analysis,
          stale: true,
          staleReason: 'Analysis version changed',
        },
        updatedAt: now(),
      });
    })
  );
}

export async function loadStaleReanalysisQueue(): Promise<BeatLibraryEntry[]> {
  const entries = await listLibraryEntries();
  return entries.filter((entry) => entry.sourceType === 'local' && entry.analysis.stale);
}

export async function setEntryStaleState(videoId: string, stale: boolean, reason?: string): Promise<void> {
  const entry = await getLibraryEntryById(videoId);
  if (!entry) return;
  await putLibraryEntry({
    ...entry,
    updatedAt: now(),
    analysis: {
      ...entry.analysis,
      stale,
      staleReason: stale ? reason ?? 'Analysis out of date' : undefined,
    },
  });
}
