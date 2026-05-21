import {
  focusAxisName,
  focusAxisShortLabel,
  formatFocusAxisValue,
  matchFocusAxes,
} from '../oklchAxisFocus';
import type { ColorState } from '../types';

interface MatchAxisReadoutProps {
  target: ColorState;
  input: ColorState;
  locked: { hue: boolean; chroma: boolean };
  passed: boolean;
}

export default function MatchAxisReadout({
  target,
  input,
  locked,
  passed,
}: MatchAxisReadoutProps): React.ReactElement {
  const axes = matchFocusAxes(locked);
  const yoursEmphasis = passed ? '' : 'sight-axis-readout__cell--wrong';

  return (
    <div
      className="sight-axis-readout sight-axis-readout--visible sight-axis-readout--match"
      aria-label="Oklch values for the axes you adjusted"
    >
      {axes.map((axis, index) => (
        <div
          key={axis}
          className={`sight-axis-readout__group ${index > 0 ? 'sight-axis-readout__group--stacked' : ''}`}
        >
          <span className="sight-axis-readout__heading">
            {focusAxisShortLabel(axis)} · {focusAxisName(axis)}
          </span>
          <div className="sight-axis-readout__values">
            <div className="sight-axis-readout__cell">
              <span className="sight-axis-readout__side">Target</span>
              <span className="sight-axis-readout__value">{formatFocusAxisValue(target, axis)}</span>
            </div>
            <div className={`sight-axis-readout__cell ${yoursEmphasis}`.trim()}>
              <span className="sight-axis-readout__side">Yours</span>
              <span className="sight-axis-readout__value">{formatFocusAxisValue(input, axis)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
