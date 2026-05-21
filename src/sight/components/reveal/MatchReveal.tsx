import { useEffect, useState } from 'react';

export interface MatchRevealProps {
  targetHex: string;
  inputHex: string;
  passed: boolean;
  accuracyRating: number;
  deltaE: number;
}

export default function MatchReveal({
  targetHex,
  inputHex,
  passed,
  accuracyRating,
  deltaE,
}: MatchRevealProps): React.ReactElement {
  const [slideIn, setSlideIn] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setSlideIn(true);
      return;
    }
    const id = requestAnimationFrame(() => setSlideIn(true));
    return () => cancelAnimationFrame(id);
  }, [inputHex, targetHex]);

  const verdict = passed ? 'Pass' : 'Not yet';
  const icon = passed ? 'check_circle' : 'cancel';

  return (
    <div
      className={`sight-match-reveal ${passed ? 'sight-match-reveal--pass' : 'sight-match-reveal--fail'}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="sight-match-reveal__pair sight-neutral-panel">
        <div className="sight-match-reveal__swatch-wrap">
          <span className="sight-match-reveal__label">Target</span>
          <div className="sight-match-reveal__swatch" style={{ background: targetHex }} />
        </div>
        <div className="sight-match-reveal__swatch-wrap">
          <span className="sight-match-reveal__label">Your match</span>
          <div
            className={`sight-match-reveal__swatch sight-match-reveal__swatch--user ${slideIn ? 'sight-match-reveal__swatch--slid' : ''}`}
            style={{ background: inputHex }}
          />
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
    </div>
  );
}
