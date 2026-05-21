import type { PracticeReveal } from '../../types';

interface GamutRevealProps {
  reveal: Extract<PracticeReveal, { kind: 'gamut' }>;
}

export default function GamutReveal({ reveal }: GamutRevealProps): React.ReactElement {
  const { passed, overlapPct, minPct } = reveal;
  const icon = passed ? 'check_circle' : 'cancel';

  return (
    <div
      className={`sight-match-reveal sight-gamut-reveal ${passed ? 'sight-match-reveal--pass' : 'sight-match-reveal--fail'}`}
      role="status"
      aria-live="polite"
    >
      <div className="sight-match-reveal__verdict">
        <span className="material-symbols-outlined sight-match-reveal__icon" aria-hidden>
          {icon}
        </span>
        <span className="sight-match-reveal__verdict-text">{passed ? 'Pass' : 'Not yet'}</span>
        <span className="sight-match-reveal__grade">
          {Math.round(overlapPct)}% overlap (need {minPct}%)
        </span>
      </div>
    </div>
  );
}
