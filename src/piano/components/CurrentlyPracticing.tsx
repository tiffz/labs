import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import Popover from '@mui/material/Popover';
import { usePiano } from '../store';
import { durationToBeats } from '../types';
import type { Key } from '../types';
import {
  generateExerciseScore, generateChromaticScore,
  MAJOR_KEYS, MINOR_KEYS,
  type Direction, type ExerciseType, type Subdivision,
} from '../data/scales';
import {
  CHORD_STYLE_OPTIONS,
  COMMON_CHORD_PROGRESSIONS,
  generateChordProgressionScore,
  type ChordStyleId,
  type ChordVoicingStyle,
} from '../data/chordExercises';
import type { RomanNumeral } from '../../shared/music/chordTypes';
import { parseProgressionText } from '../../shared/music/chordProgressionText';
import type { MusicKey } from '../../shared/music/musicInputConstants';
import { useMatTooltip } from './useMatTooltip';
import {
  ChordProgressionSelector,
  ChordStyleSelector,
} from './ChordExerciseSelectors';
import { KeyInputMenu } from '../../shared/components/music/KeyInput';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const ALL_KEYS: Key[] = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const KEY_INDEX: Record<string, number> = {
  'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,
  'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11,
};
const ENHARMONIC_MAP: Record<string, string> = {
  'Db': 'C#', 'C#': 'Db', 'Eb': 'D#', 'D#': 'Eb', 'Ab': 'G#', 'G#': 'Ab',
};
const FLAT_TO_SHARP: Record<string, string> = {
  Db: 'C#',
  Eb: 'D#',
  Ab: 'G#',
  Bb: 'A#',
};

const DIR_CYCLE: Direction[] = ['ascending', 'descending', 'both'];
const DIR_LABELS: Record<Direction, string> = { ascending: 'Asc', descending: 'Desc', both: 'Asc / Desc' };
const DIR_ICONS: Record<Direction, string> = { ascending: 'arrow_upward', descending: 'arrow_downward', both: 'swap_vert' };

const TYPE_LABELS: Record<ExerciseType, string> = { scale: 'Scale', pentascale: 'Pentascale', arpeggio: 'Arpeggio', chromatic: 'Chromatic' };

const MAX_CHORD_DISPLAY = 6;

type InlinePopover = 'key' | 'quality' | 'chord-style' | 'voicing' | 'chord-template' | null;
const VOICING_OPTIONS: Array<{ value: ChordVoicingStyle; label: string }> = [
  { value: 'root', label: 'Root Position' },
  { value: 'inv1', label: '1st Inversion' },
  { value: 'inv2', label: '2nd Inversion' },
  { value: 'open', label: 'Open Voicing' },
  { value: 'voice-leading', label: 'Voice Leading' },
];
const VOICING_LABELS: Record<ChordVoicingStyle, string> = {
  root: 'Root',
  inv1: '1st Inv',
  inv2: '2nd Inv',
  open: 'Open',
  'voice-leading': 'Voice Lead',
};

interface ExerciseMeta {
  type: ExerciseType;
  quality: 'major' | 'minor';
  key: Key;
  direction: Direction;
  octaves: number;
  subdivision: Subdivision;
}

const SLUG_TO_KEY: Record<string, Key> = {
  c: 'C',
  db: 'Db',
  df: 'Db', // backward compat with old slug style
  d: 'D',
  eb: 'Eb',
  ef: 'Eb', // backward compat with old slug style
  e: 'E',
  f: 'F',
  fs: 'F#',
  g: 'G',
  ab: 'Ab',
  af: 'Ab', // backward compat with old slug style
  a: 'A',
  bb: 'Bb',
  fb: 'Bb', // backward compat with old slug style
  b: 'B',
};

