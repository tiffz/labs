import { describe, expect, it } from 'vitest';
import {
  DEFAULT_INTERACTION_BUDGET_MS,
  formatInteractionBudgetMessage,
  isWithinInteractionBudget,
} from './interactionLatencyCore';

describe('interactionLatencyCore', () => {
  it('accepts latency within default budget', () => {
    expect(isWithinInteractionBudget(200)).toBe(true);
    expect(isWithinInteractionBudget(DEFAULT_INTERACTION_BUDGET_MS)).toBe(true);
  });

  it('rejects latency over budget', () => {
    expect(isWithinInteractionBudget(DEFAULT_INTERACTION_BUDGET_MS + 1)).toBe(false);
  });

  it('formats budget message', () => {
    expect(formatInteractionBudgetMessage(120, 400)).toContain('120ms');
    expect(formatInteractionBudgetMessage(120, 400)).toContain('400ms');
  });
});
