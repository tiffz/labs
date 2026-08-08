import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every media-slaved audio driver must survive a hidden tab.
 *
 * A background tab pauses `requestAnimationFrame` entirely but keeps an `<audio>`/`<video>` element
 * playing. So any aux layer driven by rAF alone — Stanza's drum scheduler and metronome — went
 * silent on tab switch while the main track carried on, and the two returned out of step. Putting
 * on a practice track and multitasking is a core use case, so this is a product requirement, not a
 * nicety.
 *
 * These are source assertions, which are weaker than behavioural ones — but the alternative here
 * was worse. `audioPatternRegistry.test.ts` "protects" this subsystem by comparing a string literal
 * in a config file to a string literal in the test, so it certifies that Stanza uses look-ahead
 * scheduling and the shared mix bus when it does neither. At minimum a driver must not be rAF-only.
 */
const root = resolve(__dirname, '../../..');
const read = (rel: string): string => readFileSync(resolve(root, rel), 'utf8');

/** Media-slaved drivers that must keep scheduling while the tab is hidden. */
const BACKGROUND_CAPABLE_DRIVERS = [
  'shared/audio/platform/hooks/useMediaTimelineDrumScheduler.ts',
  'shared/audio/platform/hooks/usePlatformMediaMetronome.ts',
];

describe('media-slaved audio keeps playing in a hidden tab', () => {
  it.each(BACKGROUND_CAPABLE_DRIVERS)('%s has a non-rAF driver for the hidden case', (rel) => {
    const source = read(rel);
    expect(source).toContain('requestAnimationFrame');
    // A timer, because rAF does not fire when hidden.
    expect(source).toMatch(/setInterval|setTimeout/);
    // ...and it must be gated on `document.hidden`, or it double-drives the foreground loop.
    expect(source).toContain('document.hidden');
  });

  it('the drum scheduler widens its horizon when hidden', () => {
    // A hidden tab throttles timers to ~1 Hz, so a foreground-sized horizon would gap between
    // wakeups. The horizon has to grow, not just the driver change.
    const source = read('shared/audio/platform/hooks/useMediaTimelineDrumScheduler.ts');
    expect(source).toContain('BACKGROUND_LOOK_AHEAD_SEC');
    expect(source).toMatch(/hidden\s*\n?\s*\?\s*BACKGROUND_LOOK_AHEAD_SEC/);
  });

  it('the drum scheduler does not await asset loads inside the tick', () => {
    // Awaiting a fetch+decode in the tick meant the opening beats were dropped by
    // `playNowIfReady` while the scheduled cursor advanced anyway — silently, with no retry.
    const source = read('shared/audio/platform/hooks/useMediaTimelineDrumScheduler.ts');
    const tick = source.slice(source.indexOf('const runTick'), source.indexOf('const rafTick'));
    expect(tick).not.toContain('await');
    expect(source).toContain('warmAssets');
  });

  it('the shared metronome context is created once, not per play', () => {
    // `primePlatformMetronomeAudio` runs on every play AND every loop wrap. Creating a context each
    // time blew the browser's per-document cap and silenced all aux audio for the session.
    const source = read('shared/audio/platform/hooks/usePlatformMediaMetronome.ts');
    expect(source).toMatch(/if \(!sharedClickCtx \|\| sharedClickCtx\.state === 'closed'\)/);
  });
});
