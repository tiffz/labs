import type { EncoreMilestoneDefinition, EncoreSong } from '../types';

function activeTemplateDefs(template: readonly EncoreMilestoneDefinition[]): EncoreMilestoneDefinition[] {
  return [...template].filter((m) => !m.archived).sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
}

/** Ensure every active template milestone id has a progress row (default `todo`). */
export function applyTemplateProgressToSong(song: EncoreSong, template: readonly EncoreMilestoneDefinition[]): EncoreSong {
  const progress = { ...(song.milestoneProgress ?? {}) };
  for (const m of activeTemplateDefs(template)) {
    if (progress[m.id] == null) {
      progress[m.id] = { state: 'todo' };
    }
  }
  return { ...song, milestoneProgress: progress };
}
