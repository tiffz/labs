import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import Dialog from '@mui/material/Dialog';
import { usePiano } from '../store';
import {
  generateExerciseScore, generateChromaticScore,
  MAJOR_KEYS, MINOR_KEYS, CHROMATIC_NOTES,
  type Direction, type ExerciseType, type Subdivision,
} from '../data/scales';
import {
  generateChordProgressionScore,
  COMMON_CHORD_PROGRESSIONS,
  CHORD_STYLE_OPTIONS,
  type ChordVoicingStyle,
  type ChordStyleId,
  type MeasuresPerChord,
} from '../data/chordExercises';
import type { TimeSignature } from '../../shared/music/chordTypes';
import {
  getAvailableChordStyleTimeSignatures,
} from '../../shared/music/chordStylingStrategies';
import { isStrategyCompatibleWithTimeSignature } from '../../shared/music/chordStylingCompatibility';
import { getAllEntries, getSongSettings, type LibraryEntry } from '../utils/libraryStorage';
import type { Key } from '../types';
import type { RomanNumeral } from '../../shared/music/chordTypes';
import { parseProgressionText } from '../../shared/music/chordProgressionText';
import AppTooltip from '../../shared/components/AppTooltip';
import {
  ChordProgressionSelector,
} from './ChordExerciseSelectors';
import ChordStyleInput from '../../shared/components/music/ChordStyleInput';

type TonalType = 'scale' | 'arpeggio' | 'pentascale';

const ENHARMONIC_MAP: Record<string, string> = {
  'Db': 'C#', 'C#': 'Db',
  'Eb': 'D#', 'D#': 'Eb',
  'Ab': 'G#', 'G#': 'Ab',
};

const SCALE_TYPE_OPTIONS: { value: ExerciseType; label: string }[] = [
  { value: 'scale', label: 'Natural' },
  { value: 'pentascale', label: 'Pentascale' },
  { value: 'arpeggio', label: 'Arpeggio' },
  { value: 'chromatic', label: 'Chromatic' },
];

const DIR_OPTIONS: { value: Direction; label: string; icon: string }[] = [
  { value: 'ascending', label: 'Ascending', icon: 'arrow_upward' },
  { value: 'descending', label: 'Descending', icon: 'arrow_downward' },
  { value: 'both', label: 'Ascending & Descending', icon: 'swap_vert' },
];

const VOICING_OPTIONS: { value: ChordVoicingStyle; label: string }[] = [
  { value: 'root', label: 'Root Position' },
  { value: 'inv1', label: '1st Inversion' },
  { value: 'inv2', label: '2nd Inversion' },
  { value: 'open', label: 'Open Voicing' },
  { value: 'voice-leading', label: 'Voice Leading' },
];

const DiceSvg: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" height="14" viewBox="0 -960 960 960" width="14" fill="currentColor">
    <path d="M220-160q-24 0-42-18t-18-42v-520q0-24 18-42t42-18h520q24 0 42 18t18 42v520q0 24-18 42t-42 18H220Zm0-60h520v-520H220v520Zm170-110q21 0 35.5-14.5T440-380q0-21-14.5-35.5T390-430q-21 0-35.5 14.5T340-380q0 21 14.5 35.5T390-330Zm180 0q21 0 35.5-14.5T620-380q0-21-14.5-35.5T570-430q-21 0-35.5 14.5T520-380q0 21 14.5 35.5T570-330ZM390-510q21 0 35.5-14.5T440-560q0-21-14.5-35.5T390-610q-21 0-35.5 14.5T340-560q0 21 14.5 35.5T390-510Zm180 0q21 0 35.5-14.5T620-560q0-21-14.5-35.5T570-610q-21 0-35.5 14.5T520-560q0 21 14.5 35.5T570-510ZM220-740v520-520Z" />
  </svg>
);

function pickRandom<T>(arr: readonly T[], current?: T): T {
  if (arr.length <= 1) return arr[0];
  let next: T;
  do { next = arr[Math.floor(Math.random() * arr.length)]; } while (next === current && arr.length > 1);
  return next;
}

