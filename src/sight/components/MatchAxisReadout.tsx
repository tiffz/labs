import {
  focusAxisName,
  focusAxisShortLabel,
  formatFocusAxisValue,
  matchFocusAxes,
} from '../oklchAxisFocus';
import type { ColorState, ContextualLocks } from '../types';

interface MatchAxisReadoutProps {
  target: ColorState;
  input: ColorState;
  locked: ContextualLocks;
  passed: boolean;
}

export default function MatchAxisReadout({
  target,
  input,
  locked,
  passed,
}: MatchAxisReadoutProps): React.ReactElement {
  const axes = matchFocusAxes(locked);
  const yoursClass = passed ? '' : 'sight-axis-readout__value--wrong';

  return (
    <div
      className="sight-axis-readout sight-axis-readout--visible sight-axis-readout--match"
      aria-label="Oklch values for the axes you adjusted"
    >
      {axes.map((axis) => (
        <div key={axis} className="sight-axis-readout__row" title={focusAxisName(axis)}>
          <span className="sight-axis-readout__badge" aria-hidden>
            {focusAxisShortLabel(axis)}
          </span>
          <span className="sight-axis-readout__value" aria-label={`Target ${focusAxisName(axis)}`}>
            {formatFocusAxisValue(target, axis)}
          </span>
          <span className="sight-axis-readout__arrow" aria-hidden>
            →
          </span>
          <span
            className={`sight-axis-readout__value ${yoursClass}`.trim()}
            aria-label={`Yours ${focusAxisName(axis)}`}
          >
            {formatFocusAxisValue(input, axis)}
          </span>
        </div>
      ))}
    </div>
  );
}
