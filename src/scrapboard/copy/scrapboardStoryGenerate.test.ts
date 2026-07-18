import { describe, expect, it } from 'vitest';

import {
  defaultGeneratedLayout,
  generateLayoutsForPanelCount,
  maxDialogueBlocksForPanel,
} from '../../shared/comic';
import {
  generateStoryPage,
  groupPanelsByScene,
  pickWeightedLayout,
  pickWeightedPanelCount,
} from './scrapboardStoryGenerate';
import { PANEL_COUNT_WEIGHTS } from './scrapboardStoryThemes';

describe('scrapboardStoryGenerate', () => {
  it('weights panel counts toward 4–6', () => {
    const counts = Array.from({ length: 400 }, (_, i) => pickWeightedPanelCount(1000 + i * 17));
    const mid = counts.filter((c) => c >= 4 && c <= 6).length;
    expect(mid / counts.length).toBeGreaterThan(0.55);
    for (const count of counts) {
      expect(PANEL_COUNT_WEIGHTS.some((row) => row.count === count)).toBe(true);
    }
  });

  it('prefers conventional layouts over full-bleed when both exist', () => {
    const layouts = generateLayoutsForPanelCount(5, { allowFullBleed: true });
    const picks = Array.from({ length: 80 }, (_, i) => pickWeightedLayout(2000 + i * 31, layouts));
    const avg =
      picks.reduce((sum, row) => sum + row.conventionality, 0) / Math.max(1, picks.length);
    const uniformAvg =
      layouts.reduce((sum, row) => sum + row.conventionality, 0) / Math.max(1, layouts.length);
    expect(avg).toBeGreaterThan(uniformAvg - 0.02);
    const bleedPicks = picks.filter(
      (row) => row.conventionality < 0.2 || /bleed/i.test(row.id) || /bleed/i.test(row.label),
    ).length;
    expect(bleedPicks / picks.length).toBeLessThan(0.25);
  });

  it('sizes dialogue to panel budgets and names cast members', () => {
    const layout = defaultGeneratedLayout(6);
    const plan = generateStoryPage(4242, layout);
    expect(plan.panels).toHaveLength(layout.panels.length);
    expect(plan.cast.length).toBeGreaterThanOrEqual(2);
    const castNames = plan.cast.map((c) => c.label);
    const dialogue = plan.panels.flatMap((p) => p.blocks).filter((b) => b.kind === 'dialogue');
    expect(dialogue.length).toBeGreaterThan(0);
    const named = dialogue.filter((b) => castNames.some((name) => b.content.includes(name)));
    expect(named.length).toBeGreaterThan(0);

    for (let i = 0; i < layout.panels.length; i++) {
      const panel = layout.panels[i]!;
      const bounds = {
        x: panel.x * 520,
        y: panel.y * 720,
        w: panel.width * 520,
        h: panel.height * 720,
      };
      const maxDialogue = maxDialogueBlocksForPanel(bounds);
      const dialogueCount = plan.panels[i]!.blocks.filter((b) => b.kind === 'dialogue').length;
      expect(dialogueCount).toBeLessThanOrEqual(Math.max(0, maxDialogue));
    }
  });

  it('groups contiguous same-scene panels for shared photos', () => {
    const layout = defaultGeneratedLayout(5);
    const plan = generateStoryPage(9090, layout);
    const groups = groupPanelsByScene(plan.panels);
    expect(groups.size).toBeGreaterThan(0);
    expect(groups.size).toBeLessThanOrEqual(plan.panels.length);
    const sceneIds = new Set(plan.panels.map((p) => p.sceneId));
    expect(groups.size).toBe(sceneIds.size);
  });

  it('usually skips page background photos', () => {
    const layout = defaultGeneratedLayout(4);
    const pageBg = Array.from({ length: 80 }, (_, i) => generateStoryPage(5000 + i * 13, layout));
    const withPage = pageBg.filter((p) => p.usePageBackground).length;
    expect(withPage / pageBg.length).toBeLessThan(0.3);
    expect(withPage).toBeGreaterThan(0);
  });
});
