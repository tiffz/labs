import { useMemo } from 'react';
import Typography from '@mui/material/Typography';
import MatchReveal from '../../components/reveal/MatchReveal';
import OklchSliders from '../../components/OklchSliders';
import { getLevelConfig } from '../../levels';
import { calculatePerceptualScore, colorStateToHex } from '../../scoring/perceptualScore';
import type { ColorState, ContextualChallenge, PracticeReveal } from '../../types';

interface ContextualMatcherViewProps {
  challenge: ContextualChallenge;
  level: number;
  input: ColorState;
  onInputChange: (next: ColorState) => void;
  showLiveMetrics?: boolean;
  reveal: PracticeReveal | null;
  interactionDisabled?: boolean;
}

export default function ContextualMatcherView({
  challenge,
  level,
  input,
  onInputChange,
  showLiveMetrics = false,
  reveal,
  interactionDisabled = false,
}: ContextualMatcherViewProps): React.ReactElement {
  const maxDe = getLevelConfig(level).maxDeltaE ?? 5;
  const live = useMemo(
    () => calculatePerceptualScore(challenge.target, input, maxDe),
    [challenge.target, input, maxDe],
  );
  const bgHex = colorStateToHex(challenge.background);
  const targetHex = colorStateToHex(challenge.target);
  const isFlat = challenge.display === 'flat';

  if (reveal?.kind === 'contextual') {
    return (
      <div className="sight-workspace">
        <div className="sight-canvas-zone sight-canvas-zone--full">
          <MatchReveal
            targetHex={reveal.targetHex}
            inputHex={reveal.inputHex}
            passed={reveal.passed}
            accuracyRating={reveal.accuracyRating}
            deltaE={reveal.deltaE}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`sight-workspace ${interactionDisabled ? 'sight-workspace--dimmed' : ''}`}>
      <div className="sight-canvas-zone">
        <div
          className={`sight-contextual-stage ${isFlat ? 'sight-contextual-stage--flat' : ''}`}
          aria-label={isFlat ? 'Target swatch on neutral gray' : 'Target swatch in context'}
        >
          <div className="sight-contextual-bg" style={{ background: bgHex }} />
          <div className="sight-contextual-frame">
            <div className="sight-contextual-target" style={{ background: targetHex }} />
          </div>
        </div>
      </div>
      <div className="sight-control-zone">
        <Typography variant="subtitle2">
          {isFlat ? 'Match the swatch' : 'Match the swatch on neutral gray'}
        </Typography>
        <OklchSliders
          value={input}
          onChange={onInputChange}
          locked={challenge.locked}
          disabled={interactionDisabled}
        />
        {showLiveMetrics ? (
          <p className="sight-metrics">
            ΔE <strong>{live.deltaE.toFixed(2)}</strong> · Accuracy{' '}
            <strong>{Math.round(live.accuracyRating)}%</strong>
          </p>
        ) : isFlat ? (
          <Typography variant="body2" color="text.secondary">
            Same gray behind both swatches. Adjust lightness, then submit.
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Adjust the sliders, then submit. Your score appears after you submit.
          </Typography>
        )}
      </div>
    </div>
  );
}
