import { getCompensatedDetune } from '../../shared/audio/getCompensatedDetune';
import { decodeStanzaLocalBlobForPlayback } from '../audio/decodeStanzaLocalBlob';
import type { StanzaSong, StanzaStemTrack } from '../db/stanzaDb';
import { isStanzaBlobLikeVideo } from '../db/stanzaLocalAudioImport';
import {
  buildLabsDownloadFileName,
  labsDownloadFileNameWithExtension,
  sanitizeLabsDownloadFileStem,
} from '../../shared/utils/labsDownloadFileName';
import { triggerBlobDownload } from '../../shared/utils/triggerBlobDownload';
import { primaryPlaybackMuted, stanzaSanitizeLinearBusGain, stemPlaybackMuted } from './stanzaPlaybackMute';

export type StanzaAudioExportTrack = {
  id: string;
  label: string;
  blob: Blob;
  gain: number;
  isVideo: boolean;
};

export type StanzaPlaybackTransform = {
  playbackRate: number;
  transposeSemitones: number;
};

const MIME_EXTENSION: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/wav': 'wav',
  'audio/wave': 'wav',
  'audio/x-wav': 'wav',
  'audio/flac': 'flac',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
  'video/mp4': 'm4a',
  'video/webm': 'webm',
  'video/quicktime': 'm4a',
};

const TITLE_EXTENSION = /\.([a-z0-9]{2,5})$/i;

/** Guess download extension for the uploaded bytes (not re-encoded export). */
export function stanzaOriginalDownloadExtension(blob: Blob, title: string): string {
  const mime = (blob.type ?? '').toLowerCase().split(';')[0]?.trim() ?? '';
  if (mime && MIME_EXTENSION[mime]) return MIME_EXTENSION[mime]!;
  const fromTitle = title.trim().match(TITLE_EXTENSION)?.[1]?.toLowerCase();
  if (fromTitle && fromTitle !== 'mov' && fromTitle !== 'mp4') return fromTitle;
  if (fromTitle === 'mp4' || fromTitle === 'mov') return 'm4a';
  return 'audio';
}

export function downloadStanzaOriginalFile(blob: Blob, title: string): void {
  const ext = stanzaOriginalDownloadExtension(blob, title);
  const stem = sanitizeLabsDownloadFileStem(title) || 'Stanza audio';
  triggerBlobDownload(blob, labsDownloadFileNameWithExtension(stem, ext));
}

export function buildStanzaExportTracksFromSong(
  song: StanzaSong,
  mix?: { primaryGain?: number; stems?: StanzaStemTrack[] },
): StanzaAudioExportTrack[] {
  const tracks: StanzaAudioExportTrack[] = [];
  const mainBlob = song.localAudioBlob;
  if (mainBlob) {
    const linear = primaryPlaybackMuted(song)
      ? 0
      : stanzaSanitizeLinearBusGain(mix?.primaryGain ?? song.primaryGain, 1);
    tracks.push({
      id: 'main',
      label: 'Main',
      blob: mainBlob,
      gain: linear,
      isVideo: isStanzaBlobLikeVideo(mainBlob, song.title),
    });
  }
  for (const stem of mix?.stems ?? song.stems ?? []) {
    const linear = stemPlaybackMuted(stem) ? 0 : stanzaSanitizeLinearBusGain(stem.gain, 1);
    tracks.push({
      id: stem.id,
      label: stem.label?.trim() || 'Layer',
      blob: stem.localBlob,
      gain: linear,
      isVideo: isStanzaBlobLikeVideo(stem.localBlob, stem.label),
    });
  }
  return tracks;
}

export async function decodeStanzaTrackBlob(track: StanzaAudioExportTrack): Promise<AudioBuffer> {
  const mediaUrl = URL.createObjectURL(track.blob);
  try {
    return await decodeStanzaLocalBlobForPlayback({
      blob: track.blob,
      title: track.label,
      mediaUrl,
      isVideo: track.isVideo,
    });
  } finally {
    URL.revokeObjectURL(mediaUrl);
  }
}

export async function renderStanzaBufferWithPlaybackTransform(
  buffer: AudioBuffer,
  transform: StanzaPlaybackTransform,
): Promise<AudioBuffer> {
  const playbackRate = Math.max(0.01, transform.playbackRate);
  const detune = getCompensatedDetune(transform.transposeSemitones, playbackRate);
  const frameCount = Math.max(
    1,
    Math.ceil((buffer.duration / playbackRate) * buffer.sampleRate),
  );
  const ctx = new OfflineAudioContext(buffer.numberOfChannels, frameCount, buffer.sampleRate);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = playbackRate;
  source.detune.value = detune;
  source.connect(ctx.destination);
  source.start(0);
  return ctx.startRendering();
}

type MixTrack = { buffer: AudioBuffer; gain: number };

async function mixStanzaDecodedTracks(
  tracks: MixTrack[],
  transform: StanzaPlaybackTransform,
): Promise<AudioBuffer> {
  const audible = tracks.filter((track) => track.gain > 0);
  if (audible.length === 0) {
    throw new Error('No audible layers selected for export.');
  }
  const playbackRate = Math.max(0.01, transform.playbackRate);
  const detune = getCompensatedDetune(transform.transposeSemitones, playbackRate);
  const sampleRate = audible[0]!.buffer.sampleRate;
  const maxDurationSec =
    Math.max(...audible.map((track) => track.buffer.duration)) / playbackRate;
  const frameCount = Math.max(1, Math.ceil(maxDurationSec * sampleRate));
  const ctx = new OfflineAudioContext(2, frameCount, sampleRate);

  for (const track of audible) {
    const source = ctx.createBufferSource();
    source.buffer = track.buffer;
    source.playbackRate.value = playbackRate;
    source.detune.value = detune;
    const gain = ctx.createGain();
    gain.gain.value = track.gain;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(0);
  }

  return ctx.startRendering();
}

export async function renderStanzaExportBuffers(params: {
  tracks: StanzaAudioExportTrack[];
  selectedStemIds: string[];
  transform: StanzaPlaybackTransform;
}): Promise<{ mix: AudioBuffer; stems: Record<string, AudioBuffer> }> {
  const { tracks, selectedStemIds, transform } = params;
  const selected = new Set(selectedStemIds);
  const chosen = tracks.filter((track) => selected.has(track.id));
  if (chosen.length === 0) {
    throw new Error('Select at least one layer to export.');
  }

  const decoded = await Promise.all(
    chosen.map(async (track) => ({
      id: track.id,
      buffer: await decodeStanzaTrackBlob(track),
      gain: track.gain,
    })),
  );

  const stems: Record<string, AudioBuffer> = {};
  for (const row of decoded) {
    stems[row.id] = await renderStanzaBufferWithPlaybackTransform(row.buffer, transform);
  }

  const mix = await mixStanzaDecodedTracks(
    decoded.map((row) => ({ buffer: row.buffer, gain: row.gain })),
    transform,
  );

  return { mix, stems };
}

export function buildStanzaAudioExportFileStem(songTitle: string, suffix?: string): string {
  const parts = [songTitle.trim() || 'Untitled', 'Audio'];
  if (suffix?.trim()) parts.push(suffix.trim());
  return buildLabsDownloadFileName(parts);
}

export function stanzaPlaybackTransformIsEdited(transform: StanzaPlaybackTransform): boolean {
  return (
    Math.abs(transform.playbackRate - 1) > 0.0001 || Math.abs(transform.transposeSemitones) > 0.0001
  );
}
