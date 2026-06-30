import { describe, expect, it } from 'vitest';
import { getFundamentalsGateNodes } from '../curriculum';
import { getTermsGateIds } from '../curriculum/anatomyTerms';
import { createInitialProgress } from './sm2';
import {
  fundamentalsGateSatisfied,
  getModuleLockReason,
  isModuleUnlocked,
  termsGateSatisfied,
} from './gatekeeper';

describe('gatekeeper', () => {
  it('unlocks anatomy terms immediately', () => {
    expect(isModuleUnlocked('anatomy_terms', new Map())).toBe(true);
  });

  it('keeps fundamentals locked until terms baseline met', () => {
    expect(isModuleUnlocked('fundamentals', new Map())).toBe(false);
    expect(getModuleLockReason('fundamentals', new Map())).toMatch(/anatomy terms/i);
  });

  it('keeps muscle modules locked until fundamentals baseline met', () => {
    const map = new Map<string, ReturnType<typeof createInitialProgress>>();
    for (const id of getTermsGateIds()) {
      map.set(id, { ...createInitialProgress(id), repetitionCount: 3 });
    }
    expect(termsGateSatisfied(map)).toBe(true);
    expect(isModuleUnlocked('shoulder_neck', map)).toBe(false);
    expect(getModuleLockReason('shoulder_neck', map)).toMatch(/Skeletal landmarks/i);
  });

  it('detects fundamentals gate satisfaction after terms', () => {
    const map = new Map<string, ReturnType<typeof createInitialProgress>>();
    for (const id of getTermsGateIds()) {
      map.set(id, { ...createInitialProgress(id), repetitionCount: 3 });
    }
    const gateNodes = getFundamentalsGateNodes();
    for (const node of gateNodes.slice(0, 8)) {
      map.set(node.id, { ...createInitialProgress(node.id), repetitionCount: 3 });
    }
    expect(fundamentalsGateSatisfied(map)).toBe(true);
  });
});
