import CompactVerdict from './CompactVerdict';
import type { PracticeReveal } from '../../types';

interface GamutRevealProps {
  reveal: Extract<PracticeReveal, { kind: 'gamut' }>;
}

export default function GamutReveal({ reveal }: GamutRevealProps): React.ReactElement {
  const { passed, overlapPct, minPct } = reveal;

  return (
    <div
      className={`sight-match-reveal sight-gamut-reveal ${passed ? 'sight-match-reveal--pass' : 'sight-match-reveal--fail'}`}
      role="status"
      aria-live="polite"
    >
      <CompactVerdict
        passed={passed}
        label={passed ? 'Pass' : 'Not yet'}
        detail={`${Math.round(overlapPct)}% / ${minPct}%`}
      />
    </div>
  );
}