function parseExerciseId(id: string): ExerciseMeta | null {
  const tonal = id.match(/^(major|minor)-(scale|arpeggio|pentascale)-([a-z]{1,2})-(ascending|descending|both)-(\d+)-(\d+)$/);
  if (tonal) {
    const key = SLUG_TO_KEY[tonal[3]];
    if (!key) return null;
    return {
      quality: tonal[1] as 'major' | 'minor', type: tonal[2] as ExerciseType,
      key, direction: tonal[4] as Direction,
      octaves: parseInt(tonal[5]), subdivision: parseInt(tonal[6]) as Subdivision,
    };
  }
  const chrom = id.match(/^chromatic-([a-z]{1,2})-(ascending|descending|both)-(\d+)-(\d+)$/);
  if (chrom) {
    const key = SLUG_TO_KEY[chrom[1]];
    if (!key) return null;
    return {
      quality: 'major', type: 'chromatic',
      key, direction: chrom[2] as Direction,
      octaves: parseInt(chrom[3]), subdivision: parseInt(chrom[4]) as Subdivision,
    };
  }
  return null;
}

const ChipPopover: React.FC<{
  id?: string;
  anchor: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ id, anchor, open, onClose, children }) => {
  return (
    <Popover
      open={open}
      anchorEl={anchor}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      slotProps={{ paper: { className: 'np-popover', id } }}
    >
      {children}
    </Popover>
  );
};

interface CurrentlyPracticingProps {
  onLoadExercise: (event?: React.MouseEvent<HTMLElement>) => void;
  onLoadSong: (event?: React.MouseEvent<HTMLElement>) => void;
}

