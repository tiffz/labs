import React from 'react';
import type { RhythmTemplateVariation } from '../rhythm/presetDatabase';
import './notationMini.css';

export interface RhythmTemplateVariationControlsProps {
  presetLabel: string;
  variations: readonly RhythmTemplateVariation[];
  activeVariationIndex: number;
  onPrevious: () => void;
  onNext: () => void;
  className?: string;
}

/**
 * Previous / next carousel for preset rhythm variations (e.g. Maqsum ka ornaments).
 * Shared by DrumAccompaniment, DrumNotationMini, and Words in Rhythm.
 */
export function RhythmTemplateVariationControls({
  presetLabel,
  variations,
  activeVariationIndex,
  onPrevious,
  onNext,
  className,
}: RhythmTemplateVariationControlsProps): React.ReactElement | null {
  if (variations.length <= 1) return null;

  const displayIndex = Math.max(0, activeVariationIndex);

  return (
    <div className={['rhythm-template-variation', className].filter(Boolean).join(' ')}>
      <div className="rhythm-template-variation-controls">
        <span className="rhythm-template-variation-counter">
          {`Variation ${displayIndex + 1}/${variations.length} · ${presetLabel}`}
        </span>
        <div className="rhythm-template-variation-arrows">
          <button
            type="button"
            className="rhythm-template-variation-arrow"
            aria-label="Previous variation"
            onClick={onPrevious}
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button
            type="button"
            className="rhythm-template-variation-arrow"
            aria-label="Next variation"
            onClick={onNext}
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  );
}
