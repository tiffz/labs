import type { PianoScore } from '../types';
import type { ExportSourceAdapter } from '../../shared/music/exportTypes';
import { durationToBeats } from '../types';
import { buildScoreMidiBytes, buildScoreMidiEventMap } from './midiExport';
import { renderMidiEventsToAudioBuffer } from '../../shared/music/midiAudioRender';

export function createPianoExportAdapter(score: PianoScore): ExportSourceAdapter {
  const stemDefs = score.parts.map((part) => ({
    id: part.id,
    label: part.name || part.id,
    defaultSelected: true,
  }));
  const fileBaseName = (score.title || 'piano-score')
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return {
    id: 'piano',
    title: 'Export Piano Score',
    fileBaseName: fileBaseName || 'piano-score',
    stems: stemDefs,
    defaultFormat: 'wav',
    supportsFormat: (format) => ['midi', 'wav', 'mp3', 'ogg', 'flac'].includes(format),
    estimateDurationSeconds: (loopCount, selectedStemIds) => {
      const selected = selectedStemIds.length > 0 ? new Set(selectedStemIds) : null;
      const maxBeats = score.parts.reduce((max, part) => {
        if (selected && !selected.has(part.id)) return max;
        const beats = part.measures.reduce((sum, measure) => sum + measure.notes.reduce(
          (acc, note) => acc + durationToBeats(note.duration, note.dotted),
          0
        ), 0);
        return Math.max(max, beats);
      }, 0);
      return ((maxBeats * loopCount) / Math.max(1, score.tempo)) * 60;
    },
    renderMidi: async ({ loopCount, selectedStemIds }) => {
      return buildScoreMidiBytes(score, loopCount, selectedStemIds);
    },
    renderAudio: async ({ loopCount, selectedStemIds }) => {
      const eventMap = buildScoreMidiEventMap(score, loopCount, selectedStemIds);
      const renderedStems: Record<string, AudioBuffer> = {};
      for (const [stemId, events] of eventMap.entries()) {
         
        renderedStems[stemId] = await renderMidiEventsToAudioBuffer(events, { bpm: score.tempo });
      }
      const mixEvents = Array.from(eventMap.values()).flat();
      const mix = await renderMidiEventsToAudioBuffer(mixEvents, { bpm: score.tempo });
      return {
        mix,
        stems: renderedStems,
      };
    },
  };
}
