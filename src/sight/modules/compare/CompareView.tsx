import CompareOklchReveal from '../../components/CompareOklchReveal';
import CompactVerdict from '../../components/reveal/CompactVerdict';
import SightPrompt from '../../components/SightPrompt';
import { comparePrompt } from '../../generators/compare';
import { questionHelpForCompare } from '../../copy/sightTerms';
import { colorStateToHex } from '../../scoring/perceptualScore';
import type { CompareChallenge, PracticeReveal } from '../../types';

interface CompareViewProps {
  challenge: CompareChallenge;
  reveal: PracticeReveal | null;
  onPick: (side: 'left' | 'right') => void;
  disabled?: boolean;
}

function swatchClass(
  side: 'left' | 'right',
  challenge: CompareChallenge,
  reveal: Extract<PracticeReveal, { kind: 'compare' }> | null,
): string {
  const base = 'sight-compare-swatch';
  if (!reveal) return base;
  const classes = [base, 'sight-compare-swatch--static'];
  if (challenge.correctSide === side) classes.push('sight-compare-swatch--correct');
  else if (reveal.pickedSide === side && !reveal.passed) classes.push('sight-compare-swatch--wrong');
  return classes.join(' ');
}

export default function CompareView({
  challenge,
  reveal,
  onPick,
  disabled = false,
}: CompareViewProps): React.ReactElement {
  const compareReveal = reveal?.kind === 'compare' ? reveal : null;
  const leftHex = colorStateToHex(challenge.left);
  const rightHex = colorStateToHex(challenge.right);
  const feedbackVisible = Boolean(compareReveal);

  return (
    <div className="sight-workspace sight-workspace--single">
      <div className="sight-canvas-zone">
        <div className="sight-compare-stage sight-neutral-panel">
          <SightPrompt
            text={comparePrompt(challenge.axis)}
            questionHelp={questionHelpForCompare(challenge.axis)}
          />
          <div className="sight-compare-swatches" role="group" aria-label={comparePrompt(challenge.axis)}>
            <button
              type="button"
              className={swatchClass('left', challenge, compareReveal)}
              style={{ background: leftHex }}
              onClick={() => onPick('left')}
              disabled={Boolean(compareReveal) || disabled}
              aria-label="Left swatch"
            />
            <button
              type="button"
              className={swatchClass('right', challenge, compareReveal)}
              style={{ background: rightHex }}
              onClick={() => onPick('right')}
              disabled={Boolean(compareReveal) || disabled}
              aria-label="Right swatch"
            />
          </div>
          <div
            className="sight-compare-feedback"
            role={feedbackVisible ? 'status' : undefined}
            aria-live={feedbackVisible ? 'polite' : undefined}
          >
            <div
              className={`sight-compare-verdict ${feedbackVisible ? 'sight-compare-verdict--visible' : ''}`}
            >
              <div className="sight-compare-verdict__content" aria-hidden={!feedbackVisible}>
                <CompactVerdict passed={compareReveal?.passed !== false} />
              </div>
            </div>
            <CompareOklchReveal
              challenge={challenge}
              pickedSide={compareReveal?.pickedSide ?? 'left'}
              passed={compareReveal?.passed ?? false}
              visible={feedbackVisible}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
