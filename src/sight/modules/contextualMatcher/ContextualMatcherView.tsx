import { useMemo } from 'react';
import Typography from '@mui/material/Typography';
import MatchReveal from '../../components/reveal/MatchReveal';
import OklchSliders from '../../components/OklchSliders';
import { getLevelConfig } from '../../levels';
import { calculatePerceptualScore, colorStateToHex } from '../../scoring/perceptualScore';
import type { ColorState, ContextualChallenge, PracticeReveal } from '../../types';

function contextualMatchTitle(challenge: ContextualChallenge): string {
  if (challenge.display === 'adjacent') return 'Match the swatches';
  if (challenge.display === 'flat') return 'Match the swatch';
  const { locked } = challenge;
  if (locked.lightness && !locked.chroma && locked.hue) return 'Match the saturation in context';
  if (!locked.lightness && !locked.chroma && locked.hue) return 'Match value and saturation in context';
  if (locked.lightness && locked.chroma && !locked.hue) return 'Match the hue in context';
  return 'Match the swatch on neutral gray';
}

function contextualMatchHint(challenge: ContextualChallenge): string {
  if (challenge.display === 'adjacent') {
    return 'Both swatches sit on the same gray. Adjust lightness until they match, then submit.';
  }
  if (challenge.display === 'flat') {
    return 'Target on gray above. Adjust lightness in the preview, then submit.';
  }
  const { locked } = challenge;
  if (locked.lightness && !locked.chroma && locked.hue) {
    return 'The field shifts how vivid the target reads. Adjust chroma only, then submit.';
  }
  if (!locked.lightness && !locked.chroma && locked.hue) {
    return 'Match lightness and chroma together. Hue stays fixed, then submit.';
  }
  if (locked.lightness && locked.chroma && !locked.hue) {
    return 'Value and saturation are set. Adjust hue until the swatch matches, then submit.';
  }
  return 'Adjust the sliders, then submit. Your score appears after you submit.';
}

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
          {contextualMatchTitle(challenge)}
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
        ) : (
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {contextualMatchHint(challenge)}
          </Typography>
        )}
      </div>
    </div>
  );
}
