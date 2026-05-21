import { colorStateToHex } from '../../scoring/perceptualScore';
import type { PracticeReveal } from '../../types';

interface BridgeRevealProps {
  reveal: Extract<PracticeReveal, { kind: 'bridge' }>;
}

export default function BridgeReveal({ reveal }: BridgeRevealProps): React.ReactElement {
  const { challenge, userSteps, passed, closenessPct } = reveal;
  const icon = passed ? 'check_circle' : 'cancel';

  return (
    <div
      className={`sight-match-reveal sight-bridge-reveal ${passed ? 'sight-match-reveal--pass' : 'sight-match-reveal--fail'}`}
      role="status"
      aria-live="polite"
    >
      <p className="sight-metrics">Your fills vs reference (empty slots)</p>
      <div className="sight-bridge-reveal__rows">
        {challenge.emptyIndices.map((i) => (
          <div key={i} className="sight-bridge-reveal__row">
            <span className="sight-bridge-reveal__slot-label">Step {i + 1}</span>
            <div className="sight-bridge-reveal__pair">
              <div>
                <span className="sight-match-reveal__label">Reference</span>
                <div
                  className="sight-swatch"
                  style={{ background: colorStateToHex(challenge.referenceSteps[i]!) }}
                />
              </div>
              <div>
                <span className="sight-match-reveal__label">Yours</span>
                <div
                  className="sight-swatch"
                  style={{ background: colorStateToHex(userSteps[i]!) }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="sight-match-reveal__verdict">
        <span className="material-symbols-outlined sight-match-reveal__icon" aria-hidden>
          {icon}
        </span>
        <span className="sight-match-reveal__verdict-text">{passed ? 'Pass' : 'Not yet'}</span>
        <span className="sight-match-reveal__grade">{Math.round(closenessPct)}% closeness</span>
      </div>
    </div>
  );
}
