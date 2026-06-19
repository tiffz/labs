import { describe, expect, it } from 'vitest';
import { getNodesForRegion } from '../curriculum';
import { createInitialProgress } from './sm2';
import { buildDeckPlan, computeModuleMastery, pickQuizChoices } from './deckPlanner';

describe('deckPlanner', () => {
  it('prioritizes due cards before new cards', () => {
    const nodes = getNodesForRegion('fundamentals').slice(0, 3);
    const map = new Map<string, ReturnType<typeof createInitialProgress>>();
    map.set(nodes[0].id, {
      ...createInitialProgress(nodes[0].id),
      state: 'review',
      nextReviewDate: Date.now() - 1000,
      repetitionCount: 2,
    });
    const plan = buildDeckPlan(nodes, map);
    expect(plan.queue[0]).toBe(nodes[0].id);
    expect(plan.dueCount).toBe(1);
  });

  it('builds multiple-choice options including target', () => {
    const nodes = getNodesForRegion('shoulder_neck');
    const choices = pickQuizChoices(nodes[0].id, nodes, 4);
    expect(choices).toHaveLength(4);
    expect(choices).toContain(nodes[0].id);
  });

  it('counts module mastery', () => {
    const nodes = getNodesForRegion('foot');
    const map = new Map<string, ReturnType<typeof createInitialProgress>>();
    map.set(nodes[0].id, { ...createInitialProgress(nodes[0].id), repetitionCount: 3 });
    const stats = computeModuleMastery(nodes, map, 3);
    expect(stats.mastered).toBe(1);
    expect(stats.total).toBe(nodes.length);
  });
});
