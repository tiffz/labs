import type { EncoreMilestoneDefinition, EncoreSong } from '../types';
import { applyTemplateProgressToSong } from './repertoireMilestones';

export type MilestoneProgressSummary = {
  done: number;
  na: number;
  todo: number;
  total: number;
  /** Compact for table cells, e.g. `4/12` or `4/12 · 2 N/A`. */
  labelShort: string;
  /** Full breakdown for tooltips. */
  tooltip: string;
};

/**
 * Counts checklist rows (active global template + song-only rows) using the same
 * defaulting rules as the song checklist (`applyTemplateProgressToSong`).
 */
export function milestoneProgressSummary(
  song: EncoreSong,
  template: readonly EncoreMilestoneDefinition[],
): MilestoneProgressSummary {
  const synced = applyTemplateProgressToSong(song, template);
  const defs = template.filter((m) => !m.archived);
  let done = 0;
  let na = 0;
  let todo = 0;
  for (const m of defs) {
    const st = synced.milestoneProgress?.[m.id]?.state ?? 'todo';
    if (st === 'done') done += 1;
    else if (st === 'na') na += 1;
    else todo += 1;
  }
  for (const row of synced.songOnlyMilestones ?? []) {
    if (row.state === 'done') done += 1;
    else if (row.state === 'na') na += 1;
    else todo += 1;
  }
  const total = done + na + todo;
  if (total === 0) {
    return {
      done: 0,
      na: 0,
      todo: 0,
      total: 0,
      labelShort: '—',
      tooltip: 'Add milestone steps under Setup to track progress here.',
    };
  }
  let labelShort = `${done}/${total}`;
  if (na > 0) labelShort += ` · ${na} N/A`;
  const tooltip = `${done} done · ${na} not applicable · ${todo} to do (${total} total)`;
  return { done, na, todo, total, labelShort, tooltip };
}
