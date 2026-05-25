import React from 'react';

export type SliderMilestoneAlign = 'start' | 'center' | 'end';

export interface SliderMilestoneItem {
  value: number;
  leftPercent: number;
  align: SliderMilestoneAlign;
}

/** Map slider tick values to horizontal positions under the rail (linear scale). */
export function buildSliderMilestones(
  marks: readonly number[],
  min: number,
  max: number,
): SliderMilestoneItem[] {
  const span = max - min;
  return marks.map((value) => {
    const leftPercent = span > 0 ? ((value - min) / span) * 100 : 0;
    const align: SliderMilestoneAlign =
      leftPercent <= 0 ? 'start' : leftPercent >= 100 ? 'end' : 'center';
    return { value, leftPercent, align };
  });
}

/**
 * BPM dropdown milestones: min, 100, 200, max — dropping ticks that would crowd
 * (e.g. 200 + 220 when max is 220 in Words in Rhythm).
 */
export function pickBpmSliderMilestones(min: number, max: number): number[] {
  const span = max - min;
  if (span <= 0) return [min];

  const candidates = [min, 100, 200, max]
    .filter((mark) => mark >= min && mark <= max)
    .sort((a, b) => a - b);

  const unique = Array.from(new Set(candidates));
  const minSeparation = span * 0.14;
  const picked: number[] = [];

  for (const mark of unique) {
    const prev = picked[picked.length - 1];
    if (prev === undefined) {
      picked.push(mark);
      continue;
    }
    if (mark - prev >= minSeparation) {
      picked.push(mark);
      continue;
    }
  }

  const lastCandidate = unique[unique.length - 1];
  if (lastCandidate !== undefined && picked[picked.length - 1] !== lastCandidate) {
    const prev = picked[picked.length - 1];
    if (prev === undefined) {
      picked.push(lastCandidate);
    } else if (lastCandidate - prev < minSeparation && prev !== min) {
      picked[picked.length - 1] = lastCandidate;
    } else if (lastCandidate !== prev) {
      picked.push(lastCandidate);
    }
  }

  return picked;
}

export interface SliderMilestoneLabelsProps {
  milestones: readonly SliderMilestoneItem[];
  format?: (value: number) => string;
}

/** Tick labels under {@link AppSlider} rails inside BPM / speed dropdowns. */
export function SliderMilestoneLabels({
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
