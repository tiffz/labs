import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePlayback } from '../drums/hooks/usePlayback';
import { parseRhythm } from '../drums/utils/rhythmParser';
import { DEFAULT_SETTINGS } from '../drums/types/settings';
import type { PlaybackSettings } from '../drums/types/settings';
import type { TimeSignature } from '../drums/types';
import {
  generateWordRhythm,
  DEFAULT_WORD_RHYTHM_SETTINGS,
  type SyllableHit,
  type WordRhythmResult,
  type WordRhythmAdvancedSettings,
} from '../drums/wordRhythm/prosodyEngine';
import VexLyricScore from './components/VexLyricScore';
import DrumNotationMini from '../shared/notation/DrumNotationMini';
import { SOUND_OPTIONS, type SoundType } from '../chords/types/soundOptions';
import {
  CHORD_STYLE_OPTIONS,
  type ChordStyleId,
} from '../piano/data/chordExercises';
import { generateVoicing } from '../chords/utils/chordVoicing';
import type { Chord as TheoryChord, ChordQuality, Key } from '../chords/types';
import { ALL_KEYS } from '../chords/utils/randomization';
import { midiToFrequency } from '../piano/types';
import {
  PianoSynthesizer,
  SampledPiano,
  SimpleSynthesizer,
  type Instrument,
  type WaveformType,
} from '../shared/playback/instruments';
import { getRandomPopularChordProgressionInKey } from '../shared/music/randomChordProgression';
import { parseProgressionText } from '../shared/music/chordProgressionText';
import {
  buildSectionChordSymbols,
  computeCompletionPadMeasures,
} from '../shared/music/chordProgressionCompletion';
import {
  createDefaultSection,
  findPreviousChorus,
  type SongSection,
  type SongSectionType,
} from '../shared/music/songSections';
import {
  subscribeToPopState,
  syncUrlWithHistory,
  type UrlRoutingHistoryState,
} from '../shared/utils/urlRouting';
import { parseOptionalNumberParam } from '../shared/utils/urlParams';

const DEFAULT_LYRICS = `Sunrise on the shoreline
Ocean wind through palm trees`;

const DEFAULT_TIME_SIGNATURE: TimeSignature = {
  numerator: 4,
  denominator: 4,
};

const TIME_SIGNATURE_OPTIONS: Array<
  Pick<TimeSignature, 'numerator' | 'denominator'>
> = [{ numerator: 4, denominator: 4 }];

const TEMPLATE_PRESETS = [
  { label: 'Rock', notation: 'D---T---D-D-T---' },
  { label: 'Maqsum', notation: 'D-T-__T-D---T---' },
  { label: 'Baladi', notation: 'D-D-__T-D---T---' },
  { label: 'Saidi', notation: 'D-T-__D-D---T---' },
  { label: 'Malfuf', notation: 'D--T--T-D--T--T-' },
  { label: 'Ayoub', notation: 'D--KD-T-D--KD-T-' },
];

const APP_DEFAULT_GENERATION_SETTINGS: WordRhythmAdvancedSettings = {
  ...DEFAULT_WORD_RHYTHM_SETTINGS,
  templateBias: 100,
  templateNotation: TEMPLATE_PRESETS[0].notation,
};
const DEFAULT_WORD_RESULT = generateWordRhythm(DEFAULT_LYRICS, {
  strictDictionaryMode: false,
  timeSignature: DEFAULT_TIME_SIGNATURE,
  rhythmVariationSeed: 0,
  soundVariationSeed: 0,
  generationSettings: APP_DEFAULT_GENERATION_SETTINGS,
});
const DEFAULT_SONG_KEY: Key = 'C';
const DEFAULT_SECTIONS: SongSection[] = [
  {
    ...createDefaultSection('verse', APP_DEFAULT_GENERATION_SETTINGS),
    id: 'default-verse-1',
    lyrics: DEFAULT_LYRICS,
    chordProgressionInput: 'G-C-Am-F',
    chordStyleId: 'simple',
    templateNotation: APP_DEFAULT_GENERATION_SETTINGS.templateNotation ?? '',
    templateBias: APP_DEFAULT_GENERATION_SETTINGS.templateBias,
  },
  {
    ...createDefaultSection('chorus', APP_DEFAULT_GENERATION_SETTINGS),
    id: 'default-chorus-1',
    lyrics: `Find the fire burning by the sea
So you can come and dance with me`,
    chordProgressionInput: 'G-C-Am-F',
    chordStyleId: 'one-per-beat',
    templateNotation: 'D--KD-T-D--KD-T-',
    templateBias: APP_DEFAULT_GENERATION_SETTINGS.templateBias,
  },
];