const DIR_SHORT: Record<Direction, string> = { ascending: 'Asc', descending: 'Desc', both: 'Asc & Desc' };
const TYPE_LABEL: Record<ExerciseType, string> = { scale: 'Scale', pentascale: 'Pentascale', arpeggio: 'Arpeggio', chromatic: 'Chromatic' };
const SLUG_TO_KEY: Record<string, Key> = {
  c: 'C',
  db: 'Db',
  df: 'Db',
  d: 'D',
  eb: 'Eb',
  ef: 'Eb',
  e: 'E',
  f: 'F',
  fs: 'F#',
  g: 'G',
  ab: 'Ab',
  af: 'Ab',
  a: 'A',
  bb: 'Bb',
  fb: 'Bb',
  b: 'B',
};

function parseExerciseId(id: string): {
  type: ExerciseType;
  quality: 'major' | 'minor';
  key: Key;
  direction: Direction;
  octaves: number;
  subdivision: Subdivision;
} | null {
  const tonal = id.match(
    /^(major|minor)-(scale|arpeggio|pentascale)-([a-z]{1,2})-(ascending|descending|both)-(\d+)-(\d+)$/
  );
  if (tonal) {
    const key = SLUG_TO_KEY[tonal[3]];
    if (!key) return null;
    return {
      quality: tonal[1] as 'major' | 'minor',
      type: tonal[2] as ExerciseType,
      key,
      direction: tonal[4] as Direction,
      octaves: parseInt(tonal[5], 10),
      subdivision: parseInt(tonal[6], 10) as Subdivision,
    };
  }
  const chrom = id.match(/^chromatic-([a-z]{1,2})-(ascending|descending|both)-(\d+)-(\d+)$/);
  if (!chrom) return null;
  const key = SLUG_TO_KEY[chrom[1]];
  if (!key) return null;
  return {
    quality: 'major',
    type: 'chromatic',
    key,
    direction: chrom[2] as Direction,
    octaves: parseInt(chrom[3], 10),
    subdivision: parseInt(chrom[4], 10) as Subdivision,
  };
}

/** Label with an optional dice button inline */
const GroupLabel: React.FC<{
  children: React.ReactNode;
  onRandomize?: () => void;
  tipText?: string;
}> = ({ children, onRandomize, tipText }) => (
  <label className="ep-group-label">
    {children}
    {onRandomize && (
      <AppTooltip title={tipText ?? 'Randomize this option by picking a new value.'}>
        <button className="ep-label-dice" onClick={onRandomize}>
          <DiceSvg />
        </button>
      </AppTooltip>
    )}
  </label>
);

interface ExercisePickerProps {
  open?: boolean;
  onClose: () => void;
  onImportClick?: () => void;
  mode?: 'dialog' | 'inline';
  title?: string;
  allowedSections?: Array<'scales' | 'progressions' | 'songs'>;
  initialSection?: 'scales' | 'progressions' | 'songs';
}

