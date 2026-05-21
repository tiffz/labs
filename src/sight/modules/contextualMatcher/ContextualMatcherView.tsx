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
  const inputHex = colorStateToHex(input);
  const isAdjacent = challenge.display === 'adjacent';
  const isFlat = challenge.display === 'flat';

  if (reveal?.kind === 'contextual') {
    return (
      <div className="sight-workspace">
        <div className="sight-canvas-zone sight-canvas-zone--full">
          <MatchReveal
            target={reveal.target}
            input={reveal.input}
            targetHex={reveal.targetHex}
            inputHex={reveal.inputHex}
            passed={reveal.passed}
            accuracyRating={reveal.accuracyRating}
            deltaE={reveal.deltaE}
            mergeReveal={challenge.display === 'adjacent'}
            locked={challenge.locked}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`sight-workspace ${interactionDisabled ? 'sight-workspace--dimmed' : ''}`}>
      <div className="sight-canvas-zone">
        {isAdjacent ? (
          <div
            className="sight-contextual-stage sight-contextual-stage--adjacent sight-neutral-panel"
            aria-label="Target and your swatch side by side on neutral gray"
          >
            <div className="sight-contextual-bg" style={{ background: bgHex }} />
            <div className="sight-adjacent-pair" aria-label="Target and your swatch side by side">
              <div className="sight-adjacent-pair__col">
                <span className="sight-match-reveal__label">Target</span>
                <div className="sight-adjacent-swatch" style={{ background: targetHex }} />
              </div>
              <div className="sight-adjacent-pair__col">
                <span className="sight-match-reveal__label">Yours</span>
                <div className="sight-adjacent-swatch" style={{ background: inputHex }} />
              </div>
            </div>
          </div>
        ) : (
          <div
            className={`sight-contextual-stage ${isFlat ? 'sight-contextual-stage--flat' : ''}`}
            aria-label={isFlat ? 'Target swatch on neutral gray' : 'Target swatch in context'}
          >
            <div className="sight-contextual-bg" style={{ background: bgHex }} />
            <div className="sight-contextual-frame">
              <div className="sight-contextual-target" style={{ background: targetHex }} />
            </div>
          </div>
        )}
      </div>
      <div className="sight-control-zone">
        <Typography variant="subtitle2">
          {isAdjacent
            ? 'Match the swatches'
            : isFlat
              ? 'Match the swatch'
              : 'Match the swatch on neutral gray'}
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
        ) : isAdjacent ? (
          <Typography variant="body2" color="text.secondary">
            Both swatches sit on the same gray. Adjust lightness until they match, then submit.
          </Typography>
        ) : isFlat ? (
          <Typography variant="body2" color="text.secondary">
            Target on gray above. Adjust lightness in the preview, then submit.
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
