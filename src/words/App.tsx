import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Popover from '@mui/material/Popover';
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
import { AudioPlayer } from '../shared/audio/audioPlayer';
import { SOUND_OPTIONS, type SoundType } from '../shared/music/soundOptions';
import {
  CHORD_STYLE_OPTIONS,
  type ChordStyleId,
} from '../piano/data/chordExercises';
import { generateVoicing } from '../shared/music/chordVoicing';
import type { Chord as TheoryChord, ChordQuality, Key } from '../shared/music/chordTypes';
import { ALL_KEYS } from '../shared/music/randomization';
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
  getChordHitsForStyle,
} from '../shared/music/chordStyleHits';
import {
  createDefaultSection,
  findPreviousChorus,
  type SongSection,
  type SongSectionType,
} from '../shared/music/songSections';
import {
  looksLikeFullSongLyrics,
  type ParsedLyricSectionDraft,
} from '../shared/music/lyricSectionParser';
import {
  subscribeToPopState,
  syncUrlWithHistory,
  type UrlRoutingHistoryState,
} from '../shared/utils/urlRouting';
import { parseOptionalNumberParam } from '../shared/utils/urlParams';
import { LyricImportModal } from './components/LyricImportModal';
import { getNotationScrollContainer } from './utils/scrollOwner';
import { getRhythmTemplatePresets } from '../shared/rhythm/presetDatabase';
import MetronomeToggleButton from '../shared/components/MetronomeToggleButton';
import DiceIcon from '../shared/components/DiceIcon';
import AppTooltip from '../shared/components/AppTooltip';
import AppSlider from '../shared/components/AppSlider';
import BpmInput from '../shared/components/music/BpmInput';
import ChordProgressionInput from '../shared/components/music/ChordProgressionInput';
import ChordStyleInput from '../shared/components/music/ChordStyleInput';
import SharedExportPopover from '../shared/components/music/SharedExportPopover';
import { createWordsExportAdapter } from './utils/exportAdapter';
import KeyInput from '../shared/components/music/KeyInput';
import dumSound from '../drums/assets/sounds/dum.wav';
import takSound from '../drums/assets/sounds/tak.wav';
import kaSound from '../drums/assets/sounds/ka.wav';
import slapSound from '../drums/assets/sounds/slap2.wav';

const DEFAULT_LYRICS = `Sunrise on the shoreline
Ocean wind through palm trees`;

const DEFAULT_TIME_SIGNATURE: TimeSignature = {
  numerator: 4,
  denominator: 4,
};

const TIME_SIGNATURE_OPTIONS: Array<
  Pick<TimeSignature, 'numerator' | 'denominator'>
> = [{ numerator: 4, denominator: 4 }];

const TEMPLATE_PRESETS = getRhythmTemplatePresets(DEFAULT_TIME_SIGNATURE).map(
  (preset) => ({
    label: preset.label,
    notation: preset.notation,
  })
);
type RandomizeMode = 'phrasing' | 'groove' | 'chords' | 'everything';
const RANDOMIZE_MODE_OPTIONS: Array<{
  mode: RandomizeMode;
  label: string;
  tooltip: string;
}> = [
  {
    mode: 'phrasing',
    label: 'Phrasing',
    tooltip: 'Rerolls rhythms and articulation while preserving section templates.',
  },
  {
    mode: 'groove',
    label: 'Groove',
    tooltip: 'Rerolls phrasing and also randomizes rhythm templates.',
  },
  {
    mode: 'chords',
    label: 'Chords',
    tooltip: 'Randomizes chord progressions while keeping current grooves.',
  },
  {
    mode: 'everything',
    label: 'Everything',
    tooltip: 'Randomizes phrasing, grooves, chords, key, style, and tempo.',
  },
];
const BACKING_FALLBACK_TEMPLATE = 'D---D---D---D---';
const DRUM_SOUNDS = {
  dum: dumSound,
  tak: takSound,
  ka: kaSound,
  slap: slapSound,
} as const;

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T;
}

function clampBpm(value: number): number {
  return Math.max(40, Math.min(220, value));
}

function getViewportMetrics(): { width: number; height: number } {
  const vv = window.visualViewport;
  if (vv) {
    return { width: vv.width, height: vv.height };
  }
  return { width: window.innerWidth, height: window.innerHeight };
}

function generateRandomTemplateNotation(): string {
  const anchors: Array<'D' | 'T' | 'K'> = ['D', 'T', 'K'];
  const notes = Array.from({ length: 16 }, () => '-');
  notes[0] = 'D';
  notes[8] = 'D';
  for (let i = 0; i < notes.length; i += 1) {
    if (notes[i] !== '-') continue;
    const roll = Math.random();
    if (roll < 0.24) {
      notes[i] = pickRandom(anchors);
    } else if (roll < 0.3) {
      notes[i] = '_';
    }
  }
  if (notes.every((token) => token === '-')) notes[0] = 'D';
  return notes.join('');
}

function getTemplateSyncopationScore(notation: string): number {
  const compact = notation.replace(/\s+/g, '');
  const length = compact.length > 0 ? compact.length : 16;
  let score = 0;
  for (let index = 0; index < compact.length; index += 1) {
    const token = compact[index];
    if (!token || token === '-' || token === '_') continue;
    const onQuarter = index % 4 === 0;
    const onEighth = index % 2 === 0;
    if (!onQuarter) score += 2;
    else if (!onEighth) score += 1;
  }
  return score / Math.max(1, length);
}

function getNoteSoundAtSixteenth(
  notes: Array<{ durationInSixteenths: number; sound: string }>,
  sixteenthOffset: number
): string | null {
  let cursor = 0;
  for (const note of notes) {
    if (cursor === sixteenthOffset) {
      return note.sound;
    }
    cursor += note.durationInSixteenths;
  }
  return null;
}

function volumeIconName(isMuted: boolean): string {
  return isMuted ? 'volume_off' : 'volume_up';
}