const ExercisePicker: React.FC<ExercisePickerProps> = ({
  open = true,
  onClose,
  onImportClick,
  mode = 'dialog',
  title = 'Choose Exercise',
  allowedSections,
  initialSection,
}) => {
  const { state, dispatch, loadScore, engine } = usePiano();

  const visibleSections = useMemo(
    () => (
      allowedSections && allowedSections.length > 0
        ? allowedSections
        : (['scales', 'progressions', 'songs'] as const)
    ),
    [allowedSections]
  );
  const showSectionTabs = visibleSections.length > 1;
  const fallbackSection = visibleSections[0] ?? 'scales';
  const initialResolvedSection =
    initialSection && visibleSections.includes(initialSection)
      ? initialSection
      : fallbackSection;
  const [section, setSection] = useState<'scales' | 'progressions' | 'songs'>(initialResolvedSection);

  const [scaleType, setScaleType] = useState<ExerciseType>('scale');
  const [quality, setQuality] = useState<'major' | 'minor'>('major');
  const [direction, setDirection] = useState<Direction>('both');
  const [octaves, setOctaves] = useState(1);
  const [subdivision, setSubdivision] = useState<Subdivision>(1);
  const [selectedKey, setSelectedKey] = useState<Key>('C');
  const [chromaticNote, setChromaticNote] = useState('C');

  const [selectedProgression, setSelectedProgression] = useState<number | null>(0);
  const [customProgressionInput, setCustomProgressionInput] = useState(
    COMMON_CHORD_PROGRESSIONS[0]?.progression.join('–') ?? 'I–V–vi–IV'
  );
  const [customProgressionError, setCustomProgressionError] = useState('');
  const [customProgressionWarning, setCustomProgressionWarning] = useState('');
  const [voicingStyle, setVoicingStyle] = useState<ChordVoicingStyle>('root');
  const [measuresPerChord, setMeasuresPerChord] = useState<MeasuresPerChord>(1);
  const [progKey, setProgKey] = useState<Key>('C');
  const [chordStyle, setChordStyle] = useState<ChordStyleId>('simple');
  const [progTimeSignature, setProgTimeSignature] = useState<TimeSignature>({
    numerator: 4,
    denominator: 4,
  });
  const availableProgTimeSignatures = useMemo(
    () => getAvailableChordStyleTimeSignatures(),
    []
  );
  const applyTimerRef = useRef<number | null>(null);
  const hydratedDefaultsRef = useRef(false);

  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [search, setSearch] = useState('');
  useEffect(() => { if (open || mode === 'inline') setEntries(getAllEntries()); }, [open, mode]);
  useEffect(() => {
    if (!visibleSections.includes(section)) {
      setSection(fallbackSection);
    }
  }, [fallbackSection, section, visibleSections]);
  useEffect(() => {
    if (!(open || mode === 'inline')) return;
    if (hydratedDefaultsRef.current) return;
    if (!state.score || !state.isExerciseScore) return;
    hydratedDefaultsRef.current = true;
    if (state.score.exerciseConfig?.kind === 'chord-progression') {
      setSection('progressions');
      setProgKey(state.score.key);
      setCustomProgressionInput(
        state.score.exerciseConfig.progressionInput ??
          state.score.exerciseConfig.progressionNumerals.join('–')
      );
      setVoicingStyle((state.score.exerciseConfig.voicingStyle as ChordVoicingStyle) ?? 'root');
      setMeasuresPerChord(
        ((state.score.exerciseConfig.measuresPerChord as MeasuresPerChord) ?? 1)
      );
      setChordStyle((state.score.exerciseConfig.styleId as ChordStyleId) ?? 'simple');
      if (state.score.timeSignature) {
        setProgTimeSignature({
          numerator: state.score.timeSignature.numerator,
          denominator: state.score.timeSignature.denominator,
        });
      }
      return;
    }
    const parsedScaleMeta = parseExerciseId(state.score.id);
    if (!parsedScaleMeta) return;
    setSection('scales');
    setScaleType(parsedScaleMeta.type);
    setQuality(parsedScaleMeta.quality);
    setSelectedKey(parsedScaleMeta.key);
    setChromaticNote(parsedScaleMeta.key);
    setDirection(parsedScaleMeta.direction);
    setOctaves(parsedScaleMeta.octaves);
    setSubdivision(parsedScaleMeta.subdivision);
  }, [mode, open, state.isExerciseScore, state.score, visibleSections]);
  useEffect(() => {
    if (!open && mode !== 'inline') {
      hydratedDefaultsRef.current = false;
    }
  }, [mode, open]);

  const loadTonal = useCallback((q: 'major' | 'minor', key: Key, type: TonalType, dir: Direction, oct: number, sub: Subdivision) => {
    const score = generateExerciseScore(q, type, key, dir, oct, sub);
    if (!score) return;
    if (state.score?.id === score.id) return;
    loadScore(score, { recordHistory: true });
    dispatch({ type: 'SET_IS_EXERCISE', isExercise: true });
  }, [dispatch, loadScore, state.score?.id]);

  const loadChromatic = useCallback((note: string, dir: Direction, oct: number, sub: Subdivision) => {
    const score = generateChromaticScore(note, dir, oct, sub);
    if (!score) return;
    if (state.score?.id === score.id) return;
    loadScore(score, { recordHistory: true });
    dispatch({ type: 'SET_IS_EXERCISE', isExercise: true });
  }, [dispatch, loadScore, state.score?.id]);

  const loadProgression = useCallback((
    input: string,
    key: Key,
    voicing: ChordVoicingStyle,
    mpc: MeasuresPerChord,
    style: ChordStyleId,
    ts: TimeSignature,
  ) => {
    const parsed = parseProgressionText(input, key);
    if (!parsed.isValid || parsed.tokens.length < 1) {
      setCustomProgressionError('Use I, I–V–vi–IV, or C–G–Am–F.');
      setCustomProgressionWarning('');
      return false;
    }
    if (parsed.romanNumerals.length < 1) {
      setCustomProgressionWarning(
        'Progression is valid text but non-diatonic for the selected/inferred key.'
      );
      setCustomProgressionError('');
      return false;
    }
    const presetMatch = COMMON_CHORD_PROGRESSIONS.find(
      (progression) =>
        progression.progression.length === parsed.romanNumerals.length &&
        progression.progression.every(
          (token, index) => token === parsed.romanNumerals[index]
        )
    );
    const effectiveKey = parsed.inferredKey ?? key;
    const score = generateChordProgressionScore({
      progression: parsed.romanNumerals as RomanNumeral[],
      chordSymbols: parsed.chordSymbols,
      progressionName:
        presetMatch?.name ??
        (
          parsed.romanNumeralDisplay.join('–') ||
          parsed.romanNumerals.join('–') ||
          'Custom progression'
        ),
      progressionInput: input,
      key: effectiveKey,
      voicingStyle: voicing,
      measuresPerChord: mpc,
      timeSignature: ts,
      styleId: style,
    });
    if (state.score?.id === score.id) {
      setCustomProgressionError('');
      setCustomProgressionWarning('');
      return true;
    }
    loadScore(score, { recordHistory: true });
    dispatch({ type: 'SET_IS_EXERCISE', isExercise: true });
    if (parsed.inferredKey && parsed.inferredKey !== key) {
      setProgKey(parsed.inferredKey);
    }
    setCustomProgressionError('');
    setCustomProgressionWarning('');
    return true;
  }, [dispatch, loadScore, state.score?.id]);

  useEffect(() => {
    if (!(open || mode === 'inline')) return;
    if (section === 'songs') return;
    if (applyTimerRef.current) window.clearTimeout(applyTimerRef.current);
    applyTimerRef.current = window.setTimeout(() => {
      if (section === 'scales') {
        if (scaleType === 'chromatic') {
          loadChromatic(chromaticNote, direction, octaves, subdivision);
        } else {
          loadTonal(quality, selectedKey, scaleType as TonalType, direction, octaves, subdivision);
        }
        return;
      }
      if (section === 'progressions') {
        loadProgression(
          customProgressionInput,
          progKey,
          voicingStyle,
          measuresPerChord,
          chordStyle,
          progTimeSignature,
        );
      }
    }, 220);
    return () => {
      if (applyTimerRef.current) {
        window.clearTimeout(applyTimerRef.current);
        applyTimerRef.current = null;
      }
    };
  }, [
    chromaticNote,
    chordStyle,
    customProgressionInput,
    direction,
    loadChromatic,
    loadProgression,
    loadTonal,
    measuresPerChord,
    mode,
    octaves,
    open,
    progKey,
    progTimeSignature,
    quality,
    scaleType,
    section,
    selectedKey,
    subdivision,
    voicingStyle,
  ]);

  const handleSongLoad = (entry: LibraryEntry) => {
    if (engine.isPlaying()) engine.stop();
    const saved = getSongSettings(entry.id);
    if (saved) {
      dispatch({ type: 'RESTORE_PRACTICE_SETTINGS', settings: saved });
      engine.setTempo(saved.tempo);
    } else {
      dispatch({ type: 'SET_SCORE', score: entry.score });
      dispatch({ type: 'SET_IS_EXERCISE', isExercise: false });
      engine.setTempo(entry.score.tempo);
    }
    onClose();
  };

  // Randomize All for scales
  const randomizeAllScales = useCallback(() => {
    const newType = pickRandom(SCALE_TYPE_OPTIONS.map(t => t.value));
    setScaleType(newType);
    if (newType === 'chromatic') {
      setChromaticNote(pickRandom(CHROMATIC_NOTES));
      setSubdivision(pickRandom([1, 2, 3, 4] as Subdivision[]));
    } else {
      const newQ = pickRandom(['major', 'minor'] as const);
      setQuality(newQ);
      const keyPool = newQ === 'major' ? MAJOR_KEYS : MINOR_KEYS;
      setSelectedKey(pickRandom(keyPool as unknown as string[]) as Key);
      setSubdivision(pickRandom([1, 2, 3, 4] as Subdivision[]));
    }
    setDirection(pickRandom(DIR_OPTIONS.map(d => d.value)));
    setOctaves(pickRandom([1, 2, 3, 4]));
  }, []);

  // Randomize All for chord progressions
  const randomizeAllChords = useCallback(() => {
    const nextIndex = Math.floor(Math.random() * COMMON_CHORD_PROGRESSIONS.length);
    setSelectedProgression(nextIndex);
    const next = COMMON_CHORD_PROGRESSIONS[nextIndex];
    if (next) {
      setCustomProgressionInput(next.progression.join('–'));
      setCustomProgressionError('');
      setCustomProgressionWarning('');
    }
    setProgKey(pickRandom(MAJOR_KEYS as unknown as string[]) as Key);
    setVoicingStyle(pickRandom(VOICING_OPTIONS.map(o => o.value)));
    setMeasuresPerChord(pickRandom([1, 2, 3, 4] as MeasuresPerChord[]));
    const nextTs = pickRandom(availableProgTimeSignatures);
    setProgTimeSignature(nextTs);
    const compatibleStyles = CHORD_STYLE_OPTIONS.filter((option) =>
      isStrategyCompatibleWithTimeSignature(option.id, nextTs)
    );
    setChordStyle(
      pickRandom((compatibleStyles.length > 0 ? compatibleStyles : CHORD_STYLE_OPTIONS).map(o => o.id))
    );
  }, [availableProgTimeSignatures]);

  const handleProgTimeSignatureChange = useCallback((next: TimeSignature) => {
    setProgTimeSignature(next);
    setChordStyle((current) =>
      isStrategyCompatibleWithTimeSignature(current, next) ? current : 'simple',
    );
  }, []);

  const isTonal = scaleType !== 'chromatic';
  const keys = quality === 'major' ? MAJOR_KEYS : MINOR_KEYS;

  const previewText = useMemo(() => {
    if (section === 'scales') {
      const key = isTonal ? selectedKey : chromaticNote;
      const qual = isTonal ? (quality === 'major' ? 'Major' : 'Minor') : '';
      const type = TYPE_LABEL[scaleType];
      const dir = DIR_SHORT[direction];
      const parts = [key, qual, type, `(${dir}`];
      if (octaves > 1) parts.push(`, ${octaves} oct`);
      return parts.join(' ') + ')';
    }
    if (section === 'progressions') {
      const parsed = parseProgressionText(customProgressionInput, progKey);
      const label = selectedProgression !== null
        ? (COMMON_CHORD_PROGRESSIONS[selectedProgression]?.name ?? 'Custom progression')
        : 'Custom progression';
      const resolvedKey = parsed.inferredKey ?? progKey;
      return `${label} in ${resolvedKey}`;
    }
    return '';
  }, [
    section,
    isTonal,
    selectedKey,
    chromaticNote,
    quality,
    scaleType,
    direction,
    octaves,
    selectedProgression,
    customProgressionInput,
    progKey,
  ]);

  const filteredEntries = search.trim()
    ? entries.filter(e => e.title.toLowerCase().includes(search.toLowerCase()))
    : entries;

  const content = (
    <>
      <div className="ep-header">
        <h2 className="ep-title">{title}</h2>
        <button type="button" className="ep-close" onClick={onClose}>
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

        {showSectionTabs ? (
          <div className="ep-sections">
            {visibleSections.includes('scales') ? (
              <button className={`ep-section-btn ${section === 'scales' ? 'active' : ''}`} onClick={() => setSection('scales')}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>fitness_center</span>
                Scales
              </button>
            ) : null}
            {visibleSections.includes('progressions') ? (
              <button className={`ep-section-btn ${section === 'progressions' ? 'active' : ''}`} onClick={() => setSection('progressions')}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>queue_music</span>
                Chord Progressions
              </button>
            ) : null}
            {visibleSections.includes('songs') ? (
              <button className={`ep-section-btn ${section === 'songs' ? 'active' : ''}`} onClick={() => setSection('songs')}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>library_music</span>
                Songs
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="ep-body">
          {section === 'scales' && (
            <div className="ep-scales">
              <div className="ep-group">
                <GroupLabel onRandomize={() => setScaleType(pickRandom(SCALE_TYPE_OPTIONS.map(t => t.value), scaleType))}
                  tipText="Randomize scale type. Click to pick a random scale type.">Scale type</GroupLabel>
                <div className="ep-chip-row">
                  {SCALE_TYPE_OPTIONS.map(t => (
                    <button key={t.value} className={`ep-chip ${scaleType === t.value ? 'active' : ''}`}
                      onClick={() => { setScaleType(t.value); if (t.value === 'chromatic') setSubdivision(prev => prev === 1 ? 2 : prev); }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {isTonal && (
                <div className="ep-group">
                  <GroupLabel>Quality</GroupLabel>
                  <div className="ep-chip-row">
                    <button className={`ep-chip ${quality === 'major' ? 'active' : ''}`} onClick={() => {
                      setQuality('major');
                      if (!MAJOR_KEYS.includes(selectedKey)) {
                        const mapped = ENHARMONIC_MAP[selectedKey];
                        if (mapped) setSelectedKey(mapped as Key);
                      }
                    }}>Major</button>
                    <button className={`ep-chip ${quality === 'minor' ? 'active' : ''}`} onClick={() => {
                      setQuality('minor');
                      if (!MINOR_KEYS.includes(selectedKey)) {
                        const mapped = ENHARMONIC_MAP[selectedKey];
                        if (mapped) setSelectedKey(mapped as Key);
                      }
                    }}>Minor</button>
                  </div>
                </div>
              )}

              <div className="ep-group">
                <GroupLabel onRandomize={() => {
                  if (isTonal) setSelectedKey(pickRandom(keys as unknown as string[], selectedKey) as Key);
                  else setChromaticNote(pickRandom(CHROMATIC_NOTES, chromaticNote));
                }} tipText="Randomize key. Click to pick a random key.">Key</GroupLabel>
                <div className="ep-key-grid">
                  {(isTonal ? keys : CHROMATIC_NOTES).map(k => (
                    <button key={k} className={`ep-key-btn ${k === (isTonal ? selectedKey : chromaticNote) ? 'active' : ''}`}
                      onClick={() => isTonal ? setSelectedKey(k as Key) : setChromaticNote(k)}>
                      {k}
                    </button>
                  ))}
                </div>
              </div>

              <div className="ep-row-3">
                <div className="ep-group">
                  <GroupLabel>Direction</GroupLabel>
                  <div className="ep-chip-row">
                    {DIR_OPTIONS.map(d => (
                      <button key={d.value} className={`ep-chip ${direction === d.value ? 'active' : ''}`} onClick={() => setDirection(d.value)}>
                        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>{d.icon}</span>
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="ep-group ep-group-sm">
                  <GroupLabel>Octaves</GroupLabel>
                  <div className="ep-chip-row">
                    {[1, 2, 3, 4].map(n => (
                      <button key={n} className={`ep-chip ep-chip-num ${octaves === n ? 'active' : ''}`} onClick={() => setOctaves(n)}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="ep-group ep-group-sm">
                  <GroupLabel>Subdivisions</GroupLabel>
                  <div className="ep-chip-row">
                    {([1, 2, 3, 4] as Subdivision[]).map(n => (
                      <button key={n} className={`ep-chip ep-chip-num ${subdivision === n ? 'active' : ''}`} onClick={() => setSubdivision(n)}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {section === 'progressions' && (
            <div className="ep-progressions">
              <div className="ep-group">
                <GroupLabel onRandomize={() => {
                  const nextIndex = Math.floor(Math.random() * COMMON_CHORD_PROGRESSIONS.length);
                  setSelectedProgression(nextIndex);
                  const next = COMMON_CHORD_PROGRESSIONS[nextIndex];
                  if (next) {
                    setCustomProgressionInput(next.progression.join('–'));
                    setCustomProgressionError('');
                    setCustomProgressionWarning('');
                  }
                }}
                  tipText="Randomize progression. Click to pick a random chord progression.">Progression</GroupLabel>
                <ChordProgressionSelector
                  value={customProgressionInput}
                  selectedProgression={selectedProgression}
                  listId="ep-progression-presets"
                  keyContext={progKey}
                  appearance="piano"
                  presetColumns={2}
                  showInputInPopover
                  error={customProgressionError}
                  warning={customProgressionWarning}
                  onInputChange={(value) => {
                    setCustomProgressionInput(value);
                    const matchedIndex = COMMON_CHORD_PROGRESSIONS.findIndex(
                      (progression) =>
                        progression.name.toLowerCase() === value.toLowerCase() ||
                        progression.progression.join('–') === value
                    );
                    setSelectedProgression(matchedIndex >= 0 ? matchedIndex : null);
                    setCustomProgressionError('');
                    setCustomProgressionWarning('');
                  }}
                  onSelectPreset={(index) => {
                    const preset = COMMON_CHORD_PROGRESSIONS[index];
                    if (!preset) return;
                    setSelectedProgression(index);
                    setCustomProgressionInput(preset.progression.join('–'));
                    setCustomProgressionError('');
                    setCustomProgressionWarning('');
                  }}
                />
              </div>

              <div className="ep-row-3">
                <div className="ep-group">
                  <GroupLabel onRandomize={() => setProgKey(pickRandom(MAJOR_KEYS as unknown as string[], progKey) as Key)}
                    tipText="Randomize key. Click to pick a random key.">Key</GroupLabel>
                  <div className="ep-key-grid">
                    {MAJOR_KEYS.map(k => (
                      <button key={k} className={`ep-key-btn ${k === progKey ? 'active' : ''}`} onClick={() => setProgKey(k as Key)}>
                        {k}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="ep-group">
                  <GroupLabel onRandomize={() => setVoicingStyle(pickRandom(VOICING_OPTIONS.map(o => o.value), voicingStyle))}
                    tipText="Randomize voicing. Click to pick a random voicing style.">Voicing</GroupLabel>
                  <div className="ep-chip-row">
                    {VOICING_OPTIONS.map(v => (
                      <button key={v.value} className={`ep-chip ${voicingStyle === v.value ? 'active' : ''}`} onClick={() => setVoicingStyle(v.value)}>
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="ep-group ep-group-sm">
                  <GroupLabel>Meas / Chord</GroupLabel>
                  <div className="ep-chip-row">
                    {([1, 2, 3, 4] as MeasuresPerChord[]).map(n => (
                      <button key={n} className={`ep-chip ep-chip-num ${measuresPerChord === n ? 'active' : ''}`} onClick={() => setMeasuresPerChord(n)}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="ep-group">
                <GroupLabel
                  onRandomize={() => {
                    const nextTs = pickRandom(availableProgTimeSignatures);
                    handleProgTimeSignatureChange(nextTs);
                  }}
                  tipText="Randomize time signature. Click to pick a random meter."
                >
                  Time Signature
                </GroupLabel>
                <div className="ep-chip-row">
                  {availableProgTimeSignatures.map((ts) => {
                    const label = `${ts.numerator}/${ts.denominator}`;
                    const active =
                      ts.numerator === progTimeSignature.numerator &&
                      ts.denominator === progTimeSignature.denominator;
                    return (
                      <button
                        key={label}
                        className={`ep-chip ${active ? 'active' : ''}`}
                        onClick={() => handleProgTimeSignatureChange(ts)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="ep-group">
                <GroupLabel
                  onRandomize={() => {
                    const compatible = CHORD_STYLE_OPTIONS.filter((option) =>
                      isStrategyCompatibleWithTimeSignature(option.id, progTimeSignature)
                    );
                    const pool = compatible.length > 0 ? compatible : CHORD_STYLE_OPTIONS;
                    setChordStyle(pickRandom(pool.map((o) => o.id), chordStyle));
                  }}
                  tipText="Randomize style. Click to pick a random accompaniment style."
                >
                  Style
                </GroupLabel>
                <ChordStyleInput
                  value={chordStyle}
                  onChange={(styleId) => setChordStyle(styleId as ChordStyleId)}
                  options={CHORD_STYLE_OPTIONS}
                  timeSignature={progTimeSignature}
                  triggerClassName="ep-custom-prog-input"
                  dropdownClassName="ep-style-dropdown"
                  appearance="piano"
                  menuColumns={2}
                />
              </div>
            </div>
          )}

          {section === 'songs' && (
            <div className="ep-songs">
              <div className="ep-songs-header">
                <div className="ep-songs-search">
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#94a3b8' }}>search</span>
                  <input type="text" placeholder="Search songs..." value={search}
                    onChange={e => setSearch(e.target.value)} className="ep-songs-search-input" />
                </div>
                {onImportClick ? (
                  <button className="ep-import-btn" onClick={() => { onClose(); onImportClick(); }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>upload_file</span>
                    Import
                  </button>
                ) : null}
              </div>
              {filteredEntries.length === 0 ? (
                <div className="ep-songs-empty">
                  <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#cbd5e1' }}>library_music</span>
                  <p>No saved songs yet</p>
                  <p className="ep-songs-hint">Import a MusicXML, MIDI, or MuseScore file.</p>
                </div>
              ) : (
                <div className="ep-songs-list">
                  {filteredEntries.map(entry => {
                    const saved = getSongSettings(entry.id);
                    const displayTitle = saved?.score?.title || entry.title;
                    const displayKey = saved?.score?.key || entry.key;
                    const displayTempo = saved?.tempo ?? entry.tempo;
                    return (
                      <button key={entry.id} className="ep-song-item" onClick={() => handleSongLoad(entry)}>
                        <span className="material-symbols-outlined ep-song-icon">music_note</span>
                        <div className="ep-song-info">
                          <span className="ep-song-title">{displayTitle}</span>
                          <span className="ep-song-meta">{displayKey} · {displayTempo} BPM</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky footer with preview + randomize all */}
        {section !== 'songs' && (
          <div className="ep-footer">
            <div className="ep-footer-preview">
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--piano-primary)' }}>
                {section === 'scales' ? 'fitness_center' : 'queue_music'}
              </span>
              <span className="ep-footer-text">{previewText}</span>
            </div>
            <AppTooltip title="Randomize all options. Click to pick a fresh random setup.">
              <button className="ep-randomize-all" onClick={section === 'scales' ? randomizeAllScales : randomizeAllChords}>
                <DiceSvg /> Randomize All
              </button>
            </AppTooltip>
            <span className="ep-footer-auto">Auto-applies while selecting</span>
          </div>
        )}
    </>
  );
  if (mode === 'inline') {
    return <div className="ep-panel ep-panel-inline">{content}</div>;
  }
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth={false}
      PaperProps={{ className: 'ep-panel' }}
      slotProps={{ paper: { className: 'ep-panel' } }}
    >
      {content}
    </Dialog>
  );
};

export default ExercisePicker;
