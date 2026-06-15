import { colorStateToHex } from '../../scoring/perceptualScore';
import type { ColorState } from '../../types';

interface FlashcardProofStripProps {
  left: ColorState;
  right: ColorState;
  leftLabel?: string;
  rightLabel?: string;
  visible?: boolean;
  /** Separated columns with gap — use in proof strips so labels do not run together. */
  variant?: 'merged' | 'separated';
}

/** Neutral gray strip — true underlying colors side by side after a flashcard answer. */
export default function FlashcardProofStrip({
  left,
  right,
  leftLabel = 'Left',
  rightLabel = 'Right',
  visible = true,
  variant = 'merged',
}: FlashcardProofStripProps): React.ReactElement {
  return (
    <div
      className={`sight-proof-strip ${visible ? 'sight-proof-strip--visible' : ''}`}
      aria-label="True colors on neutral gray"
      aria-hidden={!visible}
    >
      <div
        className={`sight-flush-pair sight-proof-strip__pair ${variant === 'separated' ? 'sight-proof-strip__pair--separated' : ''}`}
      >
        <div className="sight-flush-pair__col">
          <span className="sight-match-reveal__label">{leftLabel}</span>
          <div className="sight-flush-swatch" style={{ background: colorStateToHex(left) }} />
        </div>
        <div className="sight-flush-pair__col">
          <span className="sight-match-reveal__label">{rightLabel}</span>
          <div className="sight-flush-swatch" style={{ background: colorStateToHex(right) }} />
        </div>
      </div>
    </div>
  );
}