const APP_DEFAULT_GENERATION_SETTINGS: WordRhythmAdvancedSettings = {
  ...DEFAULT_WORD_RHYTHM_SETTINGS,
  templateBias: 80,
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
const URL_PARAM_PATTERN_B64 = 'pat64';
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

function normalizeSection(section: SongSection): SongSection {
  return {
    ...section,
    isLocked: section.isLocked ?? false,
  };
}

function normalizeSectionsSnapshot(sections: SongSection[]): SongSection[] {
  return sections.map(normalizeSection);
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
  templateBias:
    'How strongly generation follows the selected template groove. Higher values make regeneration change less.',
} satisfies Record<string, string>;

const SettingHelpLabel: React.FC<{ text: string; help: string }> = ({
  text,
  help,
}) => (
  <span className="words-setting-label">
    {text}
    <AppTooltip title={help}>
      <button
        className="words-setting-help"
        type="button"
        tabIndex={-1}
        aria-label={`${text} help`}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          info
        </span>
      </button>
    </AppTooltip>
  </span>
);

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
  const [debouncedBpm, setDebouncedBpm] = useState<number>(100);
  const [metronomeEnabled, setMetronomeEnabled] = useState<boolean>(true);
  const [autoFollowPlayback, setAutoFollowPlayback] = useState<boolean>(true);
  const [generationMenuOpen, setGenerationMenuOpen] = useState<boolean>(false);
  const [soundMenuOpen, setSoundMenuOpen] = useState<boolean>(false);
  const [randomizeMenuOpen, setRandomizeMenuOpen] = useState<boolean>(false);
  const [sectionRandomizeMenuId, setSectionRandomizeMenuId] = useState<
    string | null
  >(null);
  const [songKey, setSongKey] = useState<Key>(DEFAULT_SONG_KEY);
  const [drumsVolume, setDrumsVolume] = useState<number>(100);
  const [masterVolume, setMasterVolume] = useState<number>(100);
  const [masterMuted, setMasterMuted] = useState<boolean>(false);
  const [drumsMuted, setDrumsMuted] = useState<boolean>(false);
  const [accentMuted, setAccentMuted] = useState<boolean>(false);
  const [metronomeMuted, setMetronomeMuted] = useState<boolean>(false);
  const [chordSoundType, setChordSoundType] = useState<SoundType>('piano');
  const [chordVolume, setChordVolume] = useState<number>(58);
  const [chordMuted, setChordMuted] = useState<boolean>(false);
  const [backingBeatEnabled, setBackingBeatEnabled] = useState<boolean>(false);
  const [backingBeatUseTemplate, setBackingBeatUseTemplate] =
    useState<boolean>(true);
  const [backingBeatNotation, setBackingBeatNotation] = useState<string>(
    BACKING_FALLBACK_TEMPLATE
  );
  const [backingBeatVolume, setBackingBeatVolume] = useState<number>(42);
  const [backingBeatMuted, setBackingBeatMuted] = useState<boolean>(false);
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
  const [isScoreActionsStuck, setIsScoreActionsStuck] = useState<boolean>(false);
  const [openSectionSettingsId, setOpenSectionSettingsId] = useState<
    string | null
  >(null);
  const [exportMenuOpen, setExportMenuOpen] = useState<boolean>(false);
  const [sharedExportOpen, setSharedExportOpen] = useState<boolean>(false);
  const [scoreZoom, setScoreZoom] = useState<number>(1);
  const [lyricImportOpen, setLyricImportOpen] = useState<boolean>(false);
  const [lyricImportText, setLyricImportText] = useState<string>('');
  const [playbackSelectionRange, setPlaybackSelectionRange] = useState<{
    startTick: number;
    endTick: number;
  } | null>(null);
  const [activeSectionLoopId, setActiveSectionLoopId] = useState<string | null>(
    null
  );
  const [pendingPlaybackStartMode, setPendingPlaybackStartMode] = useState<
    'all' | 'section' | null
  >(null);
  const [sectionSettingsPosition, setSectionSettingsPosition] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const stickyControlsRef = useRef<HTMLElement | null>(null);
  const scoreActionsRef = useRef<HTMLDivElement | null>(null);
  const generationMenuRef = useRef<HTMLDivElement | null>(null);
  const generationButtonRef = useRef<HTMLButtonElement | null>(null);
  const soundMenuRef = useRef<HTMLDivElement | null>(null);
  const soundButtonRef = useRef<HTMLButtonElement | null>(null);
  const randomizeButtonRef = useRef<HTMLButtonElement | null>(null);
  const exportButtonRef = useRef<HTMLButtonElement | null>(null);
  const sectionRandomizeAnchorRefs = useRef<Map<string, HTMLDivElement>>(
    new Map()
  );
  const sectionRandomizeMenuRef = useRef<HTMLDivElement | null>(null);
  const sectionSettingsAnchorRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const sectionSettingsMenuRef = useRef<HTMLDivElement | null>(null);
  const sectionsColumnRef = useRef<HTMLElement | null>(null);
  const notationScrollRef = useRef<HTMLElement | null>(null);
  const notationSectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const chordAudioContextRef = useRef<AudioContext | null>(null);
  const backingAudioPlayerRef = useRef<AudioPlayer | null>(null);
  const lastBackingTriggerRef = useRef<string | null>(null);
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
        const next = normalizeSectionsSnapshot(transform(previous));
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
      output.push({
        ...section,
        effectiveLyrics: inheritedLyrics,
        effectiveTemplateNotation:
          inheritedTemplateNotation ||
          APP_DEFAULT_GENERATION_SETTINGS.templateNotation ||
          '',
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
  const backingPatternRhythm = useMemo(() => {
    if (!backingBeatEnabled) return null;
    if (!backingBeatUseTemplate) {
      const parsed = parseRhythm(backingBeatNotation || BACKING_FALLBACK_TEMPLATE, timeSignature);
      return parsed.isValid && parsed.measures.length > 0 ? parsed : null;
    }
    const sourceTemplate =
      effectiveSections[0]?.effectiveTemplateNotation ||
      TEMPLATE_PRESETS[0]?.notation ||
      BACKING_FALLBACK_TEMPLATE;
    const parsed = parseRhythm(sourceTemplate, timeSignature);
    return parsed.isValid && parsed.measures.length > 0 ? parsed : null;
  }, [
    backingBeatEnabled,
    backingBeatUseTemplate,
    backingBeatNotation,
    timeSignature,
    effectiveSections,
  ]);
  const backingTemplateMeasureMap = useMemo(() => {
    const map = new Map<number, Array<{ durationInSixteenths: number; sound: string }>>();
    if (!backingBeatEnabled || !backingBeatUseTemplate) return map;
    sectionRenderPlans.forEach((plan) => {
      const parsed = parseRhythm(
        plan.section.effectiveTemplateNotation || BACKING_FALLBACK_TEMPLATE,
        timeSignature
      );
      if (!parsed.isValid || parsed.measures.length === 0) return;
      for (let localOffset = 0; localOffset < plan.totalMeasureCount; localOffset += 1) {
        const templateMeasure =
          parsed.measures[localOffset % parsed.measures.length];
        map.set(plan.startMeasure + localOffset, templateMeasure.notes);
      }
    });
    return map;
  }, [
    backingBeatEnabled,
    backingBeatUseTemplate,
    sectionRenderPlans,
    timeSignature,
  ]);

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
  const exportAdapter = useMemo(() => createWordsExportAdapter({
    parsedRhythm,
    bpm,
    songKey,
    timeSignature,
    chordLabelsByMeasure,
    chordStyleByMeasure,
  }), [
    parsedRhythm,
    bpm,
    songKey,
    timeSignature,
    chordLabelsByMeasure,
    chordStyleByMeasure,
  ]);
  const effectivePlaybackSettings = useMemo(() => {
    const masterScale =
      masterMuted ? 0 : Math.max(0, Math.min(100, masterVolume)) / 100;
    const drumsScale =
      (drumsMuted ? 0 : Math.max(0, Math.min(100, drumsVolume)) / 100) *
      masterScale;
    const accentScale = accentMuted ? 0 : 1;
    const metronomeScale = metronomeMuted ? 0 : masterScale;
    return {
      ...playbackSettings,
      nonAccentVolume: Math.round(playbackSettings.nonAccentVolume * drumsScale),
      beatGroupAccentVolume: Math.round(
        playbackSettings.beatGroupAccentVolume * drumsScale * accentScale
      ),
      measureAccentVolume: Math.round(
        playbackSettings.measureAccentVolume * drumsScale * accentScale
      ),
      metronomeVolume: Math.round(playbackSettings.metronomeVolume * metronomeScale),
    };
  }, [
    playbackSettings,
    drumsVolume,
    drumsMuted,
    accentMuted,
    metronomeMuted,
    masterVolume,
    masterMuted,
  ]);
  const effectiveChordVolume = useMemo(() => {
    const masterScale =
      masterMuted ? 0 : Math.max(0, Math.min(100, masterVolume)) / 100;
    const chordScale = chordMuted ? 0 : Math.max(0, Math.min(100, chordVolume)) / 100;
    return Math.max(0, Math.min(1, chordScale * masterScale));
  }, [chordVolume, chordMuted, masterVolume, masterMuted]);
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
    metronomeResolution: 'beat',
  });
  const activeChordMeasure =
    isPlaying && chordLabelsByMeasure.size > 0 && currentNote
      ? currentNote.measureIndex
      : null;
  const stopPlaybackImmediately = useCallback(() => {
    handleStop();
    chordInstrumentRef.current?.stopAll(0);
    if (chordInstrumentRef.current) {
      chordInstrumentRef.current.disconnect();
    }
    chordInstrumentRef.current = null;
    chordInstrumentTypeRef.current = null;
  }, [handleStop]);

  useEffect(() => {
    const player = new AudioPlayer({
      soundUrls: DRUM_SOUNDS,
      enableReverb: false,
    });
    void player.initialize().then(() => {
      backingAudioPlayerRef.current = player;
    });
    return () => {
      player.destroy();
      backingAudioPlayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (
      !isPlaying ||
      !backingBeatEnabled ||
      !currentMetronomeBeat ||
      !backingPatternRhythm
    ) {
      lastBackingTriggerRef.current = null;
      return;
    }
    const triggerKey = `${currentMetronomeBeat.measureIndex}-${currentMetronomeBeat.positionInSixteenths}`;
    if (lastBackingTriggerRef.current === triggerKey) return;
    lastBackingTriggerRef.current = triggerKey;
    const sixteenthOffset = currentMetronomeBeat.positionInSixteenths;
    const templateMeasureNotes = backingTemplateMeasureMap.get(
      currentMetronomeBeat.measureIndex
    );
    const fallbackPatternMeasure =
      backingPatternRhythm.measures[
        currentMetronomeBeat.measureIndex % backingPatternRhythm.measures.length
      ];
    const patternNotes = templateMeasureNotes ?? fallbackPatternMeasure?.notes;
    if (!patternNotes) return;
    const sound = getNoteSoundAtSixteenth(patternNotes, sixteenthOffset);
    if (!sound || sound === 'rest' || sound === '_') return;
    const player = backingAudioPlayerRef.current;
    if (!player) return;
    const masterScale =
      masterMuted ? 0 : Math.max(0, Math.min(100, masterVolume)) / 100;
    const backingScale =
      backingBeatMuted
        ? 0
        : Math.max(0, Math.min(100, backingBeatVolume)) / 100;
    const soundToken =
      sound === 'dum' || sound === 'tak' || sound === 'ka' || sound === 'slap'
        ? sound
        : null;
    if (!soundToken) return;
    player.play(soundToken, Math.max(0, Math.min(1, backingScale * masterScale)));
  }, [
    isPlaying,
    backingBeatEnabled,
    backingPatternRhythm,
    backingTemplateMeasureMap,
    currentMetronomeBeat,
    backingBeatVolume,
    backingBeatMuted,
    masterVolume,
    masterMuted,
  ]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedBpm(bpm), 350);
    return () => window.clearTimeout(timeoutId);
  }, [bpm]);

  useEffect(() => {
    if (!pendingPlaybackStartMode) return;
    if (pendingPlaybackStartMode === 'section' && !playbackSelectionRange) return;
    setPendingPlaybackStartMode(null);
    stopPlaybackImmediately();
    const frame = window.requestAnimationFrame(() => {
      handlePlay();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [
    pendingPlaybackStartMode,
    playbackSelectionRange,
    handlePlay,
    stopPlaybackImmediately,
  ]);

  useEffect(() => {
    if (isPlaying) stopPlaybackImmediately();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notation, timeSignature]);

  useEffect(() => {
    let frameId = 0;
    const checkStickyState = () => {
      frameId = 0;
      if (stickyControlsRef.current) {
        const nextIsStuck =
          stickyControlsRef.current.getBoundingClientRect().top <= 0;
        setIsStickyControlsStuck((previous) =>
          previous === nextIsStuck ? previous : nextIsStuck
        );
      }
      if (scoreActionsRef.current) {
        const stickyTop = Number.parseFloat(
          window.getComputedStyle(scoreActionsRef.current).top || '0'
        );
        const nextScoreStuck =
          scoreActionsRef.current.getBoundingClientRect().top <= stickyTop + 0.5;
        setIsScoreActionsStuck((previous) =>
          previous === nextScoreStuck ? previous : nextScoreStuck
        );
      }
    };
    const onScrollOrResize = () => {
      if (frameId !== 0) return;
      frameId = window.requestAnimationFrame(checkStickyState);
    };
    onScrollOrResize();
    window.addEventListener('scroll', onScrollOrResize, {
      passive: true,
      capture: true,
    });
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      if (frameId !== 0) window.cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', onScrollOrResize, true);
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
    if (chordSoundType !== 'piano-sampled') return;
    let cancelled = false;
    const preloadSampledPiano = async () => {
      if (!chordAudioContextRef.current) {
        chordAudioContextRef.current = new AudioContext({
          latencyHint: 'interactive',
        });
      }
      const ctx = chordAudioContextRef.current;
      if (!ctx) return;
      if (!chordSampledPianoRef.current) {
        chordSampledPianoRef.current = new SampledPiano(ctx);
        chordSampledPianoRef.current.connect(ctx.destination);
      }
      if (
        chordSampledPianoRef.current.isReady() ||
        sampledPianoLoad.loading
      ) {
        return;
      }
      chordSampledPianoRef.current.setLoadingProgressCallback((loaded, total) => {
        if (cancelled) return;
        setSampledPianoLoad({
          loading: loaded < total,
          loaded,
          total,
          ready: false,
        });
      });
      setSampledPianoLoad((previous) => ({ ...previous, loading: true }));
      await chordSampledPianoRef.current.loadSamples();
      if (cancelled) return;
      setSampledPianoLoad((previous) => ({
        ...previous,
        loading: false,
        ready: chordSampledPianoRef.current?.isReady() ?? false,
        loaded: previous.total > 0 ? previous.total : 1,
        total: previous.total > 0 ? previous.total : 1,
      }));
    };
    void preloadSampledPiano();
    return () => {
      cancelled = true;
    };
  }, [chordSoundType, sampledPianoLoad.loading]);

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
        }
        try {
          chordSampledPianoRef.current.disconnect();
        } catch {
          // Ignore disconnect errors when no active connections exist.
        }
        chordSampledPianoRef.current.connect(ctx.destination);
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
      const velocity = effectiveChordVolume;
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
    effectiveChordVolume,
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
      const inSectionChordPopover =
        target instanceof Element &&
        Boolean(
          target.closest('.words-section-chord-dropdown-root') ||
          target.closest('.words-section-style-dropdown-root')
        );
      if (!inSectionSettingsAnchor && !inSectionSettingsMenu && !inSectionChordPopover) {
        setOpenSectionSettingsId(null);
      }
      const inSectionRandomizeAnchor =
        target instanceof Element &&
        target.closest('.words-section-randomize-anchor');
      const inSectionRandomizeMenu = sectionRandomizeMenuRef.current?.contains(target);
      if (!inSectionRandomizeAnchor && !inSectionRandomizeMenu) {
        setSectionRandomizeMenuId(null);
      }
      const inExportButton = exportButtonRef.current?.contains(target);
      if (!inExportButton) {
        setExportMenuOpen(false);
      }
      const inRandomizeButton = randomizeButtonRef.current?.contains(target);
      const inRandomizeMenu =
        target instanceof Element &&
        Boolean(target.closest('.words-randomize-menu'));
      if (!inRandomizeButton && !inRandomizeMenu) {
        setRandomizeMenuOpen(false);
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
      const { width: viewportWidth, height: viewportHeight } = getViewportMetrics();
      const horizontalPadding = 16;
      const viewportPadding = 16;
      const menuGap = 6;
      const preferredMaxHeight = Math.min(viewportHeight * 0.72, 720);
      const menuWidth = Math.min(460, viewportWidth - horizontalPadding * 2);
      const left = Math.min(
        Math.max(horizontalPadding, rect.right - menuWidth),
        viewportWidth - menuWidth - horizontalPadding
      );
      const spaceBelow = viewportHeight - rect.bottom - viewportPadding - menuGap;
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
    window.visualViewport?.addEventListener('resize', scheduleUpdate);
    window.visualViewport?.addEventListener('scroll', scheduleUpdate);
    // Capture scroll from any scrollable ancestor/container so the menu
    // remains visually attached to the gear anchor.
    window.addEventListener('scroll', scheduleUpdate, true);
    return () => {
      if (frameId !== 0) window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', scheduleUpdate);
      window.visualViewport?.removeEventListener('resize', scheduleUpdate);
      window.visualViewport?.removeEventListener('scroll', scheduleUpdate);
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

  const openLyricImport = useCallback((rawText: string) => {
    if (!rawText.trim()) return;
    setLyricImportText(rawText);
    setLyricImportOpen(true);
  }, []);

  const applyLyricImport = useCallback(
    (drafts: ParsedLyricSectionDraft[]) => {
      const nextSections: SongSection[] = [];
      drafts
        .filter((draft) => draft.lyrics.trim().length > 0)
        .forEach((draft) => {
          const previousChorus = findPreviousChorus(nextSections, nextSections.length);
          const nextSection = createDefaultSection(
            draft.type,
            APP_DEFAULT_GENERATION_SETTINGS,
            previousChorus ?? undefined
          );
          nextSection.type = draft.type;
          nextSection.lyrics = draft.lyrics.trim();
          nextSection.linkedToPreviousChorusLyrics =
            draft.type === 'chorus'
              ? Boolean(draft.suggestedChorusLink)
              : false;
          nextSection.linkedToPreviousChorusTemplate =
            draft.type === 'chorus' ? true : false;
          nextSections.push(nextSection);
        });
      if (nextSections.length === 0) return;
      applySectionsChange(() => nextSections);
      setLyricImportOpen(false);
    },
    [applySectionsChange]
  );

  const handleSectionLyricsPaste = useCallback(
    (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const pastedText = event.clipboardData.getData('text/plain');
      if (!looksLikeFullSongLyrics(pastedText)) return;
      event.preventDefault();
      openLyricImport(pastedText);
    },
    [openLyricImport]
  );

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

  const playAllSections = () => {
    setActiveSectionLoopId(null);
    setPlaybackSelectionRange(null);
    setPendingPlaybackStartMode('all');
  };

  const playSectionLoop = (sectionId: string, sectionIndex: number) => {
    const range = sectionTickRanges[sectionIndex];
    if (!range || range.endTick <= range.startTick) return;
    setActiveSectionLoopId(sectionId);
    setPlaybackSelectionRange(range);
    setPendingPlaybackStartMode('section');
  };

  const handleResetGenerationSettings = () => {
    setGenerationSettings(APP_DEFAULT_GENERATION_SETTINGS);
  };

  const randomizeChordProgression = (sectionId: string) => {
    applyRandomization('chords', sectionId);
  };

  const randomizeChordStyle = (sectionId: string) => {
    if (sections.find((section) => section.id === sectionId)?.isLocked) return;
    const nextStyle = pickRandom(CHORD_STYLE_OPTIONS).id;
    updateSection(sectionId, (section) => ({
      ...section,
      chordStyleId: nextStyle,
    }));
  };

  const randomizeSectionTemplate = (sectionId: string, mode: 'preset' | 'full') => {
    if (sections.find((section) => section.id === sectionId)?.isLocked) return;
    const notation =
      mode === 'preset'
        ? pickRandom(TEMPLATE_PRESETS).notation
        : generateRandomTemplateNotation();
    updateSectionTemplateNotation(sectionId, notation);
  };

  const randomizeBackingTemplate = (mode: 'preset' | 'full') => {
    const notation =
      mode === 'preset'
        ? pickRandom(TEMPLATE_PRESETS).notation
        : generateRandomTemplateNotation();
    setBackingBeatNotation(notation);
  };

  const pickContrastingTemplate = (
    pool: typeof TEMPLATE_PRESETS,
    referenceNotation: string | null
  ) => {
    if (!referenceNotation) return pickRandom(pool).notation;
    const baseline = getTemplateSyncopationScore(referenceNotation);
    const scored = pool
      .map((preset) => ({
        notation: preset.notation,
        score: getTemplateSyncopationScore(preset.notation),
      }))
      .sort((a, b) => Math.abs(b.score - baseline) - Math.abs(a.score - baseline));
    return scored[0]?.notation ?? pickRandom(pool).notation;
  };

  const applyRandomization = (
    mode: RandomizeMode,
    sectionId?: string
  ) => {
    const nextKey =
      mode === 'everything' ? pickRandom(ALL_KEYS) : songKey;
    if (mode === 'everything') {
      const nextBpm = clampBpm(Math.round(80 + Math.random() * 70));
      setBpm(nextBpm);
      setBpmInput(String(nextBpm));
      setSongKey(nextKey);
    }
    applySectionsChange((previous) => {
      const targetIds = new Set(
        previous
          .filter((section) => !section.isLocked)
          .filter((section) => !sectionId || section.id === sectionId)
          .map((section) => section.id)
      );
      if (targetIds.size === 0) return previous;

      const verseBaseProgression = getRandomPopularChordProgressionInKey(nextKey).display;
      const chorusProgression =
        Math.random() < 0.68
          ? verseBaseProgression
          : getRandomPopularChordProgressionInKey(nextKey).display;
      let bridgeProgression = getRandomPopularChordProgressionInKey(nextKey).display;
      for (let attempts = 0; attempts < 4; attempts += 1) {
        if (
          bridgeProgression !== verseBaseProgression &&
          bridgeProgression !== chorusProgression
        ) {
          break;
        }
        bridgeProgression = getRandomPopularChordProgressionInKey(nextKey).display;
      }
      const verseTemplate = pickRandom(TEMPLATE_PRESETS).notation;
      const chorusTemplate =
        Math.random() < 0.72
          ? pickContrastingTemplate(TEMPLATE_PRESETS, verseTemplate)
          : verseTemplate;
      const bridgeTemplate = pickContrastingTemplate(
        TEMPLATE_PRESETS,
        chorusTemplate
      );
      const next = previous.map((section) => {
        if (!targetIds.has(section.id)) return section;
        const shouldRerollPhrasing =
          mode === 'phrasing' || mode === 'groove' || mode === 'everything';
        const shouldRerollChords =
          mode === 'chords' || mode === 'everything';
        const shouldRerollGroove = mode === 'groove' || mode === 'everything';
        const sectionProgression =
          section.type === 'bridge'
            ? bridgeProgression
            : section.type === 'chorus'
              ? chorusProgression
              : verseBaseProgression;
        const sectionTemplate =
          section.type === 'bridge'
            ? bridgeTemplate
            : section.type === 'chorus'
              ? chorusTemplate
              : verseTemplate;
        return {
          ...section,
          rhythmVariationSeed: shouldRerollPhrasing
            ? section.rhythmVariationSeed + 1
            : section.rhythmVariationSeed,
          soundVariationSeed: shouldRerollPhrasing
            ? section.soundVariationSeed + 1
            : section.soundVariationSeed,
          chordProgressionInput: shouldRerollChords
            ? sectionProgression
            : section.chordProgressionInput,
          chordStyleId:
            mode === 'everything'
              ? pickRandom(CHORD_STYLE_OPTIONS).id
              : section.chordStyleId,
          templateNotation: shouldRerollGroove
            ? sectionTemplate
            : section.templateNotation,
        };
      });

      // Re-link identical choruses automatically after randomization.
      let previousChorusLyrics = '';
      return next.map((section) => {
        if (section.type !== 'chorus') return section;
        const normalized = section.lyrics.trim().replace(/\s+/g, ' ');
        const linked = normalized.length > 0 && normalized === previousChorusLyrics;
        previousChorusLyrics = normalized || previousChorusLyrics;
        return {
          ...section,
          linkedToPreviousChorusLyrics: linked,
          linkedToPreviousChorusTemplate: true,
        };
      });
    });
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
          isLoopActive: isPlaying && activeSectionLoopId === plan.section.id,
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
      activeSectionLoopId,
      isPlaying,
      sectionDisplayNames,
      parsedRhythm.measures.length,
    ]
  );
  const playbackScrollContainer = getNotationScrollContainer(notationScrollRef.current);

  const hydrateFromUrlSearch = useCallback((search: string) => {
    const params = new URLSearchParams(search);
    const sectionsParam = params.get(URL_PARAM_SECTIONS);
    const encodedLyrics = params.get(URL_PARAM_LYRICS);
    const encodedPattern = params.get(URL_PARAM_PATTERN_B64);
    const patternParam = params.get(URL_PARAM_PATTERN);
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
            setSections(normalizeSectionsSnapshot(parsed.sections));
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
    const decodedPattern = encodedPattern
      ? decodeBase64UrlUtf8(encodedPattern)
      : null;
    const nextPattern = decodedPattern ?? patternParam;
    if (nextPattern && nextPattern.trim().length > 0) {
      setNotation(nextPattern);
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
    if (notation !== DEFAULT_WORD_RESULT.notation) {
      params.set(URL_PARAM_PATTERN_B64, encodeBase64UrlUtf8(notation));
    }
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
        setSectionRandomizeMenuId(null);
        setRandomizeMenuOpen(false);
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
        setPendingPlaybackStartMode('all');
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
      setSections(normalizeSectionsSnapshot(cloneSectionsSnapshot(snapshot.sections)));
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
          const instrumentalLines = formatRemainingMeasureChords(remainingChords);
          sectionLines.push(`Instrumental chords: ${instrumentalLines[0] ?? ''}`.trim());
          if (instrumentalLines.length > 1) {
            sectionLines.push(...instrumentalLines.slice(1));
          }
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
          <div className="words-randomize-anchor">
            <button
              ref={randomizeButtonRef}
              className="words-button words-button-primary"
              type="button"
              onClick={() => {
                setRandomizeMenuOpen((previous) => !previous);
                setGenerationMenuOpen(false);
                setSoundMenuOpen(false);
              }}
            >
              randomize rhythm
            </button>
            <Popover
              open={randomizeMenuOpen}
              anchorEl={randomizeButtonRef.current}
              onClose={() => setRandomizeMenuOpen(false)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              slotProps={{ paper: { className: 'words-randomize-menu' } }}
            >
              <div className="words-randomize-menu-list">
                {RANDOMIZE_MODE_OPTIONS.map((option) => (
                  <AppTooltip key={option.mode} title={option.tooltip}>
                    <button
                      type="button"
                      className="words-button words-randomize-option"
                      onClick={() => {
                        applyRandomization(option.mode);
                        setRandomizeMenuOpen(false);
                      }}
                    >
                      {option.label}
                    </button>
                  </AppTooltip>
                ))}
              </div>
            </Popover>
          </div>
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
                    <AppSlider
                      min={0}
                      max={100}
                      className="words-slider-input"
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
                    <AppSlider
                      min={0}
                      max={100}
                      className="words-slider-input"
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
                    <AppSlider
                      min={0}
                      max={100}
                      className="words-slider-input"
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
                    <AppSlider
                      min={0}
                      max={100}
                      className="words-slider-input"
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
                  <label className="words-slider-row">
                    <SettingHelpLabel
                      text="template influence"
                      help={GENERATION_SETTING_HELP.templateBias}
                    />
                    <AppSlider
                      min={0}
                      max={100}
                      className="words-slider-input"
                      value={generationSettings.templateBias}
                      onChange={(event) =>
                        updateSetting('templateBias', Number(event.target.value))
                      }
                    />
                    <span>{generationSettings.templateBias}</span>
                  </label>
                </div>

                <div className="words-advanced-block">
                  <h3>Alignment</h3>
                  <label className="words-slider-row">
                    <SettingHelpLabel
                      text="word starts to beats"
                      help={GENERATION_SETTING_HELP.alignWordStartsToBeats}
                    />
                    <AppSlider
                      min={0}
                      max={100}
                      className="words-slider-input"
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
                    <AppSlider
                      min={0}
                      max={100}
                      className="words-slider-input"
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
                    <AppSlider
                      min={0}
                      max={100}
                      className="words-slider-input"
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
                    <AppSlider
                      min={0}
                      max={100}
                      className="words-slider-input"
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
                    <AppSlider
                      min={0}
                      max={100}
                      className="words-slider-input"
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
                    <AppSlider
                      min={0}
                      max={100}
                      className="words-slider-input"
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
          <label className="words-inline-control words-inline-control-bpm">
            bpm
            <BpmInput
              value={bpm}
              onChange={(next) => setBpm(clampBpm(next))}
              min={40}
              max={220}
              className="words-bpm-input"
              dropdownClassName="words-bpm-dropdown"
              sliderClassName="words-bpm-slider"
              trailingActions={(
                <AppTooltip title="Randomize tempo">
                  <button
                    type="button"
                    className="words-inline-dice-button words-icon-tooltip"
                    onClick={() => setBpm(clampBpm(Math.round(80 + Math.random() * 70)))}
                    aria-label="Randomize tempo"
                  >
                    <DiceIcon variant="single" size={15} />
                  </button>
                </AppTooltip>
              )}
            />
          </label>
          <label className="words-inline-control">
            key
            <KeyInput
              value={songKey}
              onChange={(next) => setSongKey(next as Key)}
              className="words-key-input"
              dropdownClassName="words-key-dropdown"
              trailingActions={(
                <AppTooltip title="Randomize key">
                  <button
                    type="button"
                    className="words-inline-dice-button words-icon-tooltip"
                    onClick={() => setSongKey(pickRandom(ALL_KEYS))}
                    aria-label="Randomize key"
                  >
                    <DiceIcon variant="single" size={15} />
                  </button>
                </AppTooltip>
              )}
            />
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
          <AppTooltip title={metronomeEnabled ? 'Metronome is on' : 'Metronome is off'}>
            <span>
              <MetronomeToggleButton
                enabled={metronomeEnabled}
                onToggle={() => {
                  const nextEnabled = !metronomeEnabled;
                  setMetronomeEnabled(nextEnabled);
                  handleMetronomeToggle(nextEnabled);
                }}
                className="words-button words-button-icon words-icon-tooltip words-metronome-toggle"
                activeClassName="is-on"
                showOnLabel={false}
                tooltipOn="Metronome is on"
                tooltipOff="Metronome is off"
                includeNativeTitle={false}
                includeDataTooltip={false}
              />
            </span>
          </AppTooltip>
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
                master volume
                <AppSlider
                  min={0}
                  max={100}
                  className="words-slider-input"
                  value={masterVolume}
                  onChange={(event) => setMasterVolume(Number(event.target.value))}
                />
                <span>{masterVolume}</span>
                <AppTooltip title={masterMuted ? 'Unmute master volume' : 'Mute master volume'}>
                  <button
                    type="button"
                    className="words-button words-button-icon words-icon-tooltip"
                    onClick={() => setMasterMuted((previous) => !previous)}
                    aria-label={masterMuted ? 'Unmute master volume' : 'Mute master volume'}
                  >
                    <span className="material-symbols-outlined">
                      {volumeIconName(masterMuted)}
                    </span>
                  </button>
                </AppTooltip>
              </label>
              <label className="words-slider-row">
                drums volume
                <AppSlider
                  min={0}
                  max={100}
                  className="words-slider-input"
                  value={drumsVolume}
                  onChange={(event) =>
                    setDrumsVolume(Number(event.target.value))
                  }
                />
                <span>{drumsVolume}</span>
                <AppTooltip title={drumsMuted ? 'Unmute drums' : 'Mute drums'}>
                  <button
                    type="button"
                    className="words-button words-button-icon words-icon-tooltip"
                    onClick={() => setDrumsMuted((previous) => !previous)}
                    aria-label={drumsMuted ? 'Unmute drums' : 'Mute drums'}
                  >
                    <span className="material-symbols-outlined">
                      {volumeIconName(drumsMuted)}
                    </span>
                  </button>
                </AppTooltip>
              </label>
              <label className="words-slider-row">
                accent volume
                <AppSlider
                  min={0}
                  max={100}
                  className="words-slider-input"
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
                <AppTooltip title={accentMuted ? 'Unmute accents' : 'Mute accents'}>
                  <button
                    type="button"
                    className="words-button words-button-icon words-icon-tooltip"
                    onClick={() => setAccentMuted((previous) => !previous)}
                    aria-label={accentMuted ? 'Unmute accents' : 'Mute accents'}
                  >
                    <span className="material-symbols-outlined">
                      {volumeIconName(accentMuted)}
                    </span>
                  </button>
                </AppTooltip>
              </label>
              <label className="words-slider-row">
                metronome volume
                <AppSlider
                  min={0}
                  max={100}
                  className="words-slider-input"
                  value={playbackSettings.metronomeVolume}
                  onChange={(event) =>
                    setPlaybackSettings((previous) => ({
                      ...previous,
                      metronomeVolume: Number(event.target.value),
                    }))
                  }
                />
                <span>{playbackSettings.metronomeVolume}</span>
                <AppTooltip title={metronomeMuted ? 'Unmute metronome' : 'Mute metronome'}>
                  <button
                    type="button"
                    className="words-button words-button-icon words-icon-tooltip"
                    onClick={() => setMetronomeMuted((previous) => !previous)}
                    aria-label={metronomeMuted ? 'Unmute metronome' : 'Mute metronome'}
                  >
                    <span className="material-symbols-outlined">
                      {volumeIconName(metronomeMuted)}
                    </span>
                  </button>
                </AppTooltip>
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
                  <AppSlider
                    min={0}
                    max={100}
                    className="words-slider-input"
                    value={chordVolume}
                    onChange={(event) =>
                      setChordVolume(Number(event.target.value))
                    }
                  />
                  <span>{chordVolume}</span>
                  <AppTooltip title={chordMuted ? 'Unmute chords' : 'Mute chords'}>
                    <button
                      type="button"
                      className="words-button words-button-icon words-icon-tooltip"
                      onClick={() => setChordMuted((previous) => !previous)}
                      aria-label={chordMuted ? 'Unmute chords' : 'Mute chords'}
                    >
                      <span className="material-symbols-outlined">
                        {volumeIconName(chordMuted)}
                      </span>
                    </button>
                  </AppTooltip>
                </label>
              </div>
              <div className="words-chord-settings">
                <label className="word-rhythm-toggle words-toggle-inline">
                  <input
                    type="checkbox"
                    checked={backingBeatEnabled}
                    onChange={(event) =>
                      setBackingBeatEnabled(event.target.checked)
                    }
                  />
                  Add backing drums
                </label>
                {backingBeatEnabled ? (
                  <>
                    <label className="words-slider-row">
                      backing drum volume
                      <AppSlider
                        min={0}
                        max={100}
                        className="words-slider-input"
                        value={backingBeatVolume}
                        onChange={(event) =>
                          setBackingBeatVolume(Number(event.target.value))
                        }
                      />
                      <span>{backingBeatVolume}</span>
                      <AppTooltip
                        title={backingBeatMuted ? 'Unmute backing drums' : 'Mute backing drums'}
                      >
                        <button
                          type="button"
                          className="words-button words-button-icon words-icon-tooltip"
                          onClick={() => setBackingBeatMuted((previous) => !previous)}
                          aria-label={
                            backingBeatMuted ? 'Unmute backing drums' : 'Mute backing drums'
                          }
                        >
                          <span className="material-symbols-outlined">
                            {volumeIconName(backingBeatMuted)}
                          </span>
                        </button>
                      </AppTooltip>
                    </label>
                    <label className="word-rhythm-toggle words-toggle-inline">
                      <input
                        type="checkbox"
                        checked={backingBeatUseTemplate}
                        onChange={(event) =>
                          setBackingBeatUseTemplate(event.target.checked)
                        }
                      />
                      Use section templates
                    </label>
                    {!backingBeatUseTemplate ? (
                      <>
                        <label className="words-slider-row words-chord-row">
                          backing beat notation
                          <div className="words-template-input-with-link words-template-input-only">
                            <input
                              className="words-template-input"
                              type="text"
                              value={backingBeatNotation}
                              onChange={(event) =>
                                setBackingBeatNotation(event.target.value)
                              }
                              placeholder={BACKING_FALLBACK_TEMPLATE}
                            />
                          </div>
                        </label>
                        <div className="words-section-template-presets">
                          {TEMPLATE_PRESETS.map((preset) => (
                            <button
                              key={`backing-${preset.label}`}
                              type="button"
                              className={`words-button words-button-template${
                                backingBeatNotation === preset.notation
                                  ? ' is-active'
                                  : ''
                              }`}
                              onClick={() => setBackingBeatNotation(preset.notation)}
                            >
                              {preset.label}
                            </button>
                          ))}
                          <AppTooltip title="Random preset template">
                            <button
                              type="button"
                              className="words-button words-button-template words-button-template-icon words-icon-tooltip"
                              onClick={() => randomizeBackingTemplate('preset')}
                              aria-label="Random preset template"
                            >
                              <DiceIcon variant="single" size={15} />
                            </button>
                          </AppTooltip>
                          <AppTooltip title="Fully randomize template">
                            <button
                              type="button"
                              className="words-button words-button-template words-button-template-icon words-icon-tooltip"
                              onClick={() => randomizeBackingTemplate('full')}
                              aria-label="Fully randomize template"
                            >
                              <DiceIcon variant="multiple" size={15} />
                            </button>
                          </AppTooltip>
                        </div>
                      </>
                    ) : null}
                    {!backingBeatUseTemplate &&
                    backingPatternRhythm?.isValid &&
                    (backingPatternRhythm.measures.length ?? 0) > 0 ? (
                      <div className="words-template-preview words-section-template-preview">
                        <DrumNotationMini
                          rhythm={backingPatternRhythm}
                          width={320}
                          style="light"
                          showDrumSymbols={true}
                          drumSymbolScale={0.52}
                          darbukaLinkOptions={{
                            notation: backingBeatUseTemplate
                              ? APP_DEFAULT_GENERATION_SETTINGS.templateNotation
                              : backingBeatNotation,
                            bpm,
                            timeSignature,
                            metronomeEnabled,
                            className: 'words-template-edit-link',
                          }}
                        />
                      </div>
                    ) : !backingBeatUseTemplate ? (
                      <p className="words-template-error">
                        Backing beat notation is invalid for this meter.
                      </p>
                    ) : null}
                  </>
                ) : null}
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
              };
              const effectiveLyrics = effectiveSection.effectiveLyrics;
              const sectionDisplayName = sectionDisplayNames[index] ?? 'Section';
              return (
                <div
                  key={section.id}
                  className={`words-section-card${
                    openSectionSettingsId === section.id ? ' is-settings-open' : ''
                  }${
                    isPlaying && activeSectionLoopId === section.id ? ' is-looping' : ''
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
                      <AppTooltip
                        title={
                          section.linkedToPreviousChorusLyrics
                            ? 'Chorus lyrics are linked. Click to unlink lyrics for this chorus.'
                            : 'Chorus lyrics are unlinked. Click to relink lyrics for this chorus.'
                        }
                      >
                        <button
                          type="button"
                          className={`words-button words-button-icon words-link-toggle words-link-toggle-chorus words-icon-tooltip${
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
                        >
                          <span className="material-symbols-outlined">
                            {section.linkedToPreviousChorusLyrics ? 'link' : 'link_off'}
                          </span>
                        </button>
                      </AppTooltip>
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
                        <AppTooltip title="Section settings">
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
                          >
                            <span className="material-symbols-outlined">
                              settings
                            </span>
                          </button>
                        </AppTooltip>
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
                                <ChordProgressionInput
                                  value={section.chordProgressionInput}
                                  onChange={(next) =>
                                    setSectionChordProgression(section.id, next)
                                  }
                                  onCommit={(next) =>
                                    setSectionChordProgression(section.id, next)
                                  }
                                  keyContext={songKey}
                                  showResolvedForKey
                                  className="words-section-chord-input"
                                  inputClassName="words-section-chord-text-input"
                                  dropdownClassName="words-section-chord-dropdown"
                                  appearance="words"
                                  presetColumns={2}
                                  showInputInPopover
                                  placeholder="I–V–vi–IV or C–G–Am–F"
                                />
                                <AppTooltip title="Randomize section chords">
                                  <button
                                    className="words-button words-button-icon words-icon-tooltip"
                                    type="button"
                                    onClick={() =>
                                      randomizeChordProgression(section.id)
                                    }
                                    aria-label="Randomize section chords"
                                  >
                                    <DiceIcon variant="single" size={16} />
                                  </button>
                                </AppTooltip>
                              </div>
                            </label>
                            <label className="words-slider-row words-chord-row">
                              chord style
                              <div className="words-chord-input-with-action">
                                <ChordStyleInput
                                  value={section.chordStyleId}
                                  onChange={(next) =>
                                    updateSection(section.id, (previousSection) => ({
                                      ...previousSection,
                                      chordStyleId: next as ChordStyleId,
                                    }))
                                  }
                                  options={CHORD_STYLE_OPTIONS}
                                  className="words-chord-style-input"
                                  triggerClassName="words-select-inline words-chord-style-select"
                                  dropdownClassName="words-section-style-dropdown"
                                  appearance="words"
                                  menuColumns={2}
                                />
                                <AppTooltip title="Randomize chord style">
                                  <button
                                    className="words-button words-button-icon words-icon-tooltip"
                                    type="button"
                                    onClick={() => randomizeChordStyle(section.id)}
                                    aria-label="Randomize chord style"
                                  >
                                    <DiceIcon variant="single" size={16} />
                                  </button>
                                </AppTooltip>
                              </div>
                            </label>
                            {section.type === 'chorus' ? (
                              <div className="words-chorus-link-controls">
                                <strong>chorus linking</strong>
                                <div className="words-chorus-link-row">
                                  <AppTooltip
                                    title={
                                      section.linkedToPreviousChorusLyrics
                                        ? 'Lyrics are linked: editing one linked chorus updates all linked chorus lyrics.'
                                        : 'Lyrics are unlinked: this chorus keeps its own lyrics.'
                                    }
                                  >
                                    <button
                                      type="button"
                                      className={`words-button words-button-icon words-link-toggle words-link-toggle-chorus words-icon-tooltip${
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
                                      aria-label="Toggle chorus lyrics linking"
                                    >
                                      <span className="material-symbols-outlined">
                                        {section.linkedToPreviousChorusLyrics
                                          ? 'link'
                                          : 'link_off'}
                                      </span>
                                    </button>
                                  </AppTooltip>
                                  <span>lyrics link</span>
                                </div>
                                <div className="words-chorus-link-row">
                                  <AppTooltip
                                    title={
                                      section.linkedToPreviousChorusTemplate
                                        ? 'Rhythm template is linked across linked choruses.'
                                        : 'Rhythm template is unlinked for this chorus.'
                                    }
                                  >
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
                                      aria-label="Toggle chorus rhythm template linking"
                                    >
                                      <span className="material-symbols-outlined">
                                        {section.linkedToPreviousChorusTemplate
                                          ? 'link'
                                          : 'link_off'}
                                      </span>
                                    </button>
                                  </AppTooltip>
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
                              <AppTooltip title="Random preset template">
                                <button
                                  type="button"
                                  className="words-button words-button-template words-button-template-icon words-icon-tooltip"
                                  onClick={() =>
                                    randomizeSectionTemplate(section.id, 'preset')
                                  }
                                  aria-label="Random preset template"
                                >
                                  <DiceIcon variant="single" size={15} />
                                </button>
                              </AppTooltip>
                              <AppTooltip title="Fully randomize template">
                                <button
                                  type="button"
                                  className="words-button words-button-template words-button-template-icon words-icon-tooltip"
                                  onClick={() =>
                                    randomizeSectionTemplate(section.id, 'full')
                                  }
                                  aria-label="Fully randomize template"
                                >
                                  <DiceIcon variant="multiple" size={15} />
                                </button>
                              </AppTooltip>
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
                                  darbukaLinkOptions={{
                                    notation:
                                      section.templateNotation ||
                                      APP_DEFAULT_GENERATION_SETTINGS.templateNotation ||
                                      TEMPLATE_PRESETS[0].notation,
                                    bpm,
                                    timeSignature,
                                    metronomeEnabled,
                                    className: 'words-template-edit-link',
                                  }}
                                />
                              </div>
                            ) : (
                              <p className="words-template-error">
                                Section template notation is invalid for this
                                meter.
                              </p>
                            )}
                                </div>,
                                document.body
                              )
                            : null
                        ) : null}
                      </div>
                      <AppTooltip
                        title={
                          isPlaying && activeSectionLoopId === section.id
                            ? 'Pause section loop'
                            : 'Play this section in a loop'
                        }
                      >
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
                      </AppTooltip>
                      <AppTooltip
                        title={
                          section.isLocked
                            ? 'Section is locked and excluded from randomization'
                            : 'Lock this section to keep it unchanged when randomizing'
                        }
                      >
                        <button
                          type="button"
                          className={`words-button words-button-icon words-icon-tooltip${
                            section.isLocked ? ' is-open' : ''
                          }`}
                          onClick={() =>
                            updateSection(section.id, (previousSection) => ({
                              ...previousSection,
                              isLocked: !previousSection.isLocked,
                            }))
                          }
                          aria-label={`Toggle lock for ${sectionDisplayName}`}
                        >
                          <span className="material-symbols-outlined">
                            {section.isLocked ? 'lock' : 'lock_open'}
                          </span>
                        </button>
                      </AppTooltip>
                      <div
                        className="words-section-randomize-anchor"
                        ref={(element) => {
                          if (element) {
                            sectionRandomizeAnchorRefs.current.set(section.id, element);
                          } else {
                            sectionRandomizeAnchorRefs.current.delete(section.id);
                          }
                        }}
                      >
                        <AppTooltip
                          title={
                            section.isLocked
                              ? 'Section is locked'
                              : 'Open randomization options for this section'
                          }
                        >
                          <button
                            type="button"
                            className="words-button words-button-icon"
                            onClick={() =>
                              setSectionRandomizeMenuId((previous) =>
                                previous === section.id ? null : section.id
                              )
                            }
                            aria-label={`Randomize ${sectionDisplayName}`}
                          >
                            <DiceIcon variant="single" size={16} />
                          </button>
                        </AppTooltip>
                        <Popover
                          open={sectionRandomizeMenuId === section.id}
                          anchorEl={sectionRandomizeAnchorRefs.current.get(section.id) ?? null}
                          onClose={() => setSectionRandomizeMenuId(null)}
                          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                          slotProps={{
                            paper: {
                              className: 'words-randomize-menu',
                              ref: sectionRandomizeMenuRef,
                            },
                          }}
                        >
                          <div className="words-randomize-menu-list">
                            {RANDOMIZE_MODE_OPTIONS.map((option) => (
                              <AppTooltip key={`${section.id}-${option.mode}`} title={option.tooltip}>
                                <button
                                  type="button"
                                  className="words-button words-randomize-option"
                                  onClick={() => {
                                    applyRandomization(option.mode, section.id);
                                    setSectionRandomizeMenuId(null);
                                  }}
                                >
                                  {option.label}
                                </button>
                              </AppTooltip>
                            ))}
                          </div>
                        </Popover>
                      </div>
                      <AppTooltip title="Show this section in notation">
                        <button
                          type="button"
                          className="words-button words-button-icon words-icon-tooltip"
                          onClick={() => scrollSectionIntoNotationView(section.id)}
                          aria-label={`Show ${sectionDisplayName} in notation`}
                        >
                          <span className="material-symbols-outlined">visibility</span>
                        </button>
                      </AppTooltip>
                      <AppTooltip title="Move section up">
                        <button
                          type="button"
                          className="words-button words-button-icon words-icon-tooltip"
                          onClick={() => moveSection(section.id, -1)}
                          aria-label={`Move ${sectionDisplayName} up`}
                        >
                          <span className="material-symbols-outlined">arrow_upward</span>
                        </button>
                      </AppTooltip>
                      <AppTooltip title="Move section down">
                        <button
                          type="button"
                          className="words-button words-button-icon words-icon-tooltip"
                          onClick={() => moveSection(section.id, 1)}
                          aria-label={`Move ${sectionDisplayName} down`}
                        >
                          <span className="material-symbols-outlined">arrow_downward</span>
                        </button>
                      </AppTooltip>
                      <AppTooltip title="Delete section">
                        <button
                          type="button"
                          className="words-button words-button-icon words-button-danger words-icon-tooltip"
                          onClick={() => removeSection(section.id)}
                          aria-label={`Remove ${sectionDisplayName}`}
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </AppTooltip>
                    </div>
                  </div>
                  <textarea
                    className="words-textarea words-section-textarea"
                    rows={4}
                    value={effectiveLyrics}
                    onPaste={handleSectionLyricsPaste}
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
            <button
              className="words-button words-button-add"
              type="button"
              onClick={() =>
                openLyricImport(
                  sections.map((section) => section.lyrics).filter(Boolean).join('\n\n')
                )
              }
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                content_paste
              </span>
              import lyrics
            </button>
          </div>
        </article>

        <article className="words-rhythm-card" ref={notationScrollRef}>
          <div
            ref={scoreActionsRef}
            className={`words-score-actions${isScoreActionsStuck ? ' is-stuck' : ''}`}
          >
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
            <Popover
              open={exportMenuOpen}
              anchorEl={exportButtonRef.current}
              onClose={() => setExportMenuOpen(false)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              slotProps={{ paper: { className: 'words-dropdown-menu words-export-menu' } }}
            >
              <div className="words-export-menu-list">
                <button
                  type="button"
                  className="words-button words-export-option"
                  onClick={() => {
                    void copyText(lyricsExportText);
                    setExportMenuOpen(false);
                  }}
                >
                  Copy lyrics
                </button>
                <button
                  type="button"
                  className="words-button words-export-option"
                  onClick={() => {
                    void copyText(asciiChordChartExportText);
                    setExportMenuOpen(false);
                  }}
                >
                  Copy ASCII chord chart
                </button>
                <button
                  type="button"
                  className="words-button words-export-option"
                  onClick={() => {
                    handleDownloadChordChartPdf();
                    setExportMenuOpen(false);
                  }}
                >
                  Download chord chart PDF
                </button>
                <button
                  type="button"
                  className="words-button words-export-option"
                  onClick={() => {
                    setSharedExportOpen(true);
                    setExportMenuOpen(false);
                  }}
                >
                  Export audio / MIDI…
                </button>
              </div>
            </Popover>
            <SharedExportPopover
              open={sharedExportOpen}
              anchorEl={exportButtonRef.current}
              onClose={() => setSharedExportOpen(false)}
              adapter={exportAdapter}
              persistKey="words"
            />
          </div>
          <div className="words-notation-sections">
            {notationSectionBlocks.map((block) => (
              <section
                key={block.id}
                className={`words-notation-section${
                  block.isLoopActive ? ' is-active' : ''
                }`}
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
                  scrollContainer={playbackScrollContainer}
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
      <LyricImportModal
        isOpen={lyricImportOpen}
        initialText={lyricImportText}
        onClose={() => setLyricImportOpen(false)}
        onApply={applyLyricImport}
      />
    </div>
  );
};

export default App;
