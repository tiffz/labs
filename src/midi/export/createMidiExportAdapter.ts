import { buildLabsDownloadFileName } from '../../shared/utils/labsDownloadFileName';
import { buildSingleTrackMidi } from '../../shared/music/midiBuilder';
import { renderMidiEventsToAudioBuffer } from '../../shared/music/midiAudioRender';
import type { ExportSourceAdapter } from '../../shared/music/exportTypes';
import type { MidiState } from '../types';
import { selectExportMidiEvents, selectPerformanceNotes } from '../selectors';
import { msPerBar } from '../selectors';

export function createMidiExportAdapter(getState: () => MidiState): ExportSourceAdapter {
  return {
    id: 'midi-scratchpad',
    title: 'Export loop',
    fileBaseName: buildLabsDownloadFileName(['Midi Scratchpad', 'Loop']),
    stems: [{ id: 'loop', label: 'Loop', defaultSelected: true }],
    defaultFormat: 'midi',
    supportsFormat: (format) => ['midi', 'wav', 'mp3', 'ogg', 'flac'].includes(format),
    estimateDurationSeconds: (loopCount) => {
      const state = getState();
      const bars = state.capturedLoop?.barCount ?? 4;
      const secPerBar = msPerBar(state) / 1000;
      return bars * secPerBar * loopCount;
    },
    renderMidi: async () => {
      const events = selectExportMidiEvents(getState());
      const bpm = getState().transport.bpm * getState().transport.playbackRate;
      return buildSingleTrackMidi(events, bpm);
    },
    renderAudio: async ({ loopCount }) => {
      const state = getState();
      const events = selectExportMidiEvents(state);
      const bpm = state.transport.bpm * state.transport.playbackRate;
      const scaled = events.flatMap((e) =>
        Array.from({ length: loopCount }, (_, i) => {
          const loopTicks = events.reduce(
            (max, ev) => Math.max(max, ev.startTick + ev.durationTicks),
            0,
          );
          return {
            ...e,
            startTick: e.startTick + loopTicks * i,
          };
        }),
      );
      const mix = await renderMidiEventsToAudioBuffer(scaled, { bpm });
      return { mix, stems: { loop: mix } };
    },
  };
}

export function buildExportBlob(getState: () => MidiState): { blob: Blob; filename: string } | null {
  const state = getState();
  if (!state.capturedLoop || selectPerformanceNotes(state).length === 0) return null;
  const events = selectExportMidiEvents(state);
  const bpm = state.transport.bpm * state.transport.playbackRate;
  const bytes = buildSingleTrackMidi(events, bpm);
  const filename = `midi-scratchpad-${state.capturedLoop.id.slice(0, 8)}.mid`;
  return { blob: new Blob([bytes], { type: 'audio/midi' }), filename };
}
