import { buildDrumMidiEventsFromParsedRhythm } from '../../shared/music/drumRhythmMidiEvents';
import { buildSingleTrackMidi, type MidiNoteEvent } from '../../shared/music/midiBuilder';
import type { ExportSourceAdapter } from '../../shared/music/exportTypes';
import { renderMidiEventsToAudioBuffer } from '../../shared/music/midiAudioRender';
import type { ParsedRhythm } from '../../shared/rhythm/types';
import type { ChordStyleId } from '../../shared/music/chordStyleOptions';
import { generateVoicing } from '../../shared/music/chordVoicing';
import { chordSymbolToTheoryChord } from '../../shared/music/chordSymbolToTheoryChord';
import type { TimeSignature } from '../../shared/music/chordTypes';
import type { SongKey } from '../../shared/music/songKeyFormat';
import { getChordHitsForStyle } from '../../shared/music/chordStyleHits';

interface CreateWordsExportAdapterOptions {
  parsedRhythm: ParsedRhythm;
  bpm: number;
  songKey: SongKey;
  timeSignature: TimeSignature;
  chordLabelsByMeasure: Map<number, string>;
  chordStyleByMeasure: Map<number, ChordStyleId>;
}

function buildPianoMidiEvents(
  parsedRhythm: ParsedRhythm,
  chordLabelsByMeasure: Map<number, string>,
  chordStyleByMeasure: Map<number, ChordStyleId>,
  songKey: SongKey,
  timeSignature: TimeSignature,
  loopCount: number
): MidiNoteEvent[] {
  const ticksPerQuarter = 480;
  const singleLoopTicks = parsedRhythm.measures.reduce((sum, measure) => sum + Math.max(
    ticksPerQuarter,
    measure.notes.reduce((acc, note) => acc + note.durationInSixteenths * 120, 0)
  ), 0);
  const events: MidiNoteEvent[] = [];

  for (let loopIndex = 0; loopIndex < loopCount; loopIndex += 1) {
    let tickCursor = loopIndex * singleLoopTicks;
    parsedRhythm.measures.forEach((measure, measureIndex) => {
      const measureTicks = Math.max(
        ticksPerQuarter,
        measure.notes.reduce((sum, note) => sum + note.durationInSixteenths * 120, 0)
      );
      const chordToken = chordLabelsByMeasure.get(measureIndex) ?? songKey;
      const chord = chordSymbolToTheoryChord(chordToken);
      if (chord) {
          const treble = generateVoicing(
            chord,
            { useInversions: false, useOpenVoicings: true, randomizeOctaves: false },
            'treble'
          );
          const bass = generateVoicing(
            chord,
            { useInversions: false, useOpenVoicings: false, randomizeOctaves: false },
            'bass'
          );
          const sectionStyle = chordStyleByMeasure.get(measureIndex) ?? 'simple';
          const patternHits = getChordHitsForStyle(sectionStyle, timeSignature);
          const hitEvents = patternHits.length > 0 ? patternHits : [{
            offsetBeats: 0,
            source: 'both' as const,
            durationBeats: timeSignature.numerator * (4 / timeSignature.denominator),
          }];
          hitEvents.forEach((hit) => {
            const hitPitches =
              hit.source === 'bass'
                ? bass.slice(0, 1)
                : hit.source === 'treble'
                  ? treble.slice(0, 4)
                  : [...new Set([...bass.slice(0, 1), ...treble.slice(0, 4)])];
            const startTick = tickCursor + Math.round(hit.offsetBeats * ticksPerQuarter);
            const durationTicks = Math.max(60, Math.round(hit.durationBeats * ticksPerQuarter * 0.92));
            [...new Set(hitPitches)].forEach((midi) => {
              events.push({
                midi,
                startTick,
                durationTicks,
                velocity: 84,
                channel: 0,
              });
            });
          });
      }
      tickCursor += measureTicks;
    });
  }
  return events;
}

export function createWordsExportAdapter({
  parsedRhythm,
  bpm,
  songKey,
  timeSignature,
  chordLabelsByMeasure,
  chordStyleByMeasure,
}: CreateWordsExportAdapterOptions): ExportSourceAdapter {
  return {
    id: 'words',
    title: 'Export Song',
    fileBaseName: 'words-song',
    stems: [
      { id: 'piano', label: 'Piano', defaultSelected: true },
      { id: 'drums', label: 'Drums', defaultSelected: true },
    ],
    defaultFormat: 'wav',
    supportsFormat: (format) => ['midi', 'wav', 'mp3', 'ogg', 'flac'].includes(format),
    estimateDurationSeconds: (loopCount) => {
      const msPerSixteenth = (60000 / Math.max(1, bpm)) / 4;
      const singleLoop = parsedRhythm.measures.reduce((sum, measure) => sum + measure.notes.reduce(
        (acc, note) => acc + note.durationInSixteenths * msPerSixteenth,
        0
      ), 0);
      return (singleLoop * loopCount) / 1000;
    },
    renderMidi: async ({ loopCount, selectedStemIds }) => {
      const stems = selectedStemIds.length > 0 ? new Set(selectedStemIds) : new Set(['piano', 'drums']);
      const events: MidiNoteEvent[] = [];
      if (stems.has('drums')) {
        events.push(...buildDrumMidiEventsFromParsedRhythm(parsedRhythm, loopCount));
      }
      if (stems.has('piano')) {
        events.push(...buildPianoMidiEvents(
          parsedRhythm,
          chordLabelsByMeasure,
          chordStyleByMeasure,
          songKey,
          timeSignature,
          loopCount
        ));
      }
      return buildSingleTrackMidi(events, bpm);
    },
    renderAudio: async ({ loopCount, selectedStemIds }) => {
      const selected = selectedStemIds.length > 0 ? new Set(selectedStemIds) : new Set(['piano', 'drums']);
      const stemEvents: Record<string, MidiNoteEvent[]> = {};
      if (selected.has('drums')) {
        stemEvents.drums = buildDrumMidiEventsFromParsedRhythm(parsedRhythm, loopCount);
      }
      if (selected.has('piano')) {
        stemEvents.piano = buildPianoMidiEvents(
          parsedRhythm,
          chordLabelsByMeasure,
          chordStyleByMeasure,
          songKey,
          timeSignature,
          loopCount
        );
      }
      const renderedStems: Record<string, AudioBuffer> = {};
      for (const [stemId, events] of Object.entries(stemEvents)) {
         
        renderedStems[stemId] = await renderMidiEventsToAudioBuffer(events, { bpm });
      }
      const mixEvents = Object.values(stemEvents).flat();
      const mix = await renderMidiEventsToAudioBuffer(mixEvents, { bpm });
      return {
        mix,
        stems: renderedStems,
      };
    },
  };
}
