import {
  compareFocusAxis,
  focusAxisName,
  focusAxisShortLabel,
  formatFocusAxisValue,
} from '../oklchAxisFocus';
import type { CompareChallenge } from '../types';

interface CompareAxisReadoutProps {
  challenge: CompareChallenge;
  pickedSide: 'left' | 'right';
  passed: boolean;
  visible?: boolean;
}

function emphasisForSide(
  side: 'left' | 'right',
  challenge: CompareChallenge,
  pickedSide: 'left' | 'right',
  passed: boolean,
): 'correct' | 'picked-wrong' | null {
  if (challenge.correctSide === side) return 'correct';
  if (!passed && pickedSide === side) return 'picked-wrong';
  return null;
}

export default function CompareAxisReadout({
  challenge,
  pickedSide,
  passed,
  visible = true,
}: CompareAxisReadoutProps): React.ReactElement {
  const focus = compareFocusAxis(challenge.axis);
  const axisLabel = focusAxisShortLabel(focus);
  const axisName = focusAxisName(focus);

  return (
    <div
      className={`sight-axis-readout ${visible ? 'sight-axis-readout--visible' : ''}`}
      aria-label={`${axisName} for both swatches`}
      aria-hidden={!visible}
    >
      <span className="sight-axis-readout__heading">
        {axisLabel} · {axisName}
      </span>
      <div className="sight-axis-readout__values">
        {(['left', 'right'] as const).map((side) => {
          const state = side === 'left' ? challenge.left : challenge.right;
          const emphasis = emphasisForSide(side, challenge, pickedSide, passed);
          const emphasisClass =
            emphasis === 'correct'
              ? 'sight-axis-readout__cell--correct'
              : emphasis === 'picked-wrong'
                ? 'sight-axis-readout__cell--wrong'
                : '';
          return (
            <div
              key={side}
              className={`sight-axis-readout__cell ${emphasisClass}`.trim()}
            >
              <span className="sight-axis-readout__side">{side === 'left' ? 'Left' : 'Right'}</span>
              <span className="sight-axis-readout__value">{formatFocusAxisValue(state, focus)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
