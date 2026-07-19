import { useCallback } from 'react';
import BpmInput from '../../shared/components/music/BpmInput';

interface BpmControlProps {
  bpm: number;
  onChange: (bpm: number) => void;
}

const MIN_BPM = 20;
const MAX_BPM = 300;

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
  return Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(v)));
}

/**
 * Count's tempo panel — tempo-marking caption + shared BpmInput stepper, with an
 * always-visible slider for live tempo sweeps while practicing.
 */
export function BpmControl({ bpm, onChange }: BpmControlProps) {
  const handleSlider = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(clamp(parseFloat(e.target.value)));
    },
    [onChange],
  );

  return (
    <div className="pulse-bpm">
      <div className="pulse-tempo-marking" title={getTempoMarking(bpm).english}>
        {getTempoMarking(bpm).italian}
      </div>

      <BpmInput
        value={bpm}
        onChange={(next) => onChange(clamp(next))}
        min={MIN_BPM}
        max={MAX_BPM}
        className="count-bpm-input"
        dropdownClassName="count-bpm-dropdown"
      />

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
    </div>
  );
}
