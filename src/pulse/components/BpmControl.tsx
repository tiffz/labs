import { useState, useCallback } from 'react';

interface BpmControlProps {
  bpm: number;
  onChange: (bpm: number) => void;
}

const MIN_BPM = 20;
const MAX_BPM = 300;

const COMMON_BPMS = [60, 72, 80, 90, 100, 108, 120, 132, 140, 160, 180, 200];

const TEMPO_MARKINGS: Array<{ min: number; max: number; italian: string; english: string }> = [
  { min: 0,   max: 40,  italian: 'Larghissimo', english: 'Very broad' },
  { min: 40,  max: 52,  italian: 'Largo',        english: 'Broad' },
  { min: 52,  max: 60,  italian: 'Lento',        english: 'Slow' },
  { min: 60,  max: 76,  italian: 'Adagio',       english: 'At ease' },
  { min: 76,  max: 88,  italian: 'Andante',      english: 'Flowing' },
  { min: 88,  max: 100, italian: 'Moderato',     english: 'Moderate' },
  { min: 100, max: 112, italian: 'Allegretto',   english: 'Slightly lively' },
  { min: 112, max: 140, italian: 'Allegro',      english: 'Lively' },
  { min: 140, max: 168, italian: 'Vivace',       english: 'Fast' },
  { min: 168, max: 188, italian: 'Presto',       english: 'Hurried' },
  { min: 188, max: Infinity, italian: 'Prestissimo', english: 'Very fast' },
];

function getTempoMarking(bpm: number): { italian: string; english: string } {
  return TEMPO_MARKINGS.find((t) => bpm >= t.min && bpm < t.max) ?? TEMPO_MARKINGS[TEMPO_MARKINGS.length - 1];
}

function clamp(v: number) {
  return Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(v * 10) / 10));
}

export function BpmControl({ bpm, onChange }: BpmControlProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const handleSlider = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(clamp(parseFloat(e.target.value)));
    },
    [onChange],
  );

  const startEdit = () => {
    setEditValue(String(Math.round(bpm)));
    setEditing(true);
  };

  const commitEdit = () => {
    setEditing(false);
    const parsed = parseFloat(editValue);
    if (!isNaN(parsed)) onChange(clamp(parsed));
  };

  return (
    <div className="pulse-bpm">
      <div className="pulse-tempo-marking" title={getTempoMarking(bpm).english}>
        {getTempoMarking(bpm).italian}
      </div>
      <div className="pulse-bpm-top">
        {editing ? (
          <input
            className="pulse-bpm-input"
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
            min={MIN_BPM}
            max={MAX_BPM}
            autoFocus
            aria-label="BPM value"
          />
        ) : (
          <button
            className="pulse-bpm-display"
            onClick={startEdit}
            title="Click to type a BPM"
            type="button"
          >
            {bpm.toFixed(0)}
          </button>
        )}
        <span className="pulse-bpm-label">BPM</span>
      </div>

      <input
        type="range"
        className="pulse-bpm-slider"
        min={MIN_BPM}
        max={MAX_BPM}
        step={1}
        value={bpm}
        onChange={handleSlider}
        aria-label="BPM slider"
      />

      <div className="pulse-bpm-actions">
        <button className="pulse-bpm-btn" onClick={() => onChange(clamp(bpm / 2))} type="button" title="Halve BPM">÷2</button>
        <button className="pulse-bpm-btn" onClick={() => onChange(clamp(bpm - 1))} type="button" title="Decrease by 1">−1</button>
        <button className="pulse-bpm-btn" onClick={() => onChange(clamp(bpm + 1))} type="button" title="Increase by 1">+1</button>
        <button className="pulse-bpm-btn" onClick={() => onChange(clamp(bpm * 2))} type="button" title="Double BPM">×2</button>
      </div>

      <div className="pulse-bpm-presets">
        {COMMON_BPMS.map((v) => (
          <button
            key={v}
            className={`pulse-bpm-preset ${bpm === v ? 'is-active' : ''}`}
            onClick={() => onChange(v)}
            type="button"
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