const CurrentlyPracticing: React.FC<CurrentlyPracticingProps> = ({ onLoadExercise, onLoadSong }) => {
  const { state, dispatch, engine, loadScore } = usePiano();
  const { score } = state;
  const { showTip, hideTip, tipPortal } = useMatTooltip();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editTempo, setEditTempo] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  const [popover, setPopover] = useState<InlinePopover>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);

  const exerciseMeta = useMemo<ExerciseMeta | null>(() => {
    if (!score || !state.isExerciseScore) return null;
    return parseExerciseId(score.id);
  }, [score, state.isExerciseScore]);
  const chordExerciseMeta = useMemo(() => {
    if (!score || !state.isExerciseScore) return null;
    if (score.exerciseConfig?.kind !== 'chord-progression') return null;
    return score.exerciseConfig;
  }, [score, state.isExerciseScore]);
  const [chordTemplateInput, setChordTemplateInput] = useState('');
  const [chordTemplateError, setChordTemplateError] = useState('');
  const [chordTemplateWarning, setChordTemplateWarning] = useState('');
  const chordTemplateSelectedPresetIndex = useMemo(() => {
    const normalizedInput = chordTemplateInput.trim();
    if (!normalizedInput) return null;
    const byNumerals = COMMON_CHORD_PROGRESSIONS.findIndex(
      (progression) => progression.progression.join('–') === normalizedInput
    );
    if (byNumerals >= 0) return byNumerals;
    const byName = COMMON_CHORD_PROGRESSIONS.findIndex(
      (progression) =>
        progression.name.toLowerCase() === normalizedInput.toLowerCase()
    );
    return byName >= 0 ? byName : null;
  }, [chordTemplateInput]);

  const scoreInfo = useMemo(() => {
    if (!score) return null;
    const maxMeasures = Math.max(...score.parts.map(p => p.measures.length));
    const beatsPerMeasure = score.timeSignature.numerator;
    const beatValue = score.timeSignature.denominator;

    let totalBeats = 0;
    const longestPart = score.parts.reduce((a, b) => a.measures.length >= b.measures.length ? a : b);
    for (const measure of longestPart.measures) {
      let measureBeats = 0;
      for (const note of measure.notes) {
        measureBeats += durationToBeats(note.duration, note.dotted);
      }
      totalBeats += Math.max(measureBeats, beatsPerMeasure * (4 / beatValue));
    }

    const secondsPerBeat = 60 / score.tempo;
    const totalSeconds = totalBeats * secondsPerBeat;
    const hasVocal = score.parts.some(p => p.hand === 'voice');
    const hasChords = score.parts.some(p => p.measures.some(m => m.notes.some(n => n.chordSymbol)));

    const chordSymbols: string[] = [];
    const seen = new Set<string>();
    for (const part of score.parts) {
      for (const m of part.measures) {
        for (const n of m.notes) {
          if (n.chordSymbol && !seen.has(n.chordSymbol)) {
            seen.add(n.chordSymbol);
            chordSymbols.push(n.chordSymbol);
          }
        }
      }
    }

    return {
      title: score.title || 'Untitled',
      measures: maxMeasures,
      duration: formatDuration(totalSeconds),
      key: score.key,
      tempo: score.tempo,
      timeSig: `${score.timeSignature.numerator}/${score.timeSignature.denominator}`,
      hasVocal,
      hasChords,
      chordSymbols,
      isExercise: state.isExerciseScore,
    };
  }, [score, state.isExerciseScore]);

  const startEditing = useCallback(() => {
    if (!score) return;
    setEditTitle(score.title || '');
    setEditTempo(String(score.tempo));
    setEditing(true);
  }, [score]);

  useEffect(() => {
    if (editing && titleRef.current) titleRef.current.focus();
  }, [editing]);

  const saveEdits = useCallback(() => {
    const newTempo = Math.max(20, Math.min(300, parseInt(editTempo) || score!.tempo));
    dispatch({ type: 'UPDATE_SCORE_META', title: editTitle.trim() || 'Untitled', tempo: newTempo });
    engine.setTempo(newTempo);
    setEditing(false);
  }, [editTitle, editTempo, score, dispatch, engine]);

  const cancelEditing = useCallback(() => { setEditing(false); }, []);

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveEdits();
    if (e.key === 'Escape') cancelEditing();
  }, [saveEdits, cancelEditing]);

  const transpose = useCallback((semitones: number) => {
    dispatch({ type: 'TRANSPOSE_SCORE', semitones });
  }, [dispatch]);

  const handleTransposeSelect = useCallback((newKey: Key) => {
    if (!score) return;
    const currentIdx = KEY_INDEX[score.key] ?? 0;
    const targetIdx = KEY_INDEX[newKey] ?? 0;
    const semitones = ((targetIdx - currentIdx) % 12 + 12) % 12;
    if (semitones !== 0) transpose(semitones);
  }, [score, transpose]);

  const reloadExercise = useCallback((overrides: Partial<ExerciseMeta>) => {
    if (!exerciseMeta) return;
    const m = { ...exerciseMeta, ...overrides };

    if (m.type === 'chromatic') {
      const note = FLAT_TO_SHARP[m.key] ?? m.key;
      const s = generateChromaticScore(note, m.direction, m.octaves, m.subdivision);
      if (s) { loadScore(s, { recordHistory: true }); dispatch({ type: 'SET_IS_EXERCISE', isExercise: true }); }
    } else {
      const validKeys = m.quality === 'major' ? MAJOR_KEYS : MINOR_KEYS;
      const k = (validKeys as readonly string[]).includes(m.key) ? m.key : (ENHARMONIC_MAP[m.key] as Key) ?? m.key;
      const s = generateExerciseScore(m.quality, m.type, k, m.direction, m.octaves, m.subdivision);
      if (s) { loadScore(s, { recordHistory: true }); dispatch({ type: 'SET_IS_EXERCISE', isExercise: true }); }
    }
    setPopover(null);
  }, [exerciseMeta, loadScore, dispatch]);

  const reloadChordExercise = useCallback(
    (overrides: Partial<{
      key: Key;
      styleId: ChordStyleId;
      progressionInput: string;
      voicingStyle: ChordVoicingStyle;
    }>) => {
      if (!score || !chordExerciseMeta) return;
      const baseInput =
        overrides.progressionInput ??
        chordExerciseMeta.progressionInput ??
        chordExerciseMeta.progressionNumerals.join('–');
      const baseKey = overrides.key ?? score.key;
      const parsed = parseProgressionText(baseInput, baseKey);
      if (!parsed.isValid || parsed.tokens.length < 1) {
        setChordTemplateError('Use I, I–V–vi–IV, or C–G–Am–F.');
        setChordTemplateWarning('');
        return;
      }
      if (parsed.romanNumerals.length < 1) {
        setChordTemplateWarning(
          'Progression is valid text but non-diatonic for the selected/inferred key.'
        );
        setChordTemplateError('');
        return;
      }
      const presetMatch = COMMON_CHORD_PROGRESSIONS.find(
        (progression) =>
          progression.progression.length === parsed.romanNumerals.length &&
          progression.progression.every(
            (token, index) => token === parsed.romanNumerals[index]
          )
      );
      const styleId = overrides.styleId ?? (chordExerciseMeta.styleId as ChordStyleId) ?? 'simple';
      const voicingStyle =
        overrides.voicingStyle ??
        ((chordExerciseMeta.voicingStyle as ChordVoicingStyle) ?? 'root');
      const nextKey = parsed.inferredKey ?? baseKey;
      const nextTempo = score.tempo;
      const progressionLabel =
        parsed.romanNumeralDisplay.length > 0
          ? parsed.romanNumeralDisplay.join('–')
          : parsed.romanNumerals.join('–') || 'Custom progression';
      const nextScore = generateChordProgressionScore({
        progression: parsed.romanNumerals as RomanNumeral[],
        chordSymbols: parsed.chordSymbols,
        progressionName: presetMatch?.name ?? progressionLabel ?? chordExerciseMeta.progressionName ?? 'Custom progression',
        progressionInput: baseInput,
        key: nextKey,
        voicingStyle,
        measuresPerChord: ((chordExerciseMeta.measuresPerChord as 1 | 2) ?? 1),
        timeSignature: { numerator: 4, denominator: 4 },
        styleId,
      });
      nextScore.tempo = nextTempo;
      loadScore(nextScore, { recordHistory: true });
      dispatch({ type: 'SET_IS_EXERCISE', isExercise: true });
      setChordTemplateError('');
      setChordTemplateWarning('');
      setPopover(null);
    },
    [score, chordExerciseMeta, loadScore, dispatch]
  );

  const openPopover = (type: InlinePopover, e: React.MouseEvent) => {
    setPopoverAnchor(e.currentTarget as HTMLElement);
    if (type === 'chord-template' && chordExerciseMeta) {
      setChordTemplateInput(
        chordExerciseMeta.progressionInput ??
          chordExerciseMeta.progressionNumerals.join('–')
      );
      setChordTemplateError('');
      setChordTemplateWarning('');
    }
    setPopover(popover === type ? null : type);
  };

  // Build a short exercise name from metadata (no redundant direction/octave/sub info)
  const exerciseShortName = useMemo(() => {
    if (!exerciseMeta) return null;
    const m = exerciseMeta;
    if (m.type === 'chromatic') return `${m.key} Chromatic`;
    const qual = m.quality === 'major' ? 'Major' : 'Minor';
    return `${m.key} ${qual} ${TYPE_LABELS[m.type]}`;
  }, [exerciseMeta]);

  if (!scoreInfo) {
    return (
      <div className="now-practicing np-empty">
        <span className="np-empty-text">No exercise loaded</span>
        <button className="np-switch-btn" onClick={() => onLoadExercise()}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>library_music</span>
          Choose Exercise
        </button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="now-practicing np-editing">
        <div className="np-edit-row">
          <label className="np-edit-label">Title</label>
          <input ref={titleRef} className="np-edit-input np-edit-title" value={editTitle}
            onChange={e => setEditTitle(e.target.value)} onKeyDown={handleEditKeyDown} placeholder="Song title" />
        </div>
        <div className="np-edit-row">
          <label className="np-edit-label">BPM</label>
          <input className="np-edit-input np-edit-bpm" type="number" min={20} max={300}
            value={editTempo} onChange={e => setEditTempo(e.target.value)} onKeyDown={handleEditKeyDown} />
          <label className="np-edit-label" style={{ marginLeft: 12 }}>Key</label>
          <select className="np-edit-select" value={score?.key ?? 'C'}
            onChange={e => handleTransposeSelect(e.target.value as Key)}>
            {ALL_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div className="np-edit-actions">
          <button className="np-edit-save" onClick={saveEdits}>Save</button>
          <button className="np-edit-cancel" onClick={cancelEditing}>Cancel</button>
        </div>
      </div>
    );
  }

  const isExercise = scoreInfo.isExercise;
  const meta = exerciseMeta;
  const isTonal = meta && meta.type !== 'chromatic';
  const keyPopoverId = 'np-key-popover';
  const chordStylePopoverId = 'np-chord-style-popover';
  const voicingPopoverId = 'np-voicing-popover';
  const chordTemplatePopoverId = 'np-chord-template-popover';

  return (
    <div className="now-practicing">
      <div className="np-main">
        <span className="material-symbols-outlined np-icon">
          {isExercise ? 'fitness_center' : 'music_note'}
        </span>
        {/* Fixed-width title to prevent layout shift */}
        <span className="np-title np-title-fixed">
          {isExercise && exerciseShortName ? exerciseShortName : scoreInfo.title}
        </span>

        <div className="np-meta">
          {isExercise && chordExerciseMeta ? (
            <>
              <button
                className="np-tag np-tag-interactive"
                onClick={e => openPopover('key', e)}
                aria-haspopup="dialog"
                aria-expanded={popover === 'key'}
                aria-controls={popover === 'key' ? keyPopoverId : undefined}
                onMouseEnter={e => showTip(e, 'Change key')}
                onMouseLeave={hideTip}
              >
                {scoreInfo.key}
              </button>
              <button
                className="np-tag np-tag-interactive"
                onClick={e => openPopover('chord-style', e)}
                aria-haspopup="dialog"
                aria-expanded={popover === 'chord-style'}
                aria-controls={popover === 'chord-style' ? chordStylePopoverId : undefined}
                onMouseEnter={e => showTip(e, 'Change chord style')}
                onMouseLeave={hideTip}
              >
                {CHORD_STYLE_OPTIONS.find(
                  s => s.id === (chordExerciseMeta.styleId as ChordStyleId)
                )?.label ?? 'Style'}
              </button>
              <button
                className="np-tag np-tag-interactive"
                onClick={e => openPopover('voicing', e)}
                aria-haspopup="dialog"
                aria-expanded={popover === 'voicing'}
                aria-controls={popover === 'voicing' ? voicingPopoverId : undefined}
                onMouseEnter={e => showTip(e, 'Change voicing')}
                onMouseLeave={hideTip}
              >
                {VOICING_LABELS[
                  ((chordExerciseMeta.voicingStyle as ChordVoicingStyle) ?? 'root')
                ]}
              </button>
              <button
                className="np-tag np-tag-interactive"
                onClick={e => openPopover('chord-template', e)}
                aria-haspopup="dialog"
                aria-expanded={popover === 'chord-template'}
                aria-controls={popover === 'chord-template' ? chordTemplatePopoverId : undefined}
                onMouseEnter={e =>
                  showTip(
                    e,
                    chordExerciseMeta.progressionInput ??
                      chordExerciseMeta.progressionNumerals.join(' – ')
                  )
                }
                onMouseLeave={hideTip}
              >
                {chordExerciseMeta.progressionName === 'Custom progression'
                  ? (
                    parseProgressionText(
                      chordExerciseMeta.progressionInput ??
                        chordExerciseMeta.progressionNumerals.join('–'),
                      scoreInfo.key as Key
                    ).romanNumeralDisplay.join('–') ||
                    chordExerciseMeta.progressionNumerals.join('–')
                  )
                  : chordExerciseMeta.progressionName}
              </button>
            </>
          ) : isExercise && meta ? (
            <>
              {/* Key chip — click to open popover (no arrow icon) */}
              <button className="np-tag np-tag-interactive" onClick={e => openPopover('key', e)}
                aria-haspopup="dialog"
                aria-expanded={popover === 'key'}
                aria-controls={popover === 'key' ? keyPopoverId : undefined}
                onMouseEnter={e => showTip(e, 'Change key')} onMouseLeave={hideTip}>
                {scoreInfo.key}
              </button>

              {/* Quality chip — toggle major/minor */}
              {isTonal && (
                <button className="np-tag np-tag-interactive" onClick={() => {
                  const newQ = meta.quality === 'major' ? 'minor' : 'major';
                  const validKeys = newQ === 'major' ? MAJOR_KEYS : MINOR_KEYS;
                  const k = (validKeys as readonly string[]).includes(meta.key) ? meta.key : (ENHARMONIC_MAP[meta.key] as Key) ?? meta.key;
                  reloadExercise({ quality: newQ, key: k });
                }} onMouseEnter={e => showTip(e, `Switch to ${meta.quality === 'major' ? 'minor' : 'major'}`)} onMouseLeave={hideTip}>
                  {meta.quality === 'major' ? 'Major' : 'Minor'}
                </button>
              )}

              {/* Direction chip — click to cycle */}
              <button className="np-tag np-tag-interactive" onClick={() => {
                const idx = DIR_CYCLE.indexOf(meta.direction);
                reloadExercise({ direction: DIR_CYCLE[(idx + 1) % DIR_CYCLE.length] });
              }} onMouseEnter={e => showTip(e, 'Cycle direction')} onMouseLeave={hideTip}>
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{DIR_ICONS[meta.direction]}</span>
                {DIR_LABELS[meta.direction]}
              </button>

              {/* Octaves chip */}
              <button className="np-tag np-tag-interactive" onClick={() => {
                reloadExercise({ octaves: (meta.octaves % 4) + 1 });
              }} onMouseEnter={e => showTip(e, `Octaves: ${meta.octaves} (click to change)`)} onMouseLeave={hideTip}>
                {meta.octaves} oct
              </button>

              {/* Subdivision chip */}
              <button className="np-tag np-tag-interactive" onClick={() => {
                reloadExercise({ subdivision: ((meta.subdivision % 4) + 1) as Subdivision });
              }} onMouseEnter={e => showTip(e, `Subdivisions: ${meta.subdivision} (click to change)`)} onMouseLeave={hideTip}>
                sub {meta.subdivision}
              </button>
            </>
          ) : (
            <>
              <span className="np-tag">{scoreInfo.key}</span>
              <span className="np-tag">{scoreInfo.timeSig}</span>
              <span className="np-tag">{scoreInfo.tempo} BPM</span>
              <span className="np-tag">{scoreInfo.measures} meas</span>
              <span className="np-tag">{scoreInfo.duration}</span>
              {scoreInfo.hasVocal && <span className="np-tag vocal">Vocal</span>}
              {scoreInfo.hasChords && <span className="np-tag chords">Chords</span>}
            </>
          )}

          {isExercise && scoreInfo.chordSymbols.length > 0 && (
            <span className="np-chord-prog"
              onPointerEnter={scoreInfo.chordSymbols.length > MAX_CHORD_DISPLAY ? (e => showTip(e as unknown as React.MouseEvent, scoreInfo.chordSymbols.join(' – '))) : undefined}
              onPointerLeave={scoreInfo.chordSymbols.length > MAX_CHORD_DISPLAY ? hideTip : undefined}>
              {scoreInfo.chordSymbols.slice(0, MAX_CHORD_DISPLAY).map((c, i) => (
                <span key={i} className="np-chord">{c}</span>
              ))}
              {scoreInfo.chordSymbols.length > MAX_CHORD_DISPLAY && (
                <span className="np-chord np-chord-more">+{scoreInfo.chordSymbols.length - MAX_CHORD_DISPLAY}</span>
              )}
            </span>
          )}
        </div>

        <div className="np-actions">
          {!isExercise && (
            <button className="np-edit-btn np-edit-btn-visible" onClick={startEditing}
              onMouseEnter={e => showTip(e, 'Edit song settings')} onMouseLeave={hideTip}>
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>edit</span>
            </button>
          )}
          <button
            className="np-switch-btn np-switch-btn-icon"
            onClick={(event) => onLoadExercise(event)}
            onMouseEnter={e => showTip(e, 'Load Exercise')} onMouseLeave={hideTip}
            aria-label="Load Exercise"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>fitness_center</span>
            Exercise
          </button>
          <button
            className="np-switch-btn np-switch-btn-icon"
            onClick={(event) => onLoadSong(event)}
            onMouseEnter={e => showTip(e, 'Load Song')} onMouseLeave={hideTip}
            aria-label="Load Song"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>library_music</span>
            Song
          </button>
        </div>
      </div>

      <ChipPopover id={keyPopoverId} anchor={popoverAnchor} open={popover === 'key'} onClose={() => setPopover(null)}>
        <KeyInputMenu
          value={scoreInfo.key as unknown as MusicKey}
          onSelect={(next) =>
            chordExerciseMeta
              ? reloadChordExercise({ key: next as unknown as Key })
              : reloadExercise({ key: next as unknown as Key })
          }
          className="np-key-grid"
        />
      </ChipPopover>

      <ChipPopover
        id={chordStylePopoverId}
        anchor={popoverAnchor}
        open={popover === 'chord-style'}
        onClose={() => setPopover(null)}
      >
        {chordExerciseMeta ? (
          <div className="ep-group np-pop-section np-pop-section-sm">
            <label className="ep-group-label">Style</label>
            <ChordStyleSelector
              selectedStyle={
                ((chordExerciseMeta.styleId as ChordStyleId) ?? 'simple')
              }
              onSelectStyle={(styleId) => reloadChordExercise({ styleId })}
            />
          </div>
        ) : null}
      </ChipPopover>

      <ChipPopover
        id={voicingPopoverId}
        anchor={popoverAnchor}
        open={popover === 'voicing'}
        onClose={() => setPopover(null)}
      >
        {chordExerciseMeta ? (
          <div className="ep-group np-pop-section np-pop-section-sm">
            <label className="ep-group-label">Voicing</label>
            <div className="np-pop-keys">
              {VOICING_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={`np-pop-key ${
                    (((chordExerciseMeta.voicingStyle as ChordVoicingStyle) ?? 'root') === option.value)
                      ? 'active'
                      : ''
                  }`}
                  onClick={() => reloadChordExercise({ voicingStyle: option.value })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </ChipPopover>

      <ChipPopover
        id={chordTemplatePopoverId}
        anchor={popoverAnchor}
        open={popover === 'chord-template'}
        onClose={() => setPopover(null)}
      >
        {chordExerciseMeta ? (
          <div className="ep-group np-pop-section np-pop-section-lg">
            <label className="ep-group-label">Progression</label>
            <ChordProgressionSelector
              value={chordTemplateInput}
              selectedProgression={chordTemplateSelectedPresetIndex}
              listId="np-chord-template-presets"
              keyContext={score?.key}
              menuMode="inline"
              appearance="piano"
              presetColumns={2}
              inlineMenuClassName="np-chord-template-inline-menu"
              error={chordTemplateError}
              warning={chordTemplateWarning}
              onInputChange={(value) => {
                setChordTemplateInput(value);
                setChordTemplateError('');
                setChordTemplateWarning('');
              }}
              onSelectPreset={(index) => {
                const preset = COMMON_CHORD_PROGRESSIONS[index];
                if (!preset) return;
                const progressionInput = preset.progression.join('–');
                setChordTemplateInput(progressionInput);
                setChordTemplateError('');
                setChordTemplateWarning('');
                reloadChordExercise({ progressionInput });
              }}
              onEnter={() =>
                reloadChordExercise({ progressionInput: chordTemplateInput })
              }
            />
          </div>
        ) : null}
      </ChipPopover>

      {tipPortal}
    </div>
  );
};

export default CurrentlyPracticing;
