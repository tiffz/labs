import React, { useState, useCallback, useRef, useEffect } from 'react';
import { usePiano } from '../store';
import {
  generateExerciseScore, generateChromaticScore,
  MAJOR_KEYS, MINOR_KEYS, CHROMATIC_NOTES,
  type Direction, type ExerciseType, type Subdivision,
} from '../data/scales';
import type { Key } from '../types';

type TonalType = 'scale' | 'arpeggio' | 'pentascale';

const TYPE_OPTIONS: { value: ExerciseType; label: string }[] = [
  { value: 'scale',      label: 'Natural' },
  { value: 'pentascale', label: 'Pentascale' },
  { value: 'arpeggio',   label: 'Arpeggio' },
  { value: 'chromatic',  label: 'Chromatic' },
];

const DIR_OPTIONS: { value: Direction; icon: string; tip: string }[] = [
  { value: 'ascending',  icon: 'arrow_upward',   tip: 'Ascending' },
  { value: 'descending', icon: 'arrow_downward',  tip: 'Descending' },
  { value: 'both',       icon: 'swap_vert',       tip: 'Ascending & Descending' },
];

const TYPE_LABELS: Record<ExerciseType, string> = {
  scale: 'Scale', pentascale: 'Pentascale', arpeggio: 'Arpeggio', chromatic: 'Chromatic',
};

const DIR_LABELS: Record<Direction, string> = {
  ascending: 'Asc', descending: 'Desc', both: 'Asc+Desc',
};

const PresetLibrary: React.FC = () => {
  const { loadScore } = usePiano();
  const [expanded, setExpanded] = useState(true);
  const [hasSelection, setHasSelection] = useState(true);
  const [exerciseType, setExerciseType] = useState<ExerciseType>('scale');
  const [quality, setQuality] = useState<'major' | 'minor'>('major');
  const [direction, setDirection] = useState<Direction>('both');
  const [octaves, setOctaves] = useState(1);
  const [subdivision, setSubdivision] = useState<Subdivision>(1);
  const [selectedKey, setSelectedKey] = useState<Key>('C');
  const [chromaticNote, setChromaticNote] = useState('C');

  const loadTonal = useCallback((q: 'major' | 'minor', key: Key, type: TonalType, dir: Direction, oct: number, sub: Subdivision) => {
    const score = generateExerciseScore(q, type, key, dir, oct, sub);
    if (score) loadScore(score);
  }, [loadScore]);

  const loadChromatic = useCallback((note: string, dir: Direction, oct: number, sub: Subdivision) => {
    const score = generateChromaticScore(note, dir, oct, sub);
    if (score) loadScore(score);
  }, [loadScore]);

  const reload = useCallback(() => {
    if (!hasSelection) return;
    if (exerciseType === 'chromatic') {
      loadChromatic(chromaticNote, direction, octaves, subdivision);
    } else {
      loadTonal(quality, selectedKey, exerciseType as TonalType, direction, octaves, subdivision);
    }
  }, [exerciseType, quality, selectedKey, direction, octaves, subdivision, chromaticNote, loadTonal, loadChromatic, hasSelection]);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    reload();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction, octaves, subdivision, quality, exerciseType]);

  const handleTypeChange = (type: ExerciseType) => {
    setExerciseType(type);
    setExpanded(true);
    if (type === 'chromatic') {
      setSubdivision(prev => prev === 1 ? 2 : prev);
    }
  };

  const handleKeyClick = (key: Key) => {
    setSelectedKey(key);
    setHasSelection(true);
    loadTonal(quality, key, exerciseType as TonalType, direction, octaves, subdivision);
  };

  const handleChromaticClick = (note: string) => {
    setChromaticNote(note);
    setHasSelection(true);
    loadChromatic(note, direction, octaves, subdivision);
  };

  const isTonal = exerciseType !== 'chromatic';
  const keys = quality === 'major' ? MAJOR_KEYS : MINOR_KEYS;

  const summaryText = hasSelection
    ? (isTonal
      ? `${selectedKey} ${quality === 'major' ? 'Maj' : 'Min'} ${TYPE_LABELS[exerciseType]}`
      : `Chromatic from ${chromaticNote}`)
    : null;

  return (
    <div className={`exercises-panel ${expanded ? 'expanded' : ''}`}>
      <div className="exercises-header-row" onClick={() => setExpanded(v => !v)}>
        <span className="material-symbols-outlined ex-toggle-icon">
          {expanded ? 'expand_more' : 'chevron_right'}
        </span>
        <span className="exercises-title">Exercises</span>
        {summaryText && !expanded && (
          <span className="ex-summary-chip">{summaryText} · {DIR_LABELS[direction]}{octaves > 1 ? ` · ${octaves} oct` : ''}{subdivision > 1 ? ` · sub ${subdivision}` : ''}</span>
        )}
      </div>

      {expanded && (
        <div className="ex-body">
          <div className="ex-type-bar">
            {TYPE_OPTIONS.map(t => (
              <button
                key={t.value}
                className={`ex-type-btn ${exerciseType === t.value ? 'active' : ''}`}
                onClick={() => handleTypeChange(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="ex-modifiers">
            {isTonal && (
              <div className="ex-quality-toggle">
                <button
                  className={`ex-qual-btn ${quality === 'major' ? 'active' : ''}`}
                  onClick={() => setQuality('major')}
                >Major</button>
                <button
                  className={`ex-qual-btn ${quality === 'minor' ? 'active' : ''}`}
                  onClick={() => setQuality('minor')}
                >Minor</button>
              </div>
            )}

            <div className="ex-dir-group">
              {DIR_OPTIONS.map(d => (
                <button
                  key={d.value}
                  className={`ex-mod-btn ${direction === d.value ? 'active' : ''}`}
                  onClick={() => setDirection(d.value)}
                  title={d.tip}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{d.icon}</span>
                </button>
              ))}
            </div>

            <div className="ex-mod-group">
              <span className="ex-mod-label">Oct</span>
              {[1, 2, 3, 4].map(n => (
                <button
                  key={n}
                  className={`ex-mod-btn ${octaves === n ? 'active' : ''}`}
                  onClick={() => setOctaves(n)}
                >
                  {n}
                </button>
              ))}
            </div>

            <div className="ex-mod-group">
              <span className="ex-mod-label">Sub</span>
              {([1, 2, 3, 4] as Subdivision[]).map(n => (
                <button
                  key={n}
                  className={`ex-mod-btn ${subdivision === n ? 'active' : ''}`}
                  onClick={() => setSubdivision(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="ex-keys-section">
            {isTonal ? (
              <div className="ex-keys">
                {keys.map(k => (
                  <button
                    key={k}
                    className={`ex-key-btn ${selectedKey === k ? 'active' : ''}`}
                    onClick={() => handleKeyClick(k)}
                  >
                    {k}
                  </button>
                ))}
              </div>
            ) : (
              <div className="ex-keys">
                {CHROMATIC_NOTES.map(n => (
                  <button
                    key={n}
                    className={`ex-key-btn ${chromaticNote === n ? 'active' : ''}`}
                    onClick={() => handleChromaticClick(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PresetLibrary;
