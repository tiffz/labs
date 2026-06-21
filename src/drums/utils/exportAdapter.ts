import { buildLabsDownloadFileName } from '../../shared/utils/labsDownloadFileName';
import type { ParsedRhythm } from '../types';
import type { PlaybackSettings } from '../types/settings';
import type { ExportSourceAdapter } from '../../shared/music/exportTypes';
import { calculateRhythmDuration, renderRhythmAudio } from './audioExport';
import { buildDrumMidiEventsFromParsedRhythm } from '../../shared/music/drumRhythmMidiEvents';
import { buildSingleTrackMidi } from '../../shared/music/midiBuilder';

import { recognizeRhythm } from './rhythmRecognition';

interface CreateDrumsExportAdapterOptions {
  rhythm: ParsedRhythm;
  bpm: number;
  playbackSettings: PlaybackSettings;
  metronomeEnabled: boolean;
  notation: string;
}

export function buildDrumsAudioDownloadFileName(notation: string): string {
  const rhythmMatch = recognizeRhythm(notation);
  const rhythmLabel = rhythmMatch?.rhythm.name ?? 'Custom Rhythm';
  return buildLabsDownloadFileName([rhythmLabel, 'Darbuka Rhythm']);
}

export function createDrumsExportAdapter({
  rhythm,
  bpm,
  playbackSettings,
  metronomeEnabled,
  notation,
}: CreateDrumsExportAdapterOptions): ExportSourceAdapter {
  return {
    id: 'drums',
    title: 'Export Rhythm',
    fileBaseName: buildDrumsAudioDownloadFileName(notation),
    defaultFormat: 'wav',
    stems: [{ id: 'drums', label: 'Drums', defaultSelected: true }],
    supportsFormat: (format) => ['wav', 'mp3', 'ogg', 'flac', 'midi'].includes(format),
    estimateDurationSeconds: (loopCount) => {
      if (!rhythm.isValid || rhythm.measures.length === 0) return 0;
      return calculateRhythmDuration(rhythm, bpm) * loopCount;
    },
    renderAudio: async ({ loopCount }) => {
      const mix = await renderRhythmAudio(
        rhythm,
        bpm,
        loopCount,
        playbackSettings,
        metronomeEnabled
      );
      return { mix };
    },
    renderMidi: async ({ loopCount }) => {
      const events = buildDrumMidiEventsFromParsedRhythm(rhythm, loopCount);
      return buildSingleTrackMidi(events, bpm);
    },
  };
}