const CHORD_PARSE_REGEX = /^([A-G](?:#|b)?)(maj7|m7|m|7|sus2|sus4|dim|aug)?$/i;
const URL_PARAM_LYRICS = 'l';
const URL_PARAM_PATTERN = 'pat';
const URL_PARAM_BPM = 'bpm';
const URL_PARAM_TIME = 'time';
const URL_PARAM_METRONOME = 'met';
const URL_PARAM_AUTOFOLLOW = 'af';
const URL_PARAM_GENERATION_SETTINGS = 'gs';
const URL_PARAM_DRUMS_VOLUME = 'dvol';
const URL_PARAM_CHORD_SOUND = 'csnd';
const URL_PARAM_CHORD_VOLUME = 'cvol';
const URL_PARAM_CHORD_KEY = 'ckey';
const URL_PARAM_SECTIONS = 'song';
const URL_HISTORY_DEBOUNCE_MS = 900;
const URL_HISTORY_REPLACE_DEBOUNCE_PARAMS = new Set<string>([
  URL_PARAM_SECTIONS,
  URL_PARAM_BPM,
  URL_PARAM_GENERATION_SETTINGS,
  URL_PARAM_DRUMS_VOLUME,
  URL_PARAM_CHORD_VOLUME,
]);
const MAX_UNDO_HISTORY = 120;

function encodeBase64UrlUtf8(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function decodeBase64UrlUtf8(input: string): string | null {
  try {
    const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
    const padLength = (4 - (normalized.length % 4)) % 4;
    const padded = `${normalized}${'='.repeat(padLength)}`;
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

function cloneSectionsSnapshot(sections: SongSection[]): SongSection[] {
  return sections.map((section) => ({ ...section }));
}

const GENERATION_SETTING_HELP = {
  adventurousness:
    'Higher values allow bolder rhythmic shapes and less predictable note lengths.',
  dottedBias:
    'Increases chances of dotted-like durations and swung-feel groupings.',
  sixteenthBias:
    'Increases fast subdivisions (16th-note motion), especially for energetic phrases.',
  tieCrossingBias:
    'Encourages notes to tie across barlines for longer flowing phrasing.',
  alignWordStartsToBeats:
    'Pushes word onsets toward beat boundaries for cleaner groove anchors.',
  alignStressToMajorBeats:
    'Aligns stressed syllables with stronger beats when musically possible.',
  motifVariation:
    'Controls how much repeated rhythmic motifs are ornamented across lines.',
  midMeasureRestBias:
    'Adds occasional rests within a measure to create breathing pockets.',
  avoidIntraWordRests:
    'Biases against inserting rests inside a single multi-syllable word.',
  lineBreakGapBias:
    'Biases toward leaving a small rest between lyric lines when spacing allows.',
  templateBias: 'How strongly generation follows the selected template groove.',
} satisfies Record<string, string>;

const SettingHelpLabel: React.FC<{ text: string; help: string }> = ({
  text,
  help,
}) => (
  <span className="words-setting-label">
    {text}
    <button
      className="words-setting-help"
      type="button"
      tabIndex={-1}
      aria-label={`${text} help`}
      data-tooltip={help}
    >
      <span className="material-symbols-outlined" aria-hidden="true">
        info
      </span>
    </button>
  </span>
);

interface ChordHit {
  offsetBeats: number;
  source: 'bass' | 'treble' | 'both';
  durationBeats: number;
}

function getChordHitsForStyle(
  styleId: ChordStyleId,
  timeSignature: TimeSignature
): ChordHit[] {
  const beatsPerMeasure =
    timeSignature.numerator * (4 / timeSignature.denominator);
  const quarterBeats = Math.max(0.25, 4 / timeSignature.denominator);
  const beatStarts = Array.from(
    { length: Math.max(1, timeSignature.numerator) },
    (_, index) => index * quarterBeats
  );
  const clamp = (hits: ChordHit[]) =>
    hits.filter(
      (hit) => hit.offsetBeats >= 0 && hit.offsetBeats < beatsPerMeasure
    );

  switch (styleId) {
    case 'one-per-beat':
      return clamp(
        beatStarts.map((offsetBeats) => ({
          offsetBeats,
          source: 'both',
          durationBeats: Math.min(quarterBeats, beatsPerMeasure - offsetBeats),
        }))
      );
    case 'oom-pahs':
      return clamp(
        beatStarts.map((offsetBeats, index) => ({
          offsetBeats,
          source: index % 2 === 0 ? 'bass' : 'treble',
          durationBeats: Math.min(quarterBeats, beatsPerMeasure - offsetBeats),
        }))
      );
    case 'waltz':
      return clamp([
        { offsetBeats: 0, source: 'bass', durationBeats: quarterBeats },
        {
          offsetBeats: quarterBeats,
          source: 'treble',
          durationBeats: quarterBeats,
        },
        {
          offsetBeats: quarterBeats * 2,
          source: 'treble',
          durationBeats: quarterBeats,
        },
      ]);
    case 'pop-rock-ballad':
      return clamp([
        { offsetBeats: 0, source: 'bass', durationBeats: 1.5 },
        { offsetBeats: 1.5, source: 'treble', durationBeats: 0.5 },
        { offsetBeats: 2, source: 'bass', durationBeats: 1.5 },
        { offsetBeats: 3.5, source: 'treble', durationBeats: 0.5 },
      ]);
    case 'pop-rock-uptempo':
      return clamp([
        { offsetBeats: 0, source: 'bass', durationBeats: 1 },
        { offsetBeats: 1, source: 'treble', durationBeats: 1 },
        { offsetBeats: 2, source: 'bass', durationBeats: 1 },
        { offsetBeats: 3, source: 'treble', durationBeats: 1 },
      ]);
    case 'tresillo':
      return clamp([
        { offsetBeats: 0, source: 'both', durationBeats: 1.5 },
        { offsetBeats: 1.5, source: 'both', durationBeats: 1.5 },
        { offsetBeats: 3, source: 'both', durationBeats: 1 },
      ]);
    case 'jazzy':
      return clamp([
        { offsetBeats: 0, source: 'bass', durationBeats: 1 },
        { offsetBeats: 0.5, source: 'treble', durationBeats: 0.5 },
        { offsetBeats: 1, source: 'bass', durationBeats: 1 },
        { offsetBeats: 2, source: 'bass', durationBeats: 1 },
        { offsetBeats: 3, source: 'bass', durationBeats: 1 },
      ]);
    case 'simple':
    default:
      return [
        { offsetBeats: 0, source: 'both', durationBeats: beatsPerMeasure },
      ];
  }
}

const App: React.FC = () => {
  const [sections, setSections] = useState<SongSection[]>(DEFAULT_SECTIONS);
  const [generated, setGenerated] = useState<WordRhythmResult>(
    () => DEFAULT_WORD_RESULT
  );

  const [notation, setNotation] = useState<string>(
    DEFAULT_WORD_RESULT.notation
  );
  const [timeSignature, setTimeSignature] = useState<TimeSignature>(
    DEFAULT_TIME_SIGNATURE
  );
  const [bpm, setBpm] = useState<number>(100);
  const [bpmInput, setBpmInput] = useState<string>('100');
  const [debouncedBpm, setDebouncedBpm] = useState<number>(100);
  const [metronomeEnabled, setMetronomeEnabled] = useState<boolean>(true);
  const [autoFollowPlayback, setAutoFollowPlayback] = useState<boolean>(true);
  const [generationMenuOpen, setGenerationMenuOpen] = useState<boolean>(false);
  const [soundMenuOpen, setSoundMenuOpen] = useState<boolean>(false);
  const [songKey, setSongKey] = useState<Key>(DEFAULT_SONG_KEY);
  const [drumsVolume, setDrumsVolume] = useState<number>(100);
  const [chordSoundType, setChordSoundType] = useState<SoundType>('piano');
  const [chordVolume, setChordVolume] = useState<number>(58);
  const [sampledPianoLoad, setSampledPianoLoad] = useState<{
    loading: boolean;
    loaded: number;
    total: number;
    ready: boolean;
  }>({ loading: false, loaded: 0, total: 0, ready: false });
  const [playbackSettings, setPlaybackSettings] =
    useState<PlaybackSettings>(DEFAULT_SETTINGS);
  const [generationSettings, setGenerationSettings] =
    useState<WordRhythmAdvancedSettings>(APP_DEFAULT_GENERATION_SETTINGS);
  const [isStickyControlsStuck, setIsStickyControlsStuck] =
    useState<boolean>(false);
  const [openSectionSettingsId, setOpenSectionSettingsId] = useState<
    string | null
  >(null);
  const [exportMenuOpen, setExportMenuOpen] = useState<boolean>(false);
  const [scoreZoom, setScoreZoom] = useState<number>(1);
  const [playbackSelectionRange, setPlaybackSelectionRange] = useState<{
    startTick: number;
    endTick: number;
  } | null>(null);
  const [activeSectionLoopId, setActiveSectionLoopId] = useState<string | null>(
    null
  );
  const [pendingPlaybackStart, setPendingPlaybackStart] =
    useState<boolean>(false);
  const [sectionSettingsPosition, setSectionSettingsPosition] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const stickyControlsRef = useRef<HTMLElement | null>(null);
  const generationMenuRef = useRef<HTMLDivElement | null>(null);
  const generationButtonRef = useRef<HTMLButtonElement | null>(null);
  const soundMenuRef = useRef<HTMLDivElement | null>(null);
  const soundButtonRef = useRef<HTMLButtonElement | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const exportButtonRef = useRef<HTMLButtonElement | null>(null);
  const sectionSettingsAnchorRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const sectionSettingsMenuRef = useRef<HTMLDivElement | null>(null);
  const sectionsColumnRef = useRef<HTMLElement | null>(null);
  const notationScrollRef = useRef<HTMLElement | null>(null);
  const notationSectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const chordAudioContextRef = useRef<AudioContext | null>(null);
  const chordSampledPianoRef = useRef<SampledPiano | null>(null);
  const chordInstrumentRef = useRef<Instrument | null>(null);
  const chordInstrumentTypeRef = useRef<SoundType | null>(null);
  const lastChordMeasureRef = useRef<number | null>(null);
  const hasHydratedUrlStateRef = useRef<boolean>(false);
  const urlHistoryStateRef = useRef<UrlRoutingHistoryState>({ lastPushTime: 0 });
  const undoHistoryRef = useRef<Array<{ sections: SongSection[]; songKey: Key }>>(
    []
  );
  const songKeyRef = useRef<Key>(songKey);

  const parsedRhythm = useMemo(
    () => parseRhythm(notation, timeSignature),
    [notation, timeSignature]
  );
  const hitMap = useMemo(() => {
    const map = new Map<string, SyllableHit>();
    let hitIndex = 0;
    parsedRhythm.measures.forEach((measure, measureIndex) => {
      measure.notes.forEach((note, noteIndex) => {
        if (note.sound === 'rest' || note.sound === 'simile') return;
        const hit = generated.hits[hitIndex];
        if (hit) {
          map.set(`${measureIndex}-${noteIndex}`, hit);
        }
        hitIndex += 1;
      });
    });
    return map;
  }, [generated.hits, parsedRhythm]);
  const darbukaEditUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set('rhythm', notation);
    params.set(
      'time',
      `${timeSignature.numerator}/${timeSignature.denominator}`
    );
    params.set('bpm', String(bpm));
    if (metronomeEnabled) params.set('metronome', 'true');
    return `/drums/?${params.toString()}`;
  }, [notation, timeSignature, bpm, metronomeEnabled]);
  const getDarbukaTemplateEditUrl = (templateNotation: string) => {
    const params = new URLSearchParams();
    params.set('rhythm', templateNotation);
    params.set(
      'time',
      `${timeSignature.numerator}/${timeSignature.denominator}`
    );
    params.set('bpm', String(bpm));
    if (metronomeEnabled) params.set('metronome', 'true');
    return `/drums/?${params.toString()}`;
  };
  const sectionTemplatePreviewById = useMemo(() => {
    const previews = new Map<string, ReturnType<typeof parseRhythm>>();
    sections.forEach((section) => {
      previews.set(
        section.id,
        parseRhythm(
          section.templateNotation?.trim() ||
            APP_DEFAULT_GENERATION_SETTINGS.templateNotation ||
            TEMPLATE_PRESETS[0].notation,
          timeSignature
        )
      );
    });
    return previews;
  }, [sections, timeSignature]);
  useEffect(() => {
    songKeyRef.current = songKey;
  }, [songKey]);
  const pushUndoSnapshot = useCallback(
    (sectionsSnapshot: SongSection[], songKeySnapshot: Key) => {
      undoHistoryRef.current.push({
        sections: cloneSectionsSnapshot(sectionsSnapshot),
        songKey: songKeySnapshot,
      });
      if (undoHistoryRef.current.length > MAX_UNDO_HISTORY) {
        undoHistoryRef.current.shift();
      }
    },
    []
  );
  const applySectionsChange = useCallback(
    (transform: (previous: SongSection[]) => SongSection[]) => {
      setSections((previous) => {
        const next = transform(previous);
        if (next === previous) return previous;
        pushUndoSnapshot(previous, songKeyRef.current);
        return next;
      });
    },
    [pushUndoSnapshot]
  );
  const effectiveSections = useMemo(() => {
    const output: Array<
      SongSection & {
        effectiveLyrics: string;
        effectiveTemplateNotation: string;
        effectiveTemplateBias: number;
      }
    > = [];
    const linkedChorusLyricsSource = sections.find(
      (section) => section.type === 'chorus' && section.linkedToPreviousChorusLyrics
    );
    const linkedChorusTemplateSource = sections.find(
      (section) => section.type === 'chorus' && section.linkedToPreviousChorusTemplate
    );
    sections.forEach((section) => {
      const fallbackLyrics = section.lyrics || '';
      const inheritedLyrics =
        section.type === 'chorus' &&
        section.linkedToPreviousChorusLyrics &&
        linkedChorusLyricsSource
          ? linkedChorusLyricsSource.lyrics
          : fallbackLyrics;
      const inheritedTemplateNotation =
        section.type === 'chorus' &&
        section.linkedToPreviousChorusTemplate &&
        linkedChorusTemplateSource
          ? linkedChorusTemplateSource.templateNotation
          : section.templateNotation;
      const inheritedTemplateBias =
        section.type === 'chorus' &&
        section.linkedToPreviousChorusTemplate &&
        linkedChorusTemplateSource
          ? linkedChorusTemplateSource.templateBias
          : section.templateBias;
      output.push({
        ...section,
        effectiveLyrics: inheritedLyrics,
        effectiveTemplateNotation:
          inheritedTemplateNotation ||
          APP_DEFAULT_GENERATION_SETTINGS.templateNotation ||
          '',
        effectiveTemplateBias: inheritedTemplateBias,
      });
    });
    return output;
  }, [sections]);

  const sectionProgressions = useMemo(
    () =>
      effectiveSections.map((section) => {
        const parsed = parseProgressionText(
          section.chordProgressionInput,
          songKey
        );
        if (parsed.format !== 'empty' && parsed.tokens.length < 2) {
          return { ...parsed, isValid: false, format: 'invalid' as const };
        }
        return parsed;
      }),
    [effectiveSections, songKey]
  );
  const sixteenthsPerMeasure = Math.max(
    1,
    Math.round((timeSignature.numerator * 16) / timeSignature.denominator)
  );
  const fullMeasureRestNotation = useMemo(
    () => '_'.repeat(sixteenthsPerMeasure),
    [sixteenthsPerMeasure]
  );
  const sectionRenderPlans = useMemo(() => {
    let startMeasureCursor = 0;
    return effectiveSections.map((section, sectionIndex) => {
      const result = generateWordRhythm(section.effectiveLyrics, {
        strictDictionaryMode: false,
        timeSignature,
        rhythmVariationSeed: section.rhythmVariationSeed,
        soundVariationSeed: section.soundVariationSeed,
        generationSettings: {
          ...generationSettings,
          templateNotation: section.effectiveTemplateNotation,
          templateBias: section.effectiveTemplateBias,
        },
      });
      const parsed = parseRhythm(result.notation, timeSignature);
      const baseMeasureCount = parsed.measures.length;
      const progression = sectionProgressions[sectionIndex];
      const progressionLength =
        progression?.isValid && progression.chordSymbols.length > 0
          ? progression.chordSymbols.length
          : 0;
      // Always complete the local progression cycle before moving on so
      // sections do not end in the middle of a chord loop.
      const completionPadMeasures = computeCompletionPadMeasures(
        baseMeasureCount,
        progressionLength
      );
      // Section headers already provide strong visual separation in notation.
      // Avoid inserting synthetic trailing gap bars, which can look like
      // doubled ending chords/measures when sections resolve on the same chord.
      const trailingGapMeasures = 0;
      const sectionMeasureCount = baseMeasureCount + completionPadMeasures;
      const totalMeasureCount = sectionMeasureCount + trailingGapMeasures;
      const extraMeasures = Array(completionPadMeasures + trailingGapMeasures).fill(
        fullMeasureRestNotation
      );
      const sectionNotation = [result.notation, ...extraMeasures]
        .filter((chunk) => chunk.trim().length > 0)
        .join('|');
      const startMeasure = startMeasureCursor;
      startMeasureCursor += totalMeasureCount;
      return {
        section,
        result,
        sectionNotation,
        startMeasure,
        sectionMeasureCount,
        totalMeasureCount,
      };
    });
  }, [
    effectiveSections,
    generationSettings,
    sectionProgressions,
    timeSignature,
    fullMeasureRestNotation,
  ]);

  const sectionMeasureRanges = useMemo(() => {
    return sectionRenderPlans.map((plan) => ({
      startMeasure: plan.startMeasure,
      measureCount: plan.sectionMeasureCount,
    }));
  }, [sectionRenderPlans]);
  const sectionTickRanges = useMemo(() => {
    return sectionMeasureRanges.map((range) => ({
      startTick: Math.max(0, Math.round(range.startMeasure * sixteenthsPerMeasure)),
      endTick: Math.max(
        1,
        Math.round((range.startMeasure + range.measureCount) * sixteenthsPerMeasure)
      ),
    }));
  }, [sectionMeasureRanges, sixteenthsPerMeasure]);

  const chordLabelsByMeasure = useMemo(() => {
    const labels = new Map<number, string>();
    if (parsedRhythm.measures.length === 0) return labels;
    sectionRenderPlans.forEach((plan, sectionIndex) => {
      const progression = sectionProgressions[sectionIndex];
      if (
        !progression ||
        !progression.isValid ||
        progression.chordSymbols.length === 0
      ) {
        return;
      }
      const sectionChordSymbols = buildSectionChordSymbols(
        progression.chordSymbols,
        plan.sectionMeasureCount,
        plan.totalMeasureCount
      );
      sectionChordSymbols.forEach((symbol, offset) => {
        labels.set(plan.startMeasure + offset, symbol);
      });
    });
    let carryChord = songKey;
    for (let measureIndex = 0; measureIndex < parsedRhythm.measures.length; measureIndex += 1) {
      const chord = labels.get(measureIndex);
      if (chord && chord.trim().length > 0) {
        carryChord = chord;
      } else {
        labels.set(measureIndex, carryChord);
      }
    }
    return labels;
  }, [
    parsedRhythm.measures.length,
    sectionRenderPlans,
    sectionProgressions,
    songKey,
  ]);
  const chordStyleByMeasure = useMemo(() => {
    const styles = new Map<number, ChordStyleId>();
    sectionRenderPlans.forEach((plan) => {
      for (let offset = 0; offset < plan.totalMeasureCount; offset += 1) {
        styles.set(
          plan.startMeasure + offset,
          plan.section.chordStyleId
        );
      }
    });
    return styles;
  }, [sectionRenderPlans]);
  const effectivePlaybackSettings = useMemo(() => {
    const scale = Math.max(0, Math.min(100, drumsVolume)) / 100;
    return {
      ...playbackSettings,
      nonAccentVolume: Math.round(playbackSettings.nonAccentVolume * scale),
      beatGroupAccentVolume: Math.round(
        playbackSettings.beatGroupAccentVolume * scale
      ),
      measureAccentVolume: Math.round(
        playbackSettings.measureAccentVolume * scale
      ),
    };
  }, [playbackSettings, drumsVolume]);
  const {
    isPlaying,
    currentNote,
    currentMetronomeBeat,
    handlePlay,
    handleStop,
    handleMetronomeToggle,
  } = usePlayback({
    parsedRhythm,
    bpm,
    debouncedBpm,
    metronomeEnabled,
    playbackSettings: effectivePlaybackSettings,
    selectionRange: playbackSelectionRange,
  });
  const activeChordMeasure =
    isPlaying && chordLabelsByMeasure.size > 0 && currentNote
      ? currentNote.measureIndex
      : null;
  const stopPlaybackImmediately = useCallback(() => {
    chordInstrumentRef.current?.stopAll(0);
    handleStop();
  }, [handleStop]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedBpm(bpm), 350);
    return () => window.clearTimeout(timeoutId);
  }, [bpm]);

  useEffect(() => {
    if (!pendingPlaybackStart) return;
    setPendingPlaybackStart(false);
    stopPlaybackImmediately();
    const frame = window.requestAnimationFrame(() => {
      handlePlay();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pendingPlaybackStart, handlePlay, stopPlaybackImmediately]);

  useEffect(() => {
    setBpmInput(String(bpm));
  }, [bpm]);

  useEffect(() => {
    if (isPlaying) stopPlaybackImmediately();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notation, timeSignature]);

  useEffect(() => {
    let frameId = 0;
    const checkStickyState = () => {
      frameId = 0;
      if (!stickyControlsRef.current) return;
      const nextIsStuck =
        stickyControlsRef.current.getBoundingClientRect().top <= 0;
      setIsStickyControlsStuck((previous) =>
        previous === nextIsStuck ? previous : nextIsStuck
      );
    };
    const onScrollOrResize = () => {
      if (frameId !== 0) return;
      frameId = window.requestAnimationFrame(checkStickyState);
    };
    onScrollOrResize();
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      if (frameId !== 0) window.cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, []);

  useEffect(() => {
    const mergedNotation = sectionRenderPlans
      .map((plan) => plan.sectionNotation)
      .filter((value) => value.trim().length > 0)
      .join('|');
    const mergedAnalyses = sectionRenderPlans.flatMap(
      (plan) => plan.result.analyses
    );
    const mergedHits: SyllableHit[] = [];
    sectionRenderPlans.forEach((plan) => {
      const sectionStartSixteenth = plan.startMeasure * sixteenthsPerMeasure;
      plan.result.hits.forEach((hit) => {
        mergedHits.push({
          ...hit,
          startSixteenth: hit.startSixteenth + sectionStartSixteenth,
        });
      });
    });
    const mergedResult: WordRhythmResult = {
      notation: mergedNotation || DEFAULT_WORD_RESULT.notation,
      analyses: mergedAnalyses,
      hits: mergedHits,
      dictionaryCount: sectionRenderPlans.reduce(
        (sum, plan) => sum + plan.result.dictionaryCount,
        0
      ),
      heuristicCount: sectionRenderPlans.reduce(
        (sum, plan) => sum + plan.result.heuristicCount,
        0
      ),
      unresolvedCount: sectionRenderPlans.reduce(
        (sum, plan) => sum + plan.result.unresolvedCount,
        0
      ),
    };
    setGenerated(mergedResult);
    setNotation(mergedResult.notation);
  }, [sectionRenderPlans, sixteenthsPerMeasure]);

  useEffect(
    () => () => {
      chordSampledPianoRef.current?.setLoadingProgressCallback(null);
      chordInstrumentRef.current?.stopAll(20);
      chordInstrumentRef.current?.disconnect();
      chordInstrumentRef.current = null;
      chordSampledPianoRef.current = null;
      chordInstrumentTypeRef.current = null;
      if (chordAudioContextRef.current) {
        void chordAudioContextRef.current.close();
      }
      chordAudioContextRef.current = null;
    },
    []
  );

  useEffect(() => {
    if (!isPlaying) {
      lastChordMeasureRef.current = null;
      chordInstrumentRef.current?.stopAll(10);
      return;
    }
    if (chordLabelsByMeasure.size === 0) {
      return;
    }
    const measureIndex =
      currentMetronomeBeat?.measureIndex ?? currentNote?.measureIndex ?? null;
    const isMeasureStart = currentMetronomeBeat
      ? currentMetronomeBeat.isDownbeat
      : currentNote?.noteIndex === 0;
    if (measureIndex === null || !isMeasureStart) {
      return;
    }
    if (lastChordMeasureRef.current === measureIndex) return;
    lastChordMeasureRef.current = measureIndex;

    const chordToken = chordLabelsByMeasure.get(measureIndex) ?? '';
    if (!chordToken) return;

    const parsed = chordToken.match(CHORD_PARSE_REGEX);
    if (!parsed) return;
    const root = parsed[1] ?? 'C';
    const suffix = (parsed[2] ?? '').toLowerCase();
    const qualityBySuffix: Record<string, ChordQuality> = {
      '': 'major',
      m: 'minor',
      dim: 'diminished',
      aug: 'augmented',
      sus2: 'sus2',
      sus4: 'sus4',
      '7': 'dominant7',
      maj7: 'major7',
      m7: 'minor7',
    };
    const quality = qualityBySuffix[suffix];
    if (!quality) return;
    const normalizedRoot = `${root[0]?.toUpperCase() ?? 'C'}${root.slice(1)}`;
    const chord: TheoryChord = {
      root: normalizedRoot,
      quality,
      inversion: 0,
      octave: 4,
    };

    const ensureInstrument = async (): Promise<{
      ctx: AudioContext;
      instrument: Instrument;
    } | null> => {
      if (!chordAudioContextRef.current) {
        chordAudioContextRef.current = new AudioContext({
          latencyHint: 'interactive',
        });
      }
      const ctx = chordAudioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      if (
        chordInstrumentRef.current &&
        chordInstrumentTypeRef.current === chordSoundType &&
        (chordSoundType !== 'piano-sampled' ||
          chordSampledPianoRef.current?.isReady())
      ) {
        return { ctx, instrument: chordInstrumentRef.current };
      }

      chordInstrumentRef.current?.stopAll(20);
      if (
        chordInstrumentRef.current &&
        chordInstrumentRef.current !== chordSampledPianoRef.current
      ) {
        chordInstrumentRef.current.disconnect();
      }

      if (chordSoundType === 'piano-sampled') {
        if (!chordSampledPianoRef.current) {
          chordSampledPianoRef.current = new SampledPiano(ctx);
          chordSampledPianoRef.current.connect(ctx.destination);
        }
        chordSampledPianoRef.current.setLoadingProgressCallback(
          (loaded, total) => {
            setSampledPianoLoad({
              loading: loaded < total,
              loaded,
              total,
              ready: false,
            });
          }
        );
        if (!chordSampledPianoRef.current.isReady()) {
          setSampledPianoLoad((previous) => ({ ...previous, loading: true }));
          await chordSampledPianoRef.current.loadSamples();
        }
        setSampledPianoLoad((previous) => ({
          ...previous,
          loading: false,
          ready: chordSampledPianoRef.current?.isReady() ?? false,
          loaded:
            previous.total > 0
              ? previous.total
              : chordSampledPianoRef.current?.isReady()
                ? 1
                : 0,
          total: previous.total > 0 ? previous.total : 1,
        }));
        chordInstrumentRef.current = chordSampledPianoRef.current;
        chordInstrumentTypeRef.current = chordSoundType;
        return { ctx, instrument: chordSampledPianoRef.current };
      }
      if (
        sampledPianoLoad.loading ||
        sampledPianoLoad.ready ||
        sampledPianoLoad.total > 0
      ) {
        setSampledPianoLoad({
          loading: false,
          loaded: 0,
          total: 0,
          ready: false,
        });
      }

      const instrument =
        chordSoundType === 'piano'
          ? new PianoSynthesizer(ctx)
          : new SimpleSynthesizer(ctx, chordSoundType as WaveformType);
      instrument.connect(ctx.destination);
      chordInstrumentRef.current = instrument;
      chordInstrumentTypeRef.current = chordSoundType;
      return { ctx, instrument };
    };

    const playChord = async () => {
      const ready = await ensureInstrument();
      if (!ready) return;
      const { ctx, instrument } = ready;
      const treble = generateVoicing(
        chord,
        {
          useInversions: false,
          useOpenVoicings: true,
          randomizeOctaves: false,
        },
        'treble'
      );
      const bass = generateVoicing(
        chord,
        {
          useInversions: false,
          useOpenVoicings: false,
          randomizeOctaves: false,
        },
        'bass'
      );
      const chordPitches = [
        ...new Set([...bass.slice(0, 1), ...treble.slice(0, 4)]),
      ];
      if (chordPitches.length === 0) return;

      const measure = parsedRhythm.measures[measureIndex];
      const measureSixteenths = measure
        ? measure.notes.reduce(
            (sum, note) => sum + note.durationInSixteenths,
            0
          )
        : 16;
      const measureSeconds = Math.max(
        0.18,
        (measureSixteenths / 4) * (60 / Math.max(1, bpm))
      );
      const beatsPerMeasure =
        timeSignature.numerator * (4 / timeSignature.denominator);
      const secPerBeat = measureSeconds / Math.max(0.001, beatsPerMeasure);
      const sectionStyle = chordStyleByMeasure.get(measureIndex) ?? 'simple';
      const patternHits = getChordHitsForStyle(sectionStyle, timeSignature);
      const velocity = Math.max(0, Math.min(1, chordVolume / 100));
      const startTime = ctx.currentTime + 0.01;
      patternHits.forEach((hit) => {
        const hitPitches =
          hit.source === 'bass'
            ? bass.slice(0, 1)
            : hit.source === 'treble'
              ? treble.slice(0, 4)
              : chordPitches;
        const uniqueHitPitches = [...new Set(hitPitches)];
        const hitStart = startTime + hit.offsetBeats * secPerBeat;
        const hitDuration = Math.max(
          0.12,
          hit.durationBeats * secPerBeat * 0.95
        );
        uniqueHitPitches.forEach((midi) => {
          instrument.playNote({
            frequency: midiToFrequency(midi),
            startTime: hitStart,
            duration: hitDuration,
            velocity,
          });
        });
      });
    };

    void playChord();
  }, [
    isPlaying,
    chordLabelsByMeasure,
    chordStyleByMeasure,
    currentMetronomeBeat,
    currentNote,
    parsedRhythm.measures,
    bpm,
    timeSignature,
    chordVolume,
    chordSoundType,
    sampledPianoLoad.loading,
    sampledPianoLoad.ready,
    sampledPianoLoad.total,
  ]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const inGenerationMenu = generationMenuRef.current?.contains(target);
      const inGenerationButton = generationButtonRef.current?.contains(target);
      if (!inGenerationMenu && !inGenerationButton) {
        setGenerationMenuOpen(false);
      }
      const inSoundMenu = soundMenuRef.current?.contains(target);
      const inSoundButton = soundButtonRef.current?.contains(target);
      if (!inSoundMenu && !inSoundButton) {
        setSoundMenuOpen(false);
      }
      const inSectionSettingsAnchor =
        target instanceof Element &&
        target.closest('.words-section-settings-anchor');
      const inSectionSettingsMenu = sectionSettingsMenuRef.current?.contains(target);
      if (!inSectionSettingsAnchor && !inSectionSettingsMenu) {
        setOpenSectionSettingsId(null);
      }
      const inExportMenu = exportMenuRef.current?.contains(target);
      const inExportButton = exportButtonRef.current?.contains(target);
      if (!inExportMenu && !inExportButton) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  useEffect(() => {
    if (!openSectionSettingsId) {
      setSectionSettingsPosition(null);
      return;
    }

    let frameId = 0;
    const updatePositionNow = () => {
      const anchor = sectionSettingsAnchorRefs.current.get(openSectionSettingsId);
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const horizontalPadding = 16;
      const viewportPadding = 16;
      const menuGap = 6;
      const preferredMaxHeight = Math.min(window.innerHeight * 0.72, 720);
      const menuWidth = Math.min(460, window.innerWidth - horizontalPadding * 2);
      const left = Math.min(
        Math.max(horizontalPadding, rect.right - menuWidth),
        window.innerWidth - menuWidth - horizontalPadding
      );
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding - menuGap;
      const spaceAbove = rect.top - viewportPadding - menuGap;
      const openAbove = spaceBelow < 220 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(
        180,
        Math.min(preferredMaxHeight, openAbove ? spaceAbove : spaceBelow)
      );
      const top = openAbove
        ? Math.max(
            viewportPadding,
            rect.top - menuGap - maxHeight
          )
        : rect.bottom + menuGap;
      setSectionSettingsPosition((previous) => {
        if (
          previous &&
          Math.abs(previous.top - top) < 0.5 &&
          Math.abs(previous.left - left) < 0.5 &&
          Math.abs(previous.width - menuWidth) < 0.5 &&
          Math.abs(previous.maxHeight - maxHeight) < 0.5
        ) {
          return previous;
        }
        return { top, left, width: menuWidth, maxHeight };
      });
    };
    const scheduleUpdate = () => {
      if (frameId !== 0) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        updatePositionNow();
      });
    };
    scheduleUpdate();
    window.addEventListener('resize', scheduleUpdate);
    // Capture scroll from any scrollable ancestor/container so the menu
    // remains visually attached to the gear anchor.
    window.addEventListener('scroll', scheduleUpdate, true);
    return () => {
      if (frameId !== 0) window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('scroll', scheduleUpdate, true);
    };
  }, [openSectionSettingsId]);

  const updateSetting = <K extends keyof WordRhythmAdvancedSettings>(
    key: K,
    value: WordRhythmAdvancedSettings[K]
  ) => {
    setGenerationSettings((previous) => ({ ...previous, [key]: value }));
  };

  const updateSection = (
    sectionId: string,
    updater: (section: SongSection) => SongSection
  ) => {
    applySectionsChange((previous) =>
      previous.map((section) =>
        section.id === sectionId ? updater(section) : section
      )
    );
  };

  const updateSectionLyrics = (sectionId: string, lyrics: string) => {
    applySectionsChange((previous) =>
      previous.map((section) => {
        const edited = previous.find((candidate) => candidate.id === sectionId);
        if (
          edited?.type === 'chorus' &&
          edited.linkedToPreviousChorusLyrics &&
          section.type === 'chorus' &&
          section.linkedToPreviousChorusLyrics
        ) {
          return { ...section, lyrics };
        }
        if (section.id === sectionId) return { ...section, lyrics };
        return section;
      })
    );
  };

  const updateSectionTemplateNotation = (
    sectionId: string,
    templateNotation: string
  ) => {
    applySectionsChange((previous) =>
      previous.map((section) => {
        const edited = previous.find((candidate) => candidate.id === sectionId);
        if (
          edited?.type === 'chorus' &&
          edited.linkedToPreviousChorusTemplate &&
          section.type === 'chorus' &&
          section.linkedToPreviousChorusTemplate
        ) {
          return { ...section, templateNotation };
        }
        if (section.id === sectionId) return { ...section, templateNotation };
        return section;
      })
    );
  };

  const updateSectionTemplateBias = (sectionId: string, templateBias: number) => {
    applySectionsChange((previous) =>
      previous.map((section) => {
        const edited = previous.find((candidate) => candidate.id === sectionId);
        if (
          edited?.type === 'chorus' &&
          edited.linkedToPreviousChorusTemplate &&
          section.type === 'chorus' &&
          section.linkedToPreviousChorusTemplate
        ) {
          return { ...section, templateBias };
        }
        if (section.id === sectionId) return { ...section, templateBias };
        return section;
      })
    );
  };

  const addSection = (type: SongSectionType) => {
    applySectionsChange((previous) => {
      const previousChorus =
        type === 'chorus'
          ? findPreviousChorus(previous, previous.length)
          : null;
      const nextSection = createDefaultSection(
        type,
        APP_DEFAULT_GENERATION_SETTINGS,
        previousChorus ?? undefined
      );
      if (type === 'chorus') {
        nextSection.linkedToPreviousChorusLyrics = true;
        nextSection.linkedToPreviousChorusTemplate = true;
      }
      return [
        ...previous,
        nextSection,
      ];
    });
  };

  const removeSection = (sectionId: string) => {
    if (sections.length <= 1) return;
    const index = sections.findIndex((section) => section.id === sectionId);
    if (index < 0) return;
    const confirmed = window.confirm(
      `Delete ${sectionDisplayNames[index] ?? 'this section'}?`
    );
    if (!confirmed) return;
    if (openSectionSettingsId === sectionId) {
      setOpenSectionSettingsId(null);
    }
    applySectionsChange((previous) =>
      previous.filter((section) => section.id !== sectionId)
    );
  };

  const moveSection = (sectionId: string, direction: -1 | 1) => {
    applySectionsChange((previous) => {
      const index = previous.findIndex((section) => section.id === sectionId);
      if (index < 0) return previous;
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= previous.length) return previous;
      const next = [...previous];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const regenerateBoth = (seedDelta = 1) => {
    const delta = Math.max(1, seedDelta);
    applySectionsChange((previous) =>
      previous.map((section) => ({
        ...section,
        rhythmVariationSeed: section.rhythmVariationSeed + delta,
        soundVariationSeed: section.soundVariationSeed + delta,
      }))
    );
  };

  const regenerateSection = (sectionId: string) => {
    updateSection(sectionId, (section) => ({
      ...section,
      rhythmVariationSeed: section.rhythmVariationSeed + 1,
      soundVariationSeed: section.soundVariationSeed + 1,
    }));
  };

  const playAllSections = () => {
    setActiveSectionLoopId(null);
    setPlaybackSelectionRange(null);
    setPendingPlaybackStart(true);
  };

  const playSectionLoop = (sectionId: string, sectionIndex: number) => {
    const range = sectionTickRanges[sectionIndex];
    if (!range || range.endTick <= range.startTick) return;
    setActiveSectionLoopId(sectionId);
    setPlaybackSelectionRange(range);
    setPendingPlaybackStart(true);
  };

  const handleResetGenerationSettings = () => {
    setGenerationSettings(APP_DEFAULT_GENERATION_SETTINGS);
  };

  const randomizeChordProgression = (sectionId: string) => {
    const randomProgression = getRandomPopularChordProgressionInKey(songKey);
    updateSection(sectionId, (section) => ({
      ...section,
      chordProgressionInput: randomProgression.display,
    }));
  };

  const setSectionChordProgression = (sectionId: string, input: string) => {
    updateSection(sectionId, (section) => ({
      ...section,
      chordProgressionInput: input,
    }));
    const parsed = parseProgressionText(input, songKey);
    if (parsed.isValid && parsed.format === 'chord' && parsed.inferredKey) {
      setSongKey(parsed.inferredKey);
    }
  };

  const commitBpmInput = () => {
    const parsed = Number(bpmInput);
    if (!Number.isFinite(parsed)) {
      setBpmInput(String(bpm));
      return;
    }
    const clamped = Math.min(220, Math.max(40, Math.round(parsed)));
    setBpm(clamped);
    setBpmInput(String(clamped));
  };

  const sectionDisplayNames = useMemo(() => {
    const totals = { verse: 0, chorus: 0, bridge: 0 };
    sections.forEach((section) => {
      totals[section.type] += 1;
    });
    const seen = { verse: 0, chorus: 0, bridge: 0 };
    return sections.map((section) => {
      seen[section.type] += 1;
      const baseLabel =
        section.type === 'verse'
          ? 'Verse'
          : section.type === 'chorus'
            ? 'Chorus'
            : 'Bridge';
      if (totals[section.type] <= 1) return baseLabel;
      return `${baseLabel} ${seen[section.type]}`;
    });
  }, [sections]);
  const scrollSectionIntoNotationView = (sectionId: string) => {
    const container = notationScrollRef.current;
    const target = notationSectionRefs.current.get(sectionId);
    if (!container || !target) return;
    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const upperBuffer = 72;
    const lowerBuffer = 120;
    if (
      targetRect.top >= containerRect.top + upperBuffer &&
      targetRect.bottom <= containerRect.bottom - lowerBuffer
    ) {
      return;
    }
    const targetTopWithinContainer =
      targetRect.top - containerRect.top + container.scrollTop;
    const desiredTop = Math.max(0, targetTopWithinContainer - upperBuffer);
    container.scrollTo({ top: desiredTop, behavior: 'auto' });
  };
  const notationSectionBlocks = useMemo(
    () =>
      sectionRenderPlans.map((plan, index) => {
        const rhythm = parseRhythm(plan.sectionNotation, timeSignature);
        const localHitMap = new Map<string, SyllableHit>();
        rhythm.measures.forEach((measure, localMeasureIndex) => {
          measure.notes.forEach((_, noteIndex) => {
            const globalKey = `${plan.startMeasure + localMeasureIndex}-${noteIndex}`;
            const hit = hitMap.get(globalKey);
            if (hit) localHitMap.set(`${localMeasureIndex}-${noteIndex}`, hit);
          });
        });
        const localChordLabelsByMeasure = new Map<number, string>();
        const localChordStyleByMeasure = new Map<number, ChordStyleId>();
        for (let offset = 0; offset < plan.totalMeasureCount; offset += 1) {
          const globalMeasure = plan.startMeasure + offset;
          localChordLabelsByMeasure.set(
            offset,
            chordLabelsByMeasure.get(globalMeasure) ?? ''
          );
          localChordStyleByMeasure.set(
            offset,
            chordStyleByMeasure.get(globalMeasure) ?? plan.section.chordStyleId
          );
        }
        const localCurrentNote =
          currentNote &&
          currentNote.measureIndex >= plan.startMeasure &&
          currentNote.measureIndex < plan.startMeasure + plan.totalMeasureCount
            ? {
                measureIndex: currentNote.measureIndex - plan.startMeasure,
                noteIndex: currentNote.noteIndex,
              }
            : null;
        const localCurrentMetronomeBeat =
          currentMetronomeBeat &&
          currentMetronomeBeat.measureIndex >= plan.startMeasure &&
          currentMetronomeBeat.measureIndex <
            plan.startMeasure + plan.totalMeasureCount
            ? {
                ...currentMetronomeBeat,
                measureIndex:
                  currentMetronomeBeat.measureIndex - plan.startMeasure,
              }
            : null;
        const localActiveChordMeasure =
          activeChordMeasure !== null &&
          activeChordMeasure >= plan.startMeasure &&
          activeChordMeasure < plan.startMeasure + plan.totalMeasureCount
            ? activeChordMeasure - plan.startMeasure
            : null;
        return {
          id: plan.section.id,
          title: sectionDisplayNames[index] ?? `Section ${index + 1}`,
          measureNumberOffset: plan.startMeasure,
          showMeasureNumbers: parsedRhythm.measures.length > 4,
          rhythm,
          localHitMap,
          localChordLabelsByMeasure,
          localChordStyleByMeasure,
          localCurrentNote,
          localCurrentMetronomeBeat,
          localActiveChordMeasure,
        };
      }),
    [
      sectionRenderPlans,
      timeSignature,
      hitMap,
      chordLabelsByMeasure,
      chordStyleByMeasure,
      currentNote,
      currentMetronomeBeat,
      activeChordMeasure,
      sectionDisplayNames,
      parsedRhythm.measures.length,
    ]
  );

  const hydrateFromUrlSearch = useCallback((search: string) => {
    const params = new URLSearchParams(search);
    const sectionsParam = params.get(URL_PARAM_SECTIONS);
    const encodedLyrics = params.get(URL_PARAM_LYRICS);
    const bpmParam = Number(params.get(URL_PARAM_BPM));
    const timeParam = params.get(URL_PARAM_TIME);
    const metronomeParam = params.get(URL_PARAM_METRONOME);
    const autoFollowParam = params.get(URL_PARAM_AUTOFOLLOW);
    const generationSettingsParam = params.get(URL_PARAM_GENERATION_SETTINGS);
    const drumsVolumeParam = parseOptionalNumberParam(
      params.get(URL_PARAM_DRUMS_VOLUME)
    );
    const chordSoundParam = params.get(URL_PARAM_CHORD_SOUND);
    const chordVolumeParam = parseOptionalNumberParam(
      params.get(URL_PARAM_CHORD_VOLUME)
    );
    const chordKeyParam = params.get(URL_PARAM_CHORD_KEY);

    if (sectionsParam) {
      const decodedSections = decodeBase64UrlUtf8(sectionsParam);
      if (decodedSections) {
        try {
          const parsed = JSON.parse(decodedSections) as {
            songKey?: Key;
            sections?: SongSection[];
          };
          if (parsed.songKey && ALL_KEYS.includes(parsed.songKey)) {
            setSongKey(parsed.songKey);
          }
          if (Array.isArray(parsed.sections) && parsed.sections.length > 0) {
            setSections(parsed.sections);
          }
        } catch {
          // Ignore malformed section payload and fall back below.
        }
      }
    } else {
      // Backward compatibility with old single-text URL.
      const decodedLyrics = encodedLyrics
        ? decodeBase64UrlUtf8(encodedLyrics)
        : null;
      if (typeof decodedLyrics === 'string') {
        setSections((previous) =>
          previous.map((section, index) =>
            index === 0 ? { ...section, lyrics: decodedLyrics } : section
          )
        );
      }
    }

    if (!Number.isNaN(bpmParam) && bpmParam >= 40 && bpmParam <= 220) {
      setBpm(bpmParam);
      setDebouncedBpm(bpmParam);
    }
    if (timeParam) {
      const [numerator, denominator] = timeParam.split('/').map(Number);
      if (
        Number.isFinite(numerator) &&
        Number.isFinite(denominator) &&
        TIME_SIGNATURE_OPTIONS.some(
          (option) =>
            option.numerator === numerator && option.denominator === denominator
        )
      ) {
        setTimeSignature({ numerator, denominator });
      }
    }
    if (metronomeParam === '1' || metronomeParam === '0')
      setMetronomeEnabled(metronomeParam === '1');
    if (autoFollowParam === '1' || autoFollowParam === '0')
      setAutoFollowPlayback(autoFollowParam === '1');
    if (generationSettingsParam) {
      const decodedSettings = decodeBase64UrlUtf8(generationSettingsParam);
      if (decodedSettings) {
        try {
          const parsedSettings = JSON.parse(
            decodedSettings
          ) as Partial<WordRhythmAdvancedSettings>;
          setGenerationSettings((previous) => ({
            ...previous,
            ...parsedSettings,
          }));
        } catch {
          // Ignore malformed generation settings in URL.
        }
      }
    }
    if (
      drumsVolumeParam !== null &&
      drumsVolumeParam >= 0 &&
      drumsVolumeParam <= 100
    ) {
      setDrumsVolume(drumsVolumeParam);
    }
    if (
      chordSoundParam &&
      SOUND_OPTIONS.some((option) => option.value === chordSoundParam)
    ) {
      setChordSoundType(chordSoundParam as SoundType);
    }
    if (
      chordVolumeParam !== null &&
      chordVolumeParam >= 0 &&
      chordVolumeParam <= 100
    ) {
      setChordVolume(chordVolumeParam);
    }
    if (chordKeyParam && ALL_KEYS.includes(chordKeyParam as Key)) {
      setSongKey(chordKeyParam as Key);
    }
  }, []);

  useEffect(() => {
    hydrateFromUrlSearch(window.location.search);
    hasHydratedUrlStateRef.current = true;
  }, [hydrateFromUrlSearch]);

  useEffect(
    () =>
      subscribeToPopState(() => {
        hydrateFromUrlSearch(window.location.search);
      }),
    [hydrateFromUrlSearch]
  );

  useEffect(() => {
    if (!hasHydratedUrlStateRef.current) return;
    const params = new URLSearchParams();
    const generationSettingsJson = JSON.stringify(generationSettings);
    const defaultGenerationSettingsJson = JSON.stringify(
      APP_DEFAULT_GENERATION_SETTINGS
    );
    const defaultSectionsJson = JSON.stringify(DEFAULT_SECTIONS);
    const sectionsJson = JSON.stringify(sections);
    if (sectionsJson !== defaultSectionsJson || songKey !== DEFAULT_SONG_KEY) {
      params.set(
        URL_PARAM_SECTIONS,
        encodeBase64UrlUtf8(JSON.stringify({ sections, songKey }))
      );
    }
    if (notation !== DEFAULT_WORD_RESULT.notation)
      params.set(URL_PARAM_PATTERN, notation);
    if (bpm !== 100) params.set(URL_PARAM_BPM, String(bpm));
    if (
      timeSignature.numerator !== DEFAULT_TIME_SIGNATURE.numerator ||
      timeSignature.denominator !== DEFAULT_TIME_SIGNATURE.denominator
    ) {
      params.set(
        URL_PARAM_TIME,
        `${timeSignature.numerator}/${timeSignature.denominator}`
      );
    }
    if (!metronomeEnabled) params.set(URL_PARAM_METRONOME, '0');
    if (!autoFollowPlayback) params.set(URL_PARAM_AUTOFOLLOW, '0');
    if (generationSettingsJson !== defaultGenerationSettingsJson) {
      params.set(
        URL_PARAM_GENERATION_SETTINGS,
        encodeBase64UrlUtf8(generationSettingsJson)
      );
    }
    if (drumsVolume !== 100)
      params.set(URL_PARAM_DRUMS_VOLUME, String(drumsVolume));
    if (chordSoundType !== 'piano')
      params.set(URL_PARAM_CHORD_SOUND, chordSoundType);
    if (chordVolume !== 58)
      params.set(URL_PARAM_CHORD_VOLUME, String(chordVolume));
    if (songKey !== DEFAULT_SONG_KEY)
      params.set(URL_PARAM_CHORD_KEY, songKey);
    const nextUrl =
      params.size > 0
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
    syncUrlWithHistory(nextUrl, urlHistoryStateRef.current, {
      debounceMs: URL_HISTORY_DEBOUNCE_MS,
      replaceDebounceParams: URL_HISTORY_REPLACE_DEBOUNCE_PARAMS,
    });
  }, [
    sections,
    songKey,
    notation,
    bpm,
    timeSignature,
    metronomeEnabled,
    autoFollowPlayback,
    generationSettings,
    drumsVolume,
    chordSoundType,
    chordVolume,
    hydrateFromUrlSearch,
  ]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setGenerationMenuOpen(false);
        setSoundMenuOpen(false);
        setOpenSectionSettingsId(null);
        setExportMenuOpen(false);
        return;
      }
      if (event.code !== 'Space' || event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      if (isPlaying) {
        stopPlaybackImmediately();
        setActiveSectionLoopId(null);
      } else {
        setActiveSectionLoopId(null);
        setPlaybackSelectionRange(null);
        setPendingPlaybackStart(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPlaying, stopPlaybackImmediately]);

  useEffect(() => {
    const onUndoChange = (event: KeyboardEvent) => {
      if ((!event.ctrlKey && !event.metaKey) || event.shiftKey) return;
      if (event.key.toLowerCase() !== 'z') return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      const snapshot = undoHistoryRef.current.pop();
      if (!snapshot) return;
      event.preventDefault();
      setSections(cloneSectionsSnapshot(snapshot.sections));
      setSongKey(snapshot.songKey);
    };
    window.addEventListener('keydown', onUndoChange);
    return () => window.removeEventListener('keydown', onUndoChange);
  }, []);

  const copyText = async (value: string) => {
    if (!value.trim()) return;
    await navigator.clipboard.writeText(value);
  };

  const lyricsExportText = useMemo(
    () =>
      effectiveSections
        .map((section, index) => {
          const heading = sectionDisplayNames[index] ?? `Section ${index + 1}`;
          return `${heading}\n${section.effectiveLyrics || ''}`.trim();
        })
        .join('\n\n'),
    [effectiveSections, sectionDisplayNames]
  );
  const scoreMeasureCount = parsedRhythm.measures.length;
  const estimatedSongDuration = useMemo(() => {
    const totalSixteenths = parsedRhythm.measures.reduce(
      (measureSum, measure) =>
        measureSum +
        measure.notes.reduce(
          (noteSum, note) => noteSum + note.durationInSixteenths,
          0
        ),
      0
    );
    const seconds = Math.max(0, (totalSixteenths / 4) * (60 / Math.max(1, bpm)));
    const wholeSeconds = Math.round(seconds);
    const minutes = Math.floor(wholeSeconds / 60);
    const remaining = wholeSeconds % 60;
    return `${minutes}:${String(remaining).padStart(2, '0')}`;
  }, [parsedRhythm.measures, bpm]);

  const asciiChordChartExportText = useMemo(() => {
    const toLyricWords = (line: string): string[] =>
      line
        .trim()
        .split(/\s+/)
        .filter((token) => token.length > 0);

    const alignChordsOverLine = (
      lyricLine: string,
      chordTokens: string[]
    ) => {
      if (chordTokens.length === 0) return '';
      const starts = Array.from(lyricLine.matchAll(/\S+/g)).map(
        (match) => match.index ?? 0
      );
      const slotCount = chordTokens.length;
      const anchors =
        starts.length > 0
          ? Array.from({ length: slotCount }, (_, slot) => {
              const ratio = slotCount === 1 ? 0 : slot / (slotCount - 1);
              const mapped = Math.floor(ratio * (starts.length - 1));
              return starts[Math.max(0, Math.min(starts.length - 1, mapped))];
            })
          : Array.from({ length: slotCount }, (_, slot) => slot * 4);
      const minimumChordWidth =
        chordTokens.reduce((sum, token) => sum + token.length + 2, 0) + 2;
      const buffer = Array.from({
        length: Math.max(lyricLine.length + 24, minimumChordWidth),
      }).fill(' ');
      let minStart = 0;
      anchors.forEach((anchor, tokenIndex) => {
        const token = chordTokens[tokenIndex] ?? '';
        if (!token) return;
        const start = Math.max(anchor, minStart);
        for (let offset = 0; offset < token.length; offset += 1) {
          const at = start + offset;
          if (at >= buffer.length) buffer.push(token[offset]);
          else buffer[at] = token[offset] ?? ' ';
        }
        minStart = start + token.length + 2;
      });
      return buffer.join('').trimEnd();
    };

    const formatRemainingMeasureChords = (chords: string[]): string[] => {
      if (chords.length === 0) return [];
      const lines: string[] = [];
      for (let index = 0; index < chords.length; index += 4) {
        const chunk = chords.slice(index, index + 4);
        lines.push(chunk.join('  '));
      }
      return lines;
    };

    return effectiveSections
      .map((section, index) => {
        const heading = sectionDisplayNames[index] ?? `Section ${index + 1}`;
        const plan = sectionRenderPlans[index];
        const chordSymbolsByMeasure = plan
          ? Array.from({ length: plan.totalMeasureCount }, (_, offset) => {
              return (
                chordLabelsByMeasure.get(plan.startMeasure + offset) ??
                songKey
              );
            })
          : [];
        const lyricLines = (section.effectiveLyrics || '')
          .split('\n')
          .map((line) => line.trimEnd())
          .filter((line) => line.length > 0);
        if (lyricLines.length === 0) {
          const fallback =
            chordSymbolsByMeasure.length > 0
              ? formatRemainingMeasureChords(chordSymbolsByMeasure).join('\n')
              : '(no chord progression)';
          return `${heading}\n${fallback}`;
        }
        const wordIndexToLine = new Map<number, number>();
        let globalWordIndex = 0;
        lyricLines.forEach((line, lineIndex) => {
          const words = toLyricWords(line);
          words.forEach(() => {
            wordIndexToLine.set(globalWordIndex, lineIndex);
            globalWordIndex += 1;
          });
        });
        const measureOffsetsByLine = lyricLines.map(() => new Set<number>());
        if (plan) {
          plan.result.hits.forEach((hit) => {
            const lineIndex = wordIndexToLine.get(hit.wordIndex);
            if (lineIndex === undefined) return;
            const measureOffset = Math.floor(
              hit.startSixteenth / sixteenthsPerMeasure
            );
            if (
              measureOffset >= 0 &&
              measureOffset < chordSymbolsByMeasure.length
            ) {
              measureOffsetsByLine[lineIndex]?.add(measureOffset);
            }
          });
        }
        const usedMeasureOffsets = new Set<number>();
        let fallbackMeasureCursor = 0;
        const sectionLines: string[] = [heading];
        lyricLines.forEach((lyricLine, lineIndex) => {
          const inferredOffsets = Array.from(
            measureOffsetsByLine[lineIndex] ?? []
          )
            .sort((a, b) => a - b)
            .filter((offset) => offset >= 0 && offset < chordSymbolsByMeasure.length);
          if (inferredOffsets.length === 0) {
            while (
              fallbackMeasureCursor < chordSymbolsByMeasure.length &&
              usedMeasureOffsets.has(fallbackMeasureCursor)
            ) {
              fallbackMeasureCursor += 1;
            }
            if (fallbackMeasureCursor < chordSymbolsByMeasure.length) {
              inferredOffsets.push(fallbackMeasureCursor);
              fallbackMeasureCursor += 1;
            }
          }
          const lineChords = inferredOffsets.map(
            (offset) => chordSymbolsByMeasure[offset] ?? songKey
          );
          const alignedChordLine = alignChordsOverLine(lyricLine, lineChords);
          if (alignedChordLine.length > 0) {
            sectionLines.push(alignedChordLine);
          }
          inferredOffsets.forEach((offset) => usedMeasureOffsets.add(offset));
          sectionLines.push(lyricLine);
        });
        const remainingChords = chordSymbolsByMeasure.filter(
          (_, offset) => !usedMeasureOffsets.has(offset)
        );
        if (remainingChords.length > 0) {
          sectionLines.push('[Instrumental]');
          sectionLines.push(...formatRemainingMeasureChords(remainingChords));
        }
        return sectionLines.join('\n');
      })
      .join('\n\n');
  }, [
    effectiveSections,
    sectionDisplayNames,
    sectionRenderPlans,
    chordLabelsByMeasure,
    songKey,
    sixteenthsPerMeasure,
  ]);

  const handleDownloadChordChartPdf = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;
    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    const escapeWithNbsp = (value: string) =>
      escapeHtml(value).replace(/ /g, '&nbsp;');
    const chordTokenPattern =
      /^[A-G](?:#|b)?(?:maj7|m7|m|7|sus2|sus4|dim|aug)?$/i;
    const htmlLines = asciiChordChartExportText
      .split('\n')
      .map((line) => {
        if (line.length === 0) return '<div class="chart-line empty">&nbsp;</div>';
        const trimmed = line.trim();
        const tokens = trimmed.length > 0 ? trimmed.split(/\s+/) : [];
        const isChordLine =
          tokens.length > 0 && tokens.every((token) => chordTokenPattern.test(token));
        return `<div class="chart-line${isChordLine ? ' chord-line' : ''}">${escapeWithNbsp(line)}</div>`;
      })
      .join('');
    printWindow.document.write(`<!doctype html>
<html>
  <head>
    <title>Chord Chart</title>
    <style>
      body { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; padding: 24px; color: #111827; }
      .chart { margin: 0; }
      .chart-line { white-space: pre; font-size: 14px; line-height: 1.55; margin: 0; font-weight: 500; }
      .chart-line.chord-line { font-weight: 800; }
      .chart-line.empty { line-height: 1.15; }
    </style>
  </head>
  <body>
    <div class="chart">${htmlLines}</div>
  </body>
</html>`);
    printWindow.document.close();
    const printNow = () => {
      printWindow.focus();
      printWindow.print();
    };
    printWindow.onload = printNow;
    window.setTimeout(printNow, 160);
  };
  type MidiNoteEvent = {
    midi: number;
    startTick: number;
    durationTicks: number;
    velocity: number;
    channel: number;
  };
  const clampMidiValue = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, Math.round(value)));
  const encodeVarLen = (value: number): number[] => {
    let buffer = value & 0x7f;
    const out: number[] = [];
    while ((value >>= 7) > 0) {
      buffer <<= 8;
      buffer |= (value & 0x7f) | 0x80;
    }
    while (true) {
      out.push(buffer & 0xff);
      if (buffer & 0x80) {
        buffer >>= 8;
      } else {
        break;
      }
    }
    return out;
  };
  const buildSingleTrackMidi = (
    events: MidiNoteEvent[],
    bpmValue: number
  ): Uint8Array => {
    const ticksPerQuarter = 480;
    const trackData: number[] = [];
    const microsecondsPerQuarter = clampMidiValue(
      Math.floor(60000000 / Math.max(1, bpmValue)),
      1,
      0xffffff
    );
    trackData.push(
      0x00,
      0xff,
      0x51,
      0x03,
      (microsecondsPerQuarter >> 16) & 0xff,
      (microsecondsPerQuarter >> 8) & 0xff,
      microsecondsPerQuarter & 0xff
    );
    const timeline: Array<{
      tick: number;
      type: 'on' | 'off';
      midi: number;
      velocity: number;
      channel: number;
    }> = [];
    events.forEach((event) => {
      const startTick = Math.max(0, event.startTick);
      const endTick = Math.max(startTick + 1, startTick + event.durationTicks);
      timeline.push({
        tick: startTick,
        type: 'on',
        midi: clampMidiValue(event.midi, 0, 127),
        velocity: clampMidiValue(event.velocity, 1, 127),
        channel: clampMidiValue(event.channel, 0, 15),
      });
      timeline.push({
        tick: endTick,
        type: 'off',
        midi: clampMidiValue(event.midi, 0, 127),
        velocity: 0,
        channel: clampMidiValue(event.channel, 0, 15),
      });
    });
    timeline.sort((a, b) => {
      if (a.tick !== b.tick) return a.tick - b.tick;
      if (a.type !== b.type) return a.type === 'off' ? -1 : 1;
      return a.midi - b.midi;
    });
    let previousTick = 0;
    timeline.forEach((event) => {
      const delta = Math.max(0, event.tick - previousTick);
      trackData.push(...encodeVarLen(delta));
      if (event.type === 'on') {
        trackData.push(0x90 | event.channel, event.midi, event.velocity);
      } else {
        trackData.push(0x80 | event.channel, event.midi, 0x00);
      }
      previousTick = event.tick;
    });
    trackData.push(0x00, 0xff, 0x2f, 0x00);
    const header: number[] = [
      0x4d,
      0x54,
      0x68,
      0x64,
      0x00,
      0x00,
      0x00,
      0x06,
      0x00,
      0x00,
      0x00,
      0x01,
      (ticksPerQuarter >> 8) & 0xff,
      ticksPerQuarter & 0xff,
    ];
    const trackHeader: number[] = [
      0x4d,
      0x54,
      0x72,
      0x6b,
      (trackData.length >> 24) & 0xff,
      (trackData.length >> 16) & 0xff,
      (trackData.length >> 8) & 0xff,
      trackData.length & 0xff,
    ];
    return new Uint8Array([...header, ...trackHeader, ...trackData]);
  };
  const downloadBytes = (bytes: Uint8Array, fileName: string) => {
    const blob = new Blob([bytes], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  const handleDownloadDrumsMidi = () => {
    const ticksPerSixteenth = 120;
    const drumPitchBySound: Record<string, number> = {
      dum: 36,
      tak: 38,
      ka: 42,
      slap: 39,
    };
    const events: MidiNoteEvent[] = [];
    let tickCursor = 0;
    parsedRhythm.measures.forEach((measure) => {
      measure.notes.forEach((note) => {
        const sound = note.sound;
        const pitch = drumPitchBySound[sound];
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
    if (events.length === 0) return;
    downloadBytes(buildSingleTrackMidi(events, bpm), 'words-drums.mid');
  };
  const handleDownloadPianoMidi = () => {
    const ticksPerQuarter = 480;
    const events: MidiNoteEvent[] = [];
    let tickCursor = 0;
    parsedRhythm.measures.forEach((measure, measureIndex) => {
      const measureTicks = Math.max(
        ticksPerQuarter,
        measure.notes.reduce(
          (sum, note) => sum + note.durationInSixteenths * 120,
          0
        )
      );
      const chordToken = chordLabelsByMeasure.get(measureIndex) ?? songKey;
      const parsed = chordToken.match(CHORD_PARSE_REGEX);
      if (parsed) {
        const root = parsed[1] ?? 'C';
        const suffix = (parsed[2] ?? '').toLowerCase();
        const qualityBySuffix: Record<string, ChordQuality> = {
          '': 'major',
          m: 'minor',
          dim: 'diminished',
          aug: 'augmented',
          sus2: 'sus2',
          sus4: 'sus4',
          '7': 'dominant7',
          maj7: 'major7',
          m7: 'minor7',
        };
        const quality = qualityBySuffix[suffix];
        if (quality) {
          const chord: TheoryChord = {
            root: `${root[0]?.toUpperCase() ?? 'C'}${root.slice(1)}`,
            quality,
            inversion: 0,
            octave: 4,
          };
          const treble = generateVoicing(
            chord,
            {
              useInversions: false,
              useOpenVoicings: true,
              randomizeOctaves: false,
            },
            'treble'
          );
          const bass = generateVoicing(
            chord,
            {
              useInversions: false,
              useOpenVoicings: false,
              randomizeOctaves: false,
            },
            'bass'
          );
          const sectionStyle = chordStyleByMeasure.get(measureIndex) ?? 'simple';
          const patternHits = getChordHitsForStyle(sectionStyle, timeSignature);
          const secPerBeatEvents = patternHits.length > 0 ? patternHits : [{
            offsetBeats: 0,
            source: 'both' as const,
            durationBeats:
              timeSignature.numerator * (4 / timeSignature.denominator),
          }];
          secPerBeatEvents.forEach((hit) => {
            const hitPitches =
              hit.source === 'bass'
                ? bass.slice(0, 1)
                : hit.source === 'treble'
                  ? treble.slice(0, 4)
                  : [...new Set([...bass.slice(0, 1), ...treble.slice(0, 4)])];
            const startTick = tickCursor + Math.round(hit.offsetBeats * ticksPerQuarter);
            const durationTicks = Math.max(
              60,
              Math.round(hit.durationBeats * ticksPerQuarter * 0.92)
            );
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
      }
      tickCursor += measureTicks;
    });
    if (events.length === 0) return;
    downloadBytes(buildSingleTrackMidi(events, bpm), 'words-piano.mid');
  };

  return (
    <div className="words-page">
      <header className="words-header">
        <h1>Words in Rhythm</h1>
      </header>

      <section
        ref={stickyControlsRef}
        className={`words-sticky-controls${isStickyControlsStuck ? ' is-stuck' : ''}`}
      >
        <div className="words-regenerate-row">
          <button
            className="words-button words-button-primary"
            type="button"
            onClick={() => regenerateBoth(1)}
          >
            randomize rhythm
          </button>
          <button
            ref={generationButtonRef}
            className={`words-button words-gear-button${generationMenuOpen ? ' is-open' : ''}`}
            type="button"
            aria-label="Generation settings"
            onClick={() => {
              setGenerationMenuOpen((previous) => !previous);
              setSoundMenuOpen(false);
            }}
          >
            <span className="material-symbols-outlined">settings</span>
          </button>
          {generationMenuOpen ? (
            <div
              ref={generationMenuRef}
              className="words-dropdown-menu words-dropdown-generation"
            >
              <div className="words-dropdown-header">
                <strong>Generation settings</strong>
                <button
                  className="words-text-button"
                  type="button"
                  onClick={handleResetGenerationSettings}
                >
                  Reset defaults
                </button>
              </div>
              <div className="words-advanced-grid">
                <div className="words-advanced-block">
                  <h3>Song Feel</h3>
                  <label className="words-slider-row">
                    <SettingHelpLabel
                      text="adventurousness"
                      help={GENERATION_SETTING_HELP.adventurousness}
                    />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={generationSettings.adventurousness}
                      onChange={(event) =>
                        updateSetting(
                          'adventurousness',
                          Number(event.target.value)
                        )
                      }
                    />
                    <span>{generationSettings.adventurousness}</span>
                  </label>
                  <label className="words-slider-row">
                    <SettingHelpLabel
                      text="dotted note bias"
                      help={GENERATION_SETTING_HELP.dottedBias}
                    />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={generationSettings.dottedBias}
                      onChange={(event) =>
                        updateSetting('dottedBias', Number(event.target.value))
                      }
                    />
                    <span>{generationSettings.dottedBias}</span>
                  </label>
                  <label className="words-slider-row">
                    <SettingHelpLabel
                      text="sixteenth bias"
                      help={GENERATION_SETTING_HELP.sixteenthBias}
                    />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={generationSettings.sixteenthBias}
                      onChange={(event) =>
                        updateSetting(
                          'sixteenthBias',
                          Number(event.target.value)
                        )
                      }
                    />
                    <span>{generationSettings.sixteenthBias}</span>
                  </label>
                  <label className="words-slider-row">
                    <SettingHelpLabel
                      text="tie crossing bias"
                      help={GENERATION_SETTING_HELP.tieCrossingBias}
                    />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={generationSettings.tieCrossingBias}
                      onChange={(event) =>
                        updateSetting(
                          'tieCrossingBias',
                          Number(event.target.value)
                        )
                      }
                    />
                    <span>{generationSettings.tieCrossingBias}</span>
                  </label>
                </div>

                <div className="words-advanced-block">
                  <h3>Alignment</h3>
                  <label className="words-slider-row">
                    <SettingHelpLabel
                      text="word starts to beats"
                      help={GENERATION_SETTING_HELP.alignWordStartsToBeats}
                    />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={generationSettings.alignWordStartsToBeats}
                      onChange={(event) =>
                        updateSetting(
                          'alignWordStartsToBeats',
                          Number(event.target.value)
                        )
                      }
                    />
                    <span>{generationSettings.alignWordStartsToBeats}</span>
                  </label>
                  <label className="words-slider-row">
                    <SettingHelpLabel
                      text="stress to major beats"
                      help={GENERATION_SETTING_HELP.alignStressToMajorBeats}
                    />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={generationSettings.alignStressToMajorBeats}
                      onChange={(event) =>
                        updateSetting(
                          'alignStressToMajorBeats',
                          Number(event.target.value)
                        )
                      }
                    />
                    <span>{generationSettings.alignStressToMajorBeats}</span>
                  </label>
                  <label className="words-slider-row">
                    <SettingHelpLabel
                      text="motif variation"
                      help={GENERATION_SETTING_HELP.motifVariation}
                    />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={generationSettings.motifVariation}
                      onChange={(event) =>
                        updateSetting(
                          'motifVariation',
                          Number(event.target.value)
                        )
                      }
                    />
                    <span>{generationSettings.motifVariation}</span>
                  </label>
                  <label className="words-slider-row">
                    <SettingHelpLabel
                      text="mid-measure rest bias"
                      help={GENERATION_SETTING_HELP.midMeasureRestBias}
                    />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={generationSettings.midMeasureRestBias}
                      onChange={(event) =>
                        updateSetting(
                          'midMeasureRestBias',
                          Number(event.target.value)
                        )
                      }
                    />
                    <span>{generationSettings.midMeasureRestBias}</span>
                  </label>
                  <label className="words-slider-row">
                    <SettingHelpLabel
                      text="avoid splitting words w/ rests"
                      help={GENERATION_SETTING_HELP.avoidIntraWordRests}
                    />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={generationSettings.avoidIntraWordRests}
                      onChange={(event) =>
                        updateSetting(
                          'avoidIntraWordRests',
                          Number(event.target.value)
                        )
                      }
                    />
                    <span>{generationSettings.avoidIntraWordRests}</span>
                  </label>
                  <label className="words-slider-row">
                    <SettingHelpLabel
                      text="line-break empty-space bias"
                      help={GENERATION_SETTING_HELP.lineBreakGapBias}
                    />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={generationSettings.lineBreakGapBias}
                      onChange={(event) =>
                        updateSetting(
                          'lineBreakGapBias',
                          Number(event.target.value)
                        )
                      }
                    />
                    <span>{generationSettings.lineBreakGapBias}</span>
                  </label>
                </div>

              </div>
            </div>
          ) : null}
        </div>
        <div className="words-playback-row">
          <button
            className="words-button words-button-primary"
            type="button"
            onClick={() => {
              if (isPlaying) {
                stopPlaybackImmediately();
                setActiveSectionLoopId(null);
                return;
              }
              playAllSections();
            }}
          >
            {isPlaying ? 'stop' : 'play'}
          </button>
          <label className="words-inline-control">
            bpm
            <input
              type="number"
              min={40}
              max={220}
              value={bpmInput}
              onChange={(event) => setBpmInput(event.target.value)}
              onBlur={commitBpmInput}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  commitBpmInput();
                }
                if (event.key === 'Escape') {
                  setBpmInput(String(bpm));
                }
              }}
            />
          </label>
          <label className="words-inline-control">
            key
            <select
              value={songKey}
              onChange={(event) => setSongKey(event.target.value as Key)}
            >
              {ALL_KEYS.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </label>
          <label className="words-inline-control">
            meter
            <select
              disabled={true}
              value={`${timeSignature.numerator}/${timeSignature.denominator}`}
              onChange={(event) => {
                const [numerator, denominator] = event.target.value
                  .split('/')
                  .map(Number);
                setTimeSignature({ numerator, denominator });
              }}
            >
              {TIME_SIGNATURE_OPTIONS.map((option) => (
                <option
                  key={`${option.numerator}/${option.denominator}`}
                  value={`${option.numerator}/${option.denominator}`}
                >
                  {option.numerator}/{option.denominator}
                </option>
              ))}
            </select>
          </label>
          <label className="word-rhythm-toggle">
            <input
              type="checkbox"
              checked={metronomeEnabled}
              onChange={(event) => {
                setMetronomeEnabled(event.target.checked);
                handleMetronomeToggle(event.target.checked);
              }}
            />
            metronome
          </label>
          <button
            ref={soundButtonRef}
            className={`words-button words-gear-button${soundMenuOpen ? ' is-open' : ''}`}
            type="button"
            aria-label="Sound settings"
            onClick={() => {
              setSoundMenuOpen((previous) => !previous);
              setGenerationMenuOpen(false);
            }}
          >
            <span className="material-symbols-outlined">tune</span>
          </button>
          {soundMenuOpen ? (
            <div
              ref={soundMenuRef}
              className="words-dropdown-menu words-dropdown-sound"
            >
              <div className="words-dropdown-header">
                <strong>Sound settings</strong>
              </div>
              <label className="words-slider-row">
                drums volume
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={drumsVolume}
                  onChange={(event) =>
                    setDrumsVolume(Number(event.target.value))
                  }
                />
                <span>{drumsVolume}</span>
              </label>
              <label className="words-slider-row">
                playback volume
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={playbackSettings.nonAccentVolume}
                  onChange={(event) =>
                    setPlaybackSettings((previous) => ({
                      ...previous,
                      nonAccentVolume: Number(event.target.value),
                    }))
                  }
                />
                <span>{playbackSettings.nonAccentVolume}</span>
              </label>
              <label className="words-slider-row">
                accent volume
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={playbackSettings.measureAccentVolume}
                  onChange={(event) =>
                    setPlaybackSettings((previous) => ({
                      ...previous,
                      measureAccentVolume: Number(event.target.value),
                      beatGroupAccentVolume: Math.min(
                        Number(event.target.value),
                        previous.beatGroupAccentVolume
                      ),
                    }))
                  }
                />
                <span>{playbackSettings.measureAccentVolume}</span>
              </label>
              <label className="words-slider-row">
                metronome volume
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={playbackSettings.metronomeVolume}
                  onChange={(event) =>
                    setPlaybackSettings((previous) => ({
                      ...previous,
                      metronomeVolume: Number(event.target.value),
                    }))
                  }
                />
                <span>{playbackSettings.metronomeVolume}</span>
              </label>
              <div className="words-chord-settings">
                <label className="words-slider-row">
                  chord sound
                  <select
                    className="words-select-inline"
                    value={chordSoundType}
                    onChange={(event) =>
                      setChordSoundType(event.target.value as SoundType)
                    }
                  >
                    {SOUND_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <span />
                </label>
                {chordSoundType === 'piano-sampled' ? (
                  <div className="words-sample-load">
                    <div className="words-sample-load-label">
                      {sampledPianoLoad.ready
                        ? 'sampled piano ready'
                        : sampledPianoLoad.loading
                          ? 'loading sampled piano...'
                          : 'sampled piano not loaded'}
                    </div>
                    <div className="words-sample-load-track">
                      <div
                        className="words-sample-load-fill"
                        style={{
                          width: `${
                            sampledPianoLoad.total > 0
                              ? (sampledPianoLoad.loaded /
                                  sampledPianoLoad.total) *
                                100
                              : sampledPianoLoad.ready
                                ? 100
                                : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ) : null}
                <label className="words-slider-row">
                  chord volume
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={chordVolume}
                    onChange={(event) =>
                      setChordVolume(Number(event.target.value))
                    }
                  />
                  <span>{chordVolume}</span>
                </label>
              </div>
              <label className="word-rhythm-toggle words-toggle-inline">
                <input
                  type="checkbox"
                  checked={autoFollowPlayback}
                  onChange={(event) =>
                    setAutoFollowPlayback(event.target.checked)
                  }
                />
                auto-follow playback
              </label>
            </div>
          ) : null}
        </div>
      </section>

      <section className="words-main-grid">
        <article ref={sectionsColumnRef} className="words-sections-column">
          <div className="words-sections-list">
            {sections.map((section, index) => {
              const effectiveSection = effectiveSections[index] ?? {
                ...section,
                effectiveLyrics: section.lyrics,
                effectiveTemplateNotation: section.templateNotation,
                effectiveTemplateBias: section.templateBias,
              };
              const effectiveLyrics = effectiveSection.effectiveLyrics;
              const sectionDisplayName = sectionDisplayNames[index] ?? 'Section';
              return (
                <div
                  key={section.id}
                  className={`words-section-card${
                    openSectionSettingsId === section.id ? ' is-settings-open' : ''
                  }`}
                >
                  <div className="words-section-head">
                    <select
                      className="words-select-inline words-section-type-select"
                      value={section.type}
                      onChange={(event) => {
                        const nextType = event.target.value as SongSectionType;
                        updateSection(section.id, (previousSection) => ({
                          ...previousSection,
                          type: nextType,
                          linkedToPreviousChorusLyrics:
                            nextType === 'chorus' ? true : false,
                          linkedToPreviousChorusTemplate:
                            nextType === 'chorus' ? true : false,
                        }));
                      }}
                      aria-label="Section type"
                    >
                      <option value="verse">{sectionDisplayName.includes('Verse') ? sectionDisplayName : 'Verse'}</option>
                      <option value="chorus">{sectionDisplayName.includes('Chorus') ? sectionDisplayName : 'Chorus'}</option>
                      <option value="bridge">{sectionDisplayName.includes('Bridge') ? sectionDisplayName : 'Bridge'}</option>
                    </select>
                    {section.type === 'chorus' ? (
                      <button
                        type="button"
                        className={`words-button words-button-icon words-link-toggle words-icon-tooltip${
                          section.linkedToPreviousChorusLyrics
                            ? ' is-linked'
                            : ' is-unlinked'
                        }`}
                        onClick={() =>
                          updateSection(section.id, (previousSection) => {
                            return {
                              ...previousSection,
                              linkedToPreviousChorusLyrics:
                                !previousSection.linkedToPreviousChorusLyrics,
                            };
                          })
                        }
                        aria-label="Toggle chorus lyrics linking"
                        data-tooltip={
                          section.linkedToPreviousChorusLyrics
                            ? 'Chorus lyrics are linked. Click to unlink lyrics for this chorus.'
                            : 'Chorus lyrics are unlinked. Click to relink lyrics for this chorus.'
                        }
                      >
                        <span className="material-symbols-outlined">
                          {section.linkedToPreviousChorusLyrics ? 'link' : 'link_off'}
                        </span>
                      </button>
                    ) : null}
                    <div className="words-section-actions-inline">
                      <div
                        className={`words-section-settings-anchor${
                          openSectionSettingsId === section.id ? ' is-open' : ''
                        }`}
                        ref={(element) => {
                          if (element) {
                            sectionSettingsAnchorRefs.current.set(section.id, element);
                          } else {
                            sectionSettingsAnchorRefs.current.delete(section.id);
                          }
                        }}
                      >
                        <button
                          type="button"
                          className={`words-button words-button-icon words-icon-tooltip${
                            openSectionSettingsId === section.id ? ' is-open' : ''
                          }`}
                          onClick={() =>
                            setOpenSectionSettingsId((previous) => {
                              setGenerationMenuOpen(false);
                              setSoundMenuOpen(false);
                              setExportMenuOpen(false);
                              return previous === section.id ? null : section.id;
                            })
                          }
                          aria-label={`${sectionDisplayName} settings`}
                          data-tooltip="Section settings"
                        >
                          <span className="material-symbols-outlined">
                            settings
                          </span>
                        </button>
                        {openSectionSettingsId === section.id ? (
                          typeof document !== 'undefined' && sectionSettingsPosition
                            ? createPortal(
                                <div
                                  ref={sectionSettingsMenuRef}
                                  className="words-dropdown-menu words-dropdown-section words-section-settings-menu words-section-settings-menu-portal"
                                  style={{
                                    position: 'fixed',
                                    top: `${sectionSettingsPosition.top}px`,
                                    left: `${sectionSettingsPosition.left}px`,
                                    width: `${sectionSettingsPosition.width}px`,
                                    maxHeight: `${sectionSettingsPosition.maxHeight}px`,
                                  }}
                                >
                            <div className="words-dropdown-header">
                              <strong>Section settings</strong>
                            </div>
                            <label className="words-slider-row words-chord-row">
                              section chords
                              <div className="words-chord-input-with-action">
                                <input
                                  type="text"
                                  value={section.chordProgressionInput}
                                  onChange={(event) =>
                                    setSectionChordProgression(
                                      section.id,
                                      event.target.value
                                    )
                                  }
                                  placeholder="I–V–vi–IV or C–G–Am–F"
                                />
                                <button
                                  className="words-button words-button-icon words-icon-tooltip"
                                  type="button"
                                  onClick={() =>
                                    randomizeChordProgression(section.id)
                                  }
                                  data-tooltip="Randomize section chords"
                                  aria-label="Randomize section chords"
                                >
                                  <span className="material-symbols-outlined">
                                    casino
                                  </span>
                                </button>
                              </div>
                            </label>
                            <label className="words-slider-row words-chord-row">
                              chord style
                              <select
                                className="words-select-inline"
                                value={section.chordStyleId}
                                onChange={(event) =>
                                  updateSection(section.id, (previousSection) => ({
                                    ...previousSection,
                                    chordStyleId: event.target.value as ChordStyleId,
                                  }))
                                }
                              >
                                {CHORD_STYLE_OPTIONS.map((option) => (
                                  <option key={option.id} value={option.id}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            {section.type === 'chorus' ? (
                              <div className="words-chorus-link-controls">
                                <strong>chorus linking</strong>
                                <div className="words-chorus-link-row">
                                  <button
                                    type="button"
                                    className={`words-button words-button-icon words-link-toggle words-icon-tooltip${
                                      section.linkedToPreviousChorusLyrics
                                        ? ' is-linked'
                                        : ' is-unlinked'
                                    }`}
                                    onClick={() =>
                                      updateSection(
                                        section.id,
                                        (previousSection) => ({
                                          ...previousSection,
                                          linkedToPreviousChorusLyrics:
                                            !previousSection.linkedToPreviousChorusLyrics,
                                        })
                                      )
                                    }
                                    data-tooltip={
                                      section.linkedToPreviousChorusLyrics
                                        ? 'Lyrics are linked: editing one linked chorus updates all linked chorus lyrics.'
                                        : 'Lyrics are unlinked: this chorus keeps its own lyrics.'
                                    }
                                    aria-label="Toggle chorus lyrics linking"
                                  >
                                    <span className="material-symbols-outlined">
                                      {section.linkedToPreviousChorusLyrics
                                        ? 'link'
                                        : 'link_off'}
                                    </span>
                                  </button>
                                  <span>lyrics link</span>
                                </div>
                                <div className="words-chorus-link-row">
                                  <button
                                    type="button"
                                    className={`words-button words-button-icon words-link-toggle words-icon-tooltip${
                                      section.linkedToPreviousChorusTemplate
                                        ? ' is-linked'
                                        : ' is-unlinked'
                                    }`}
                                    onClick={() =>
                                      updateSection(
                                        section.id,
                                        (previousSection) => ({
                                          ...previousSection,
                                          linkedToPreviousChorusTemplate:
                                            !previousSection.linkedToPreviousChorusTemplate,
                                        })
                                      )
                                    }
                                    data-tooltip={
                                      section.linkedToPreviousChorusTemplate
                                        ? 'Rhythm template and template influence are linked across linked choruses.'
                                        : 'Rhythm template and influence are unlinked for this chorus.'
                                    }
                                    aria-label="Toggle chorus rhythm template linking"
                                  >
                                    <span className="material-symbols-outlined">
                                      {section.linkedToPreviousChorusTemplate
                                        ? 'link'
                                        : 'link_off'}
                                    </span>
                                  </button>
                                  <span>template link</span>
                                </div>
                              </div>
                            ) : null}
                            <label className="words-slider-row words-chord-row">
                              rhythm template
                              <div className="words-template-input-only">
                                <input
                                  type="text"
                                  value={section.templateNotation}
                                  onChange={(event) =>
                                    updateSectionTemplateNotation(
                                      section.id,
                                      event.target.value
                                    )
                                  }
                                  placeholder="D---T---D-D-T---"
                                />
                              </div>
                            </label>
                            <div className="words-section-template-presets">
                              {TEMPLATE_PRESETS.map((preset) => (
                                <button
                                  key={`${section.id}-${preset.label}`}
                                  type="button"
                                  className={`words-button words-button-template${
                                    section.templateNotation === preset.notation
                                      ? ' is-active'
                                      : ''
                                  }`}
                                  onClick={() =>
                                    updateSectionTemplateNotation(
                                      section.id,
                                      preset.notation
                                    )
                                  }
                                >
                                  {preset.label}
                                </button>
                              ))}
                            </div>
                            {sectionTemplatePreviewById.get(section.id)?.isValid &&
                            (sectionTemplatePreviewById.get(section.id)?.measures
                              .length ?? 0) > 0 ? (
                              <div className="words-template-preview words-section-template-preview">
                                <DrumNotationMini
                                  rhythm={sectionTemplatePreviewById.get(section.id)!}
                                  width={320}
                                  style="light"
                                  showDrumSymbols={true}
                                  drumSymbolScale={0.52}
                                />
                              </div>
                            ) : (
                              <p className="words-template-error">
                                Section template notation is invalid for this
                                meter.
                              </p>
                            )}
                            <a
                              className="words-template-edit-link"
                              href={getDarbukaTemplateEditUrl(
                                section.templateNotation ||
                                  APP_DEFAULT_GENERATION_SETTINGS
                                    .templateNotation ||
                                  TEMPLATE_PRESETS[0].notation
                              )}
                              target="_blank"
                              rel="noreferrer noopener"
                            >
                              Edit in Darbuka Trainer
                            </a>
                            <label className="words-slider-row">
                              template influence
                              <input
                                type="range"
                                min={0}
                                max={100}
                                value={section.templateBias}
                                onChange={(event) =>
                                  updateSectionTemplateBias(
                                    section.id,
                                    Number(event.target.value)
                                  )
                                }
                              />
                              <span>{section.templateBias}</span>
                            </label>
                                </div>,
                                document.body
                              )
                            : null
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className={
                          isPlaying && activeSectionLoopId === section.id
                            ? 'words-button words-button-primary words-section-loop-button words-icon-tooltip'
                            : 'words-button words-button-icon words-icon-tooltip'
                        }
                        onClick={() => {
                          if (isPlaying && activeSectionLoopId === section.id) {
                            stopPlaybackImmediately();
                            setActiveSectionLoopId(null);
                            return;
                          }
                          playSectionLoop(section.id, index);
                        }}
                        data-tooltip={
                          isPlaying && activeSectionLoopId === section.id
                            ? 'Pause section loop'
                            : 'Play this section in a loop'
                        }
                        aria-label={`${
                          isPlaying && activeSectionLoopId === section.id
                            ? 'Pause'
                            : 'Play'
                        } ${sectionDisplayName} section loop`}
                      >
                        {isPlaying && activeSectionLoopId === section.id ? (
                          <>
                            <span className="material-symbols-outlined">pause</span>
                            pause
                          </>
                        ) : (
                          <span className="material-symbols-outlined">
                            play_arrow
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        className="words-button words-button-icon words-icon-tooltip"
                        onClick={() => regenerateSection(section.id)}
                        data-tooltip="Randomize rhythm for this section only"
                        aria-label={`Randomize ${sectionDisplayName} rhythm`}
                      >
                        <span className="material-symbols-outlined">casino</span>
                      </button>
                      <button
                        type="button"
                        className="words-button words-button-icon words-icon-tooltip"
                        onClick={() => scrollSectionIntoNotationView(section.id)}
                        data-tooltip="Show this section in notation"
                        aria-label={`Show ${sectionDisplayName} in notation`}
                      >
                        <span className="material-symbols-outlined">visibility</span>
                      </button>
                      <button
                        type="button"
                        className="words-button words-button-icon words-icon-tooltip"
                        onClick={() => moveSection(section.id, -1)}
                        aria-label={`Move ${sectionDisplayName} up`}
                        data-tooltip="Move section up"
                      >
                        <span className="material-symbols-outlined">arrow_upward</span>
                      </button>
                      <button
                        type="button"
                        className="words-button words-button-icon words-icon-tooltip"
                        onClick={() => moveSection(section.id, 1)}
                        aria-label={`Move ${sectionDisplayName} down`}
                        data-tooltip="Move section down"
                      >
                        <span className="material-symbols-outlined">arrow_downward</span>
                      </button>
                      <button
                        type="button"
                        className="words-button words-button-icon words-button-danger words-icon-tooltip"
                        onClick={() => removeSection(section.id)}
                        aria-label={`Remove ${sectionDisplayName}`}
                        data-tooltip="Delete section"
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </div>
                  <textarea
                    className="words-textarea words-section-textarea"
                    rows={4}
                    value={effectiveLyrics}
                    onChange={(event) => {
                      updateSectionLyrics(section.id, event.target.value);
                    }}
                    placeholder="Type words or lyrics..."
                  />
                </div>
              );
            })}
          </div>
          <div className="words-section-add-row">
            <button
              className="words-button words-button-add"
              type="button"
              onClick={() => addSection('verse')}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                add
              </span>
              verse
            </button>
            <button
              className="words-button words-button-add"
              type="button"
              onClick={() => addSection('chorus')}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                add
              </span>
              chorus
            </button>
            <button
              className="words-button words-button-add"
              type="button"
              onClick={() => addSection('bridge')}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                add
              </span>
              bridge
            </button>
          </div>
        </article>

        <article className="words-rhythm-card" ref={notationScrollRef}>
          <div className="words-score-actions">
            <div className="words-score-stats">
              <span>{scoreMeasureCount} measures</span>
              <span>~{estimatedSongDuration}</span>
            </div>
            <div className="words-score-zoom">
              <button
                className="words-button words-button-icon"
                type="button"
                onClick={() => setScoreZoom((previous) => Math.max(0.75, previous - 0.1))}
                aria-label="Zoom out notation"
              >
                <span className="material-symbols-outlined">remove</span>
              </button>
              <span>{Math.round(scoreZoom * 100)}%</span>
              <button
                className="words-button words-button-icon"
                type="button"
                onClick={() => setScoreZoom((previous) => Math.min(1.75, previous + 0.1))}
                aria-label="Zoom in notation"
              >
                <span className="material-symbols-outlined">add</span>
              </button>
            </div>
            <button
              ref={exportButtonRef}
              className="words-button"
              type="button"
              onClick={() => setExportMenuOpen((previous) => !previous)}
            >
              export song
            </button>
            {exportMenuOpen ? (
              <div ref={exportMenuRef} className="words-dropdown-menu words-export-menu">
                <button
                  className="words-button words-export-option"
                  type="button"
                  onClick={() => {
                    void copyText(lyricsExportText);
                    setExportMenuOpen(false);
                  }}
                >
                  Copy lyrics
                </button>
                <button
                  className="words-button words-export-option"
                  type="button"
                  onClick={() => {
                    void copyText(asciiChordChartExportText);
                    setExportMenuOpen(false);
                  }}
                >
                  Copy ASCII chord chart
                </button>
                <button
                  className="words-button words-export-option"
                  type="button"
                  onClick={() => {
                    handleDownloadChordChartPdf();
                    setExportMenuOpen(false);
                  }}
                >
                  Download chord chart PDF
                </button>
                <button
                  className="words-button words-export-option"
                  type="button"
                  onClick={() => {
                    handleDownloadPianoMidi();
                    setExportMenuOpen(false);
                  }}
                >
                  Download piano MIDI
                </button>
                <button
                  className="words-button words-export-option"
                  type="button"
                  onClick={() => {
                    handleDownloadDrumsMidi();
                    setExportMenuOpen(false);
                  }}
                >
                  Download drums MIDI
                </button>
              </div>
            ) : null}
          </div>
          <div className="words-notation-sections">
            {notationSectionBlocks.map((block) => (
              <section
                key={block.id}
                className="words-notation-section"
                ref={(element) => {
                  if (element) notationSectionRefs.current.set(block.id, element);
                  else notationSectionRefs.current.delete(block.id);
                }}
              >
                <h3 className="words-notation-section-title">{block.title}</h3>
                <VexLyricScore
                  rhythm={block.rhythm}
                  timeSignature={timeSignature}
                  chordKey={songKey}
                  measureNumberOffset={block.measureNumberOffset}
                  showMeasureNumbers={block.showMeasureNumbers}
                  currentNote={block.localCurrentNote}
                  currentMetronomeBeat={block.localCurrentMetronomeBeat}
                  metronomeEnabled={metronomeEnabled}
                  chordLabelsByMeasure={block.localChordLabelsByMeasure}
                  chordStyleByMeasure={block.localChordStyleByMeasure}
                  activeChordMeasure={block.localActiveChordMeasure}
                  sectionMarkers={[]}
                  hitMap={block.localHitMap}
                  autoFollowPlayback={autoFollowPlayback}
                  isPlaying={isPlaying}
                  zoomLevel={scoreZoom}
                />
              </section>
            ))}
          </div>

          <div className="word-rhythm-output">
            <strong>Notation:</strong> <code>{notation || '(empty)'}</code>{' '}
            <a
              className="words-edit-link"
              href={darbukaEditUrl}
              target="_blank"
              rel="noreferrer noopener"
            >
              Edit in Darbuka Trainer
            </a>
          </div>
        </article>
      </section>
    </div>
  );
};

export default App;
