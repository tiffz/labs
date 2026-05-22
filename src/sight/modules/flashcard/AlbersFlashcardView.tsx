import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CompactVerdict from '../../components/reveal/CompactVerdict';
import FlashcardProofStrip from '../../components/reveal/FlashcardProofStrip';
import { albersPrompt } from '../../generators/albersFlashcard';
import { colorStateToHex } from '../../scoring/perceptualScore';
import type { AlbersFlashcardChallenge, PracticeReveal } from '../../types';

interface AlbersFlashcardViewProps {
  challenge: AlbersFlashcardChallenge;
  reveal: PracticeReveal | null;
  onPickSide: (side: 'left' | 'right') => void;
  onPickBinary: (choice: 'same' | 'different') => void;
  disabled?: boolean;
}

export default function AlbersFlashcardView({
  challenge,
  reveal,
  onPickSide,
  onPickBinary,
  disabled = false,
}: AlbersFlashcardViewProps): React.ReactElement {
  const albersReveal = reveal?.kind === 'flashcard-albers' ? reveal : null;
  const isIdentity = challenge.question === 'identity';
  const awaiting = Boolean(albersReveal);
  const feedbackVisible = Boolean(albersReveal);

  return (
    <div className="sight-workspace sight-workspace--single">
      <div className="sight-canvas-zone">
        <div className="sight-albers-stage sight-neutral-panel">
          <Typography variant="subtitle2" component="p" className="sight-compare-prompt">
            {albersPrompt(challenge.question)}
          </Typography>
          <div className="sight-albers-fields" role="group" aria-label={albersPrompt(challenge.question)}>
            {(['left', 'right'] as const).map((side) => {
              const field = challenge[side];
              const picked =
                albersReveal?.pickedSide === side ||
                (side === 'left' && albersReveal?.pickedBinary === 'same') ||
                (side === 'right' && albersReveal?.pickedBinary === 'different');
              const correct =
                (challenge.correctSide === side && albersReveal?.passed) ||
                (challenge.correctBinary === 'same' && side === 'left' && albersReveal?.passed) ||
                (challenge.correctBinary === 'different' && side === 'right' && albersReveal?.passed);
              const wrong = albersReveal && picked && !albersReveal.passed;
              return (
                <div
                  key={side}
                  className={`sight-albers-field ${correct ? 'sight-albers-field--correct' : ''} ${wrong ? 'sight-albers-field--wrong' : ''}`}
                >
                  <div
                    className="sight-albers-field__bg"
                    style={{ background: colorStateToHex(field.background) }}
                  >
                    <div
                      className="sight-albers-field__target"
                      style={{ background: colorStateToHex(field.target) }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {!awaiting && (
            <div className="sight-albers-actions">
              {isIdentity ? (
                <>
                  <Button
                    variant="contained"
                    onClick={() => onPickBinary('same')}
                    disabled={disabled}
                  >
                    Same
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => onPickBinary('different')}
                    disabled={disabled}
                  >
                    Different
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="contained" onClick={() => onPickSide('left')} disabled={disabled}>
                    Left
                  </Button>
                  <Button variant="outlined" onClick={() => onPickSide('right')} disabled={disabled}>
                    Right
                  </Button>
                </>
              )}
            </div>
          )}
          <div
            className="sight-compare-feedback"
            role={feedbackVisible ? 'status' : undefined}
            aria-live={feedbackVisible ? 'polite' : undefined}
          >
            <div
              className={`sight-compare-verdict ${feedbackVisible ? 'sight-compare-verdict--visible' : ''}`}
            >
              <div className="sight-compare-verdict__content" aria-hidden={!feedbackVisible}>
                <CompactVerdict passed={albersReveal?.passed !== false} />
              </div>
            </div>
            <FlashcardProofStrip
              left={challenge.left.target}
              right={challenge.right.target}
              leftLabel="Left target"
              rightLabel="Right target"
              visible={feedbackVisible}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
