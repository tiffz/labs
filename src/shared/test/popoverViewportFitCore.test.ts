import { describe, expect, it } from 'vitest';
import { evaluatePopoverViewportFit } from './popoverViewportFitCore';

describe('evaluatePopoverViewportFit', () => {
  const base = {
    paperBottom: 700,
    viewportHeight: 800,
    contentHeight: 300,
    paperClientHeight: 300,
    scrollableOverflowPx: 0,
  };

  it('passes when the popover fits and content is not taller than its box', () => {
    expect(evaluatePopoverViewportFit(base)).toEqual({ ok: true });
  });

  it('passes when content overflows but a real scroll container engages (the fix)', () => {
    // content 500 in a 300 box, but the scroll child shrank (min-height:0) so 200px scrolls.
    expect(
      evaluatePopoverViewportFit({ ...base, contentHeight: 500, scrollableOverflowPx: 200 }),
    ).toEqual({ ok: true });
  });

  it('flags the Encore bug: content taller than the clamped Paper but nothing scrolls', () => {
    // content 500 in a 300 box, no scrollable descendant → bottom unreachable.
    const r = evaluatePopoverViewportFit({ ...base, contentHeight: 500, scrollableOverflowPx: 0 });
    expect(r.ok).toBe(false);
    expect(r).toMatchObject({ reason: 'content-clamped-not-scrollable', detailPx: 200 });
  });

  it('flags a Paper that runs past the bottom of the viewport', () => {
    const r = evaluatePopoverViewportFit({ ...base, paperBottom: 900 });
    expect(r.ok).toBe(false);
    expect(r).toMatchObject({ reason: 'paper-exceeds-viewport', detailPx: 100 });
  });

  it('respects the subpixel tolerance', () => {
    expect(
      evaluatePopoverViewportFit({ ...base, contentHeight: 300.5, scrollableOverflowPx: 0 }),
    ).toEqual({ ok: true });
  });
});
