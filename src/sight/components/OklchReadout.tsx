import { formatOklchChannels } from '../formatOklch';
import type { ColorState } from '../types';

interface OklchReadoutProps {
  label: string;
  state: ColorState;
  /** Highlights row when this swatch was correct or a wrong pick. */
  emphasis?: 'correct' | 'picked-wrong' | null;
  /** Keeps layout space when hidden (compare pre-submit). */
  visible?: boolean;
}

export default function OklchReadout({
  label,
  state,
  emphasis = null,
  visible = true,
}: OklchReadoutProps): React.ReactElement {
  const ch = formatOklchChannels(state);
  const emphasisClass =
    emphasis === 'correct'
      ? 'sight-oklch-readout--correct'
      : emphasis === 'picked-wrong'
        ? 'sight-oklch-readout--wrong'
        : '';

  return (
    <div
      className={`sight-oklch-readout ${emphasisClass} ${visible ? '' : 'sight-oklch-readout--hidden'}`.trim()}
      aria-hidden={!visible}
    >
      <span className="sight-oklch-readout__label">{label}</span>
      <span className="sight-oklch-readout__channels">
        <span className="sight-oklch-readout__chip">
          <span className="sight-oklch-readout__axis">L</span> {ch.l}
        </span>
        <span className="sight-oklch-readout__chip">
          <span className="sight-oklch-readout__axis">C</span> {ch.c}
        </span>
        <span className="sight-oklch-readout__chip">
          <span className="sight-oklch-readout__axis">H</span> {ch.h}
        </span>
      </span>
      <code className="sight-oklch-readout__css">{ch.css}</code>
    </div>
  );
}
