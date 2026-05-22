import { colorStateToHex } from '../../scoring/perceptualScore';
import CompactVerdict from './CompactVerdict';
import type { PracticeReveal } from '../../types';

interface BridgeRevealProps {
  reveal: Extract<PracticeReveal, { kind: 'bridge' }>;
}

export default function BridgeReveal({ reveal }: BridgeRevealProps): React.ReactElement {
  const { challenge, userSteps, passed, closenessPct } = reveal;

  return (
    <div
      className={`sight-match-reveal sight-bridge-reveal ${passed ? 'sight-match-reveal--pass' : 'sight-match-reveal--fail'}`}
      role="status"
      aria-live="polite"
    >
      <div className="sight-bridge-reveal__rows">
        {challenge.emptyIndices.map((i) => (
          <div key={i} className="sight-bridge-reveal__row">
            <div className="sight-bridge-reveal__pair" aria-label={`Step ${i + 1} reference and your fill`}>
              <div
                className="sight-bridge-reveal__swatch"
                style={{ background: colorStateToHex(challenge.referenceSteps[i]!) }}
                title="Reference"
              />
              <div
                className="sight-bridge-reveal__swatch"
                style={{ background: colorStateToHex(userSteps[i]!) }}
                title="Yours"
              />
            </div>
          </div>
        ))}
      </div>
      <CompactVerdict
        passed={passed}
        label={passed ? 'Pass' : 'Not yet'}
        score={`${Math.round(closenessPct)}%`}
        scoreSuffix="closeness"
      />
    </div>
  );
}
