import { describe, expect, it } from 'vitest';
import { getFundamentalsGateNodes } from '../curriculum';
import { createInitialProgress } from './sm2';
import { fundamentalsGateSatisfied, getModuleLockReason, isModuleUnlocked } from './gatekeeper';

describe('gatekeeper', () => {
  it('keeps muscle modules locked until fundamentals baseline met', () => {
    const map = new Map<string, ReturnType<typeof createInitialProgress>>();
    expect(isModuleUnlocked('shoulder_neck', map)).toBe(false);
    expect(getModuleLockReason('shoulder_neck', map)).toMatch(/Fundamentals/i);
  });

  it('unlocks fundamentals immediately', () => {
    expect(isModuleUnlocked('fundamentals', new Map())).toBe(true);
  });

  it('detects fundamentals gate satisfaction', () => {
    const map = new Map<string, ReturnType<typeof createInitialProgress>>();
    const gateNodes = getFundamentalsGateNodes();
    for (const node of gateNodes.slice(0, 8)) {
      map.set(node.id, { ...createInitialProgress(node.id), repetitionCount: 3 });
    }
    expect(fundamentalsGateSatisfied(map)).toBe(true);
  });
});
