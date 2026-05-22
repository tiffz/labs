import {
  compareFocusAxis,
  focusAxisName,
  focusAxisShortLabel,
  formatFocusAxisValue,
  type OklchFocusAxis,
} from '../oklchAxisFocus';
import type { ColorState, CompareChallenge } from '../types';

interface CompareAxisReadoutProps {
  left: ColorState;
  right: ColorState;
  focus: OklchFocusAxis;
  correctSide: 'left' | 'right';
  pickedSide: 'left' | 'right';
  passed: boolean;
  visible?: boolean;
}

interface CompareAxisReadoutFromChallengeProps {
  challenge: CompareChallenge;
  pickedSide: 'left' | 'right';
  passed: boolean;
  visible?: boolean;
}

function emphasisForSide(
  side: 'left' | 'right',
  correctSide: 'left' | 'right',
  pickedSide: 'left' | 'right',
  passed: boolean,
): 'correct' | 'picked-wrong' | null {
  if (correctSide === side) return 'correct';
  if (!passed && pickedSide === side) return 'picked-wrong';
  return null;
}

function AxisPairRow({
  left,
  right,
  focus,
  correctSide,
  pickedSide,
  passed,
}: Omit<CompareAxisReadoutProps, 'visible'>): React.ReactElement {
  const axisLabel = focusAxisShortLabel(focus);
  const axisName = focusAxisName(focus);

  return (
    <div className="sight-axis-readout__row" title={axisName}>
      <span className="sight-axis-readout__badge" aria-hidden>
        {axisLabel}
      </span>
      {(['left', 'right'] as const).map((side) => {
        const state = side === 'left' ? left : right;
        const emphasis = emphasisForSide(side, correctSide, pickedSide, passed);
        const emphasisClass =
          emphasis === 'correct'
            ? 'sight-axis-readout__value--correct'
            : emphasis === 'picked-wrong'
              ? 'sight-axis-readout__value--wrong'
              : '';
        return (
          <span
            key={side}
            className={`sight-axis-readout__value ${emphasisClass}`.trim()}
            aria-label={`${side === 'left' ? 'Left' : 'Right'} ${axisName} ${formatFocusAxisValue(state, focus)}`}
          >
            {formatFocusAxisValue(state, focus)}
          </span>
        );
      })}
    </div>
  );
}

export function CompareAxisReadout(props: CompareAxisReadoutProps): React.ReactElement {
  return (
    <div
      className={`sight-axis-readout ${props.visible ? 'sight-axis-readout--visible' : ''}`}
      aria-label={`${focusAxisName(props.focus)} for both swatches`}
      aria-hidden={!props.visible}
    >
      <AxisPairRow {...props} />
    </div>
  );
}

export function CompareAxisReadoutFromChallenge({
  challenge,
  pickedSide,
  passed,
  visible = true,
}: CompareAxisReadoutFromChallengeProps): React.ReactElement {
  return (
    <CompareAxisReadout
      left={challenge.left}
      right={challenge.right}
      focus={compareFocusAxis(challenge.axis)}
      correctSide={challenge.correctSide}
      pickedSide={pickedSide}
      passed={passed}
      visible={visible}
    />
  );
}

