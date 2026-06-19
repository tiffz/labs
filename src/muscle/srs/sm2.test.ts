import { describe, expect, it } from 'vitest';
import { applySm2Grade, createInitialProgress, qualityFromCorrect } from './sm2';

describe('sm2', () => {
  it('resets learning on incorrect answer', () => {
    const base = { ...createInitialProgress('n1'), repetitionCount: 2, state: 'learning' as const };
    const next = applySm2Grade(base, qualityFromCorrect(false));
    expect(next.repetitionCount).toBe(0);
    expect(next.state).toBe('learning');
  });

  it('advances interval on repeated correct answers', () => {
    let p = createInitialProgress('n1');
    p = applySm2Grade(p, 5);
    expect(p.interval).toBe(1);
    p = applySm2Grade(p, 5);
    expect(p.interval).toBe(3);
    p = applySm2Grade(p, 5);
    expect(p.state).toBe('review');
    expect(p.interval).toBeGreaterThanOrEqual(6);
  });
});
