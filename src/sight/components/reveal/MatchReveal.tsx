import { useEffect, useState } from 'react';
import MatchAxisReadout from '../MatchAxisReadout';
import type { ColorState } from '../../types';

export interface MatchRevealProps {
  target: ColorState;
  input: ColorState;
  targetHex: string;
  inputHex: string;
  passed: boolean;
  accuracyRating: number;
  deltaE: number;
  locked: { hue: boolean; chroma: boolean };
  /**
   * Side-by-side intro: start with gap and borders, then animate flush so the
   * user can see how close the colors really are.
   */
  mergeReveal?: boolean;
}

export default function MatchReveal({
  target,
  input,
  targetHex,
  inputHex,
  passed,
  accuracyRating,
  deltaE,
  mergeReveal = false,
  locked,
}: MatchRevealProps): React.ReactElement {
  const [merged, setMerged] = useState(!mergeReveal);

  useEffect(() => {
    if (!mergeReveal) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setMerged(true);
      return;
    }
    const holdMs = 400;
    const id = window.setTimeout(() => setMerged(true), holdMs);
    return () => window.clearTimeout(id);
  }, [mergeReveal]);

  const verdict = passed ? 'Pass' : 'Not yet';
  const icon = passed ? 'check_circle' : 'cancel';

  const pairClass = [
    'sight-flush-pair',
    mergeReveal ? 'sight-flush-pair--merge-reveal' : '',
    mergeReveal ? (merged ? 'sight-flush-pair--merged' : 'sight-flush-pair--separated') : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={`sight-match-reveal ${passed ? 'sight-match-reveal--pass' : 'sight-match-reveal--fail'}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="sight-match-reveal__flush sight-neutral-panel">
        <div className={pairClass} aria-label="Target and your match, side by side">
          <div className="sight-flush-pair__col">
            <span className="sight-match-reveal__label">Target</span>
            <div className="sight-flush-swatch" style={{ background: targetHex }} />
          </div>
          <div className="sight-flush-pair__col">
            <span className="sight-match-reveal__label">Yours</span>
            <div className="sight-flush-swatch" style={{ background: inputHex }} />
          </div>
        </div>
      </div>
      <div className="sight-match-reveal__verdict">
        <span className="material-symbols-outlined sight-match-reveal__icon" aria-hidden>
          {icon}
        </span>
        <span className="sight-match-reveal__verdict-text">{verdict}</span>
        <span className="sight-match-reveal__grade">{Math.round(accuracyRating)}% accuracy</span>
        <span className="sight-match-reveal__delta">ΔE {deltaE.toFixed(2)}</span>
      </div>
      <MatchAxisReadout target={target} input={input} locked={locked} passed={passed} />
    </div>
  );
}
