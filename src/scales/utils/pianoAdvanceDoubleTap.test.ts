import { describe, expect, it } from 'vitest';
import { applyPianoDoubleTapStep, PIANO_ADVANCE_DOUBLE_MS } from './pianoAdvanceDoubleTap';

describe('applyPianoDoubleTapStep', () => {
  it('requires press-off-press on the same note', () => {
    let arm = null;
    const t0 = 1000;
    const t1 = t0 + 50;
    const t2 = t1 + 30;
    const t3 = t2 + 40;
    const note = 60;

    ({ next: arm } = applyPianoDoubleTapStep(arm, 'on', note, t0));
    expect(arm).toEqual({ note, perfMs: t0, released: false });

    ({ next: arm } = applyPianoDoubleTapStep(arm, 'on', note, t1));
    expect(arm).toEqual({ note, perfMs: t0, released: false });

    ({ next: arm } = applyPianoDoubleTapStep(arm, 'off', note, t2));
    expect(arm).toEqual({ note, perfMs: t2, released: true });

    const r = applyPianoDoubleTapStep(arm, 'on', note, t3);
    expect(r.complete).toBe(true);
    expect(r.next).toBeNull();
  });

  it('expires after the double window (measured from release)', () => {
    let arm = null;
    const t0 = 1000;
    const tRelease = t0 + 20;
    const note = 62;
    ({ next: arm } = applyPianoDoubleTapStep(arm, 'on', note, t0));
    ({ next: arm } = applyPianoDoubleTapStep(arm, 'off', note, tRelease));
    const r = applyPianoDoubleTapStep(arm, 'on', note, tRelease + PIANO_ADVANCE_DOUBLE_MS + 10);
    expect(r.complete).toBe(false);
    expect(r.next).toEqual({
      note,
      perfMs: tRelease + PIANO_ADVANCE_DOUBLE_MS + 10,
      released: false,
    });
  });

  it('still completes when the first key is held longer than the double window', () => {
    let arm = null;
    const t0 = 1000;
    const tRelease = t0 + 800;
    const tSecondOn = tRelease + 40;
    const note = 64;
    ({ next: arm } = applyPianoDoubleTapStep(arm, 'on', note, t0));
    ({ next: arm } = applyPianoDoubleTapStep(arm, 'off', note, tRelease));
    const r = applyPianoDoubleTapStep(arm, 'on', note, tSecondOn);
    expect(r.complete).toBe(true);
    expect(r.next).toBeNull();
  });
});
