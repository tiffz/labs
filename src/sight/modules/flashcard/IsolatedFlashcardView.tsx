import { CompareAxisReadout } from '../../components/CompareAxisReadout';
import CompactVerdict from '../../components/reveal/CompactVerdict';
import FlashcardProofStrip from '../../components/reveal/FlashcardProofStrip';
import SightPrompt from '../../components/SightPrompt';
import { questionHelpForIsolated } from '../../copy/sightTerms';
import { isolatedFocusAxis } from '../../oklchAxisFocus';
import { isolatedPrompt } from '../../generators/isolatedFlashcard';
import { colorStateToHex } from '../../scoring/perceptualScore';
import type { IsolatedFlashcardChallenge, PracticeReveal } from '../../types';

interface IsolatedFlashcardViewProps {
  challenge: IsolatedFlashcardChallenge;
  reveal: PracticeReveal | null;
  onPick: (side: 'left' | 'right') => void;
  disabled?: boolean;
}

function swatchClass(
  side: 'left' | 'right',
  challenge: IsolatedFlashcardChallenge,
  reveal: Extract<PracticeReveal, { kind: 'flashcard-isolated' }> | null,
): string {
  const base = 'sight-compare-swatch';
  if (!reveal) return base;
  const classes = [base, 'sight-compare-swatch--static'];
  if (challenge.correctSide === side) classes.push('sight-compare-swatch--correct');
  else if (reveal.pickedSide === side && !reveal.passed) classes.push('sight-compare-swatch--wrong');
  return classes.join(' ');
}

export default function IsolatedFlashcardView({
  challenge,
  reveal,
  onPick,
  disabled = false,
}: IsolatedFlashcardViewProps): React.ReactElement {
  const isolatedReveal = reveal?.kind === 'flashcard-isolated' ? reveal : null;
  const leftHex = colorStateToHex(challenge.left);
  const rightHex = colorStateToHex(challenge.right);
  const feedbackVisible = Boolean(isolatedReveal);

  return (
    <div className="sight-workspace sight-workspace--single">
      <div className="sight-canvas-zone">
        <div className="sight-compare-stage sight-neutral-panel">
          <SightPrompt
            text={isolatedPrompt(challenge.axis)}
            questionHelp={questionHelpForIsolated(challenge.axis)}
          />
          <div
            className="sight-compare-swatches"
            role="group"
            aria-label={isolatedPrompt(challenge.axis)}
          >
            <button
              type="button"
              className={swatchClass('left', challenge, isolatedReveal)}
              style={{ background: leftHex }}
              onClick={() => onPick('left')}
              disabled={Boolean(isolatedReveal) || disabled}
              aria-label="Left swatch"
            />
            <button
              type="button"
              className={swatchClass('right', challenge, isolatedReveal)}
              style={{ background: rightHex }}
              onClick={() => onPick('right')}
              disabled={Boolean(isolatedReveal) || disabled}
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
                <CompactVerdict passed={isolatedReveal?.passed !== false} />
              </div>
            </div>
            <FlashcardProofStrip
              left={challenge.left}
              right={challenge.right}
              visible={feedbackVisible}
            />
            <CompareAxisReadout
              left={challenge.left}
              right={challenge.right}
              focus={isolatedFocusAxis(challenge.axis)}
              correctSide={challenge.correctSide}
              pickedSide={isolatedReveal?.pickedSide ?? 'left'}
              passed={isolatedReveal?.passed ?? false}
              visible={feedbackVisible}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
