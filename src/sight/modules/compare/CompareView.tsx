import Typography from '@mui/material/Typography';
import CompareOklchReveal from '../../components/CompareOklchReveal';
import { comparePrompt } from '../../generators/compare';
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
  return (
    <div className="sight-workspace sight-workspace--single">
      <div className="sight-canvas-zone">
        <div className="sight-compare-stage sight-neutral-panel">
          <Typography variant="subtitle2" component="p" className="sight-compare-prompt">
            {comparePrompt(challenge.axis)}
          </Typography>
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
            className={`sight-compare-verdict ${compareReveal ? 'sight-compare-verdict--visible' : ''}`}
            role={compareReveal ? 'status' : undefined}
            aria-live={compareReveal ? 'polite' : undefined}
          >
            <div className="sight-compare-verdict__content" aria-hidden={!compareReveal}>
              <span
                className={`material-symbols-outlined sight-compare-verdict__icon ${
                  compareReveal?.passed !== false
                    ? 'sight-compare-verdict__icon--pass'
                    : 'sight-compare-verdict__icon--fail'
                }`}
                aria-hidden
              >
                {compareReveal?.passed === false ? 'cancel' : 'check_circle'}
              </span>
              <span className="sight-compare-verdict__text">
                {compareReveal?.passed === false ? 'Not quite' : 'Correct'}
              </span>
            </div>
          </div>
          <CompareOklchReveal
            challenge={challenge}
            pickedSide={compareReveal?.pickedSide ?? 'left'}
            passed={compareReveal?.passed ?? false}
            visible={Boolean(compareReveal)}
          />
        </div>
      </div>
    </div>
  );
}
