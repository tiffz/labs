import type { ParsedRhythm } from '../types';
import type { PlaybackSettings } from '../types/settings';
import type { ExportSourceAdapter } from '../../shared/music/exportTypes';
import { calculateRhythmDuration, renderRhythmAudio } from './audioExport';
import { buildSingleTrackMidi, type MidiNoteEvent } from '../../shared/music/midiBuilder';

interface CreateDrumsExportAdapterOptions {
  rhythm: ParsedRhythm;
  bpm: number;
  playbackSettings: PlaybackSettings;
  metronomeEnabled: boolean;
  notation: string;
}

export function createDrumsExportAdapter({
  rhythm,
  bpm,
  playbackSettings,
  metronomeEnabled,
  notation,
}: CreateDrumsExportAdapterOptions): ExportSourceAdapter {
  const cleanNotation = notation.replace(/[\s\n]/g, '').slice(0, 48) || 'drums-rhythm';
  return {
    id: 'drums',
    title: 'Export Rhythm',
    fileBaseName: cleanNotation,
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
      const ticksPerSixteenth = 120;
      const drumPitchBySound: Record<string, number> = {
        dum: 36,
        tak: 38,
        ka: 42,
        slap: 39,
      };
      const events: MidiNoteEvent[] = [];
      let loopTickOffset = 0;
      const singleLoopTicks = rhythm.measures.reduce((total, measure) => total + measure.notes.reduce(
        (sum, note) => sum + Math.max(ticksPerSixteenth, Math.round(note.durationInSixteenths * ticksPerSixteenth)),
        0
      ), 0);

      for (let loop = 0; loop < loopCount; loop += 1) {
        let tickCursor = loopTickOffset;
        rhythm.measures.forEach((measure) => {
          measure.notes.forEach((note) => {
            const pitch = drumPitchBySound[note.sound];
            const durationTicks = Math.max(
              ticksPerSixteenth,
              Math.round(note.durationInSixteenths * ticksPerSixteenth)
            );
            if (pitch !== undefined) {
              events.push({
                midi: pitch,
                startTick: tickCursor,
                durationTicks: Math.max(30, Math.round(durationTicks * 0.8)),
                velocity: 100,
                channel: 9,
              });
            }
            tickCursor += durationTicks;
          });
        });
        loopTickOffset += singleLoopTicks;
      }
      return buildSingleTrackMidi(events, bpm);
    },
  };
}
