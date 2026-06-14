import React from 'react';
import type { SliderMilestoneItem } from './sliderMilestoneUtils';

export type { SliderMilestoneItem } from './sliderMilestoneUtils';

export interface SliderMilestoneLabelsProps {
  milestones: readonly SliderMilestoneItem[];
  format?: (value: number) => string;
}

/** Tick labels under {@link AppSlider} rails inside BPM / speed dropdowns. */
export default function SliderMilestoneLabels({
  milestones,
  format = (value) => String(value),
}: SliderMilestoneLabelsProps): React.ReactElement {
  return (
    <div className="shared-bpm-milestones" aria-hidden="true">
      {milestones.map(({ value, leftPercent, align }) => (
        <span
          key={`milestone-${value}`}
          className={`shared-bpm-milestone shared-bpm-milestone--${align}`}
          style={{ left: `${leftPercent}%` }}
        >
          {format(value)}
        </span>
      ))}
    </div>
  );
}
