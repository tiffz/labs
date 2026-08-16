// @vitest-environment jsdom
import { readdirSync, readFileSync } from 'node:fs';
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

  /*
   * The list above is hand-maintained, and that is exactly how the drums app regressed: it names
   * Stanza's two media-slaved drivers, so it passed for months while `PreciseScheduler` — the loop
   * driver behind the drums player, the metronome engine and the look-ahead scheduler — was
   * rAF-only. Switching tabs killed the drums, and this file said background playback was covered.
   *
   * This check is DERIVED instead: it finds every audio module that drives a loop with rAF and
   * requires each to handle the hidden case. A new engine is enrolled by existing, not by someone
   * remembering to add it here.
   */
  describe('every rAF-driven audio loop (derived, not listed)', () => {
    const AUDIO_ROOTS = ['shared/audio', 'shared/rhythm'];

    const walk = (dir: string, out: string[] = []): string[] => {
      for (const entry of readdirSync(resolve(root, dir), { withFileTypes: true })) {
        const rel = `${dir}/${entry.name}`;
        if (entry.isDirectory()) {
          if (entry.name === '__test__') continue;
          walk(rel, out);
        } else if (/\.ts$/.test(entry.name) && !/\.(test|spec)\.ts$/.test(entry.name)) {
          out.push(rel);
        }
      }
      return out;
    };

    /** Comments describe loops too ("Uses a requestAnimationFrame look-ahead loop"). Only read code. */
    const stripComments = (src: string): string =>
      src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

    /**
     * rAF uses that are not playback loops. Exempting by name keeps the default "must handle
     * hidden" — a new file is checked unless someone writes down why it should not be.
     */
    const NOT_A_PLAYBACK_LOOP: Record<string, string> = {
      'shared/audio/latencyCalibration.ts':
        'One-shot rAF yields inside an async measurement routine, not a self-re-arming loop. ' +
        'Calibration only runs with the tab in front of you.',
    };

    const rafDrivers = AUDIO_ROOTS.flatMap((d) => walk(d)).filter((rel) => {
      if (rel in NOT_A_PLAYBACK_LOOP) return false;
      return /requestAnimationFrame\s*\(/.test(stripComments(read(rel)));
    });

    it('finds some to check', () => {
      // Guards against the glob silently matching nothing, which would make the suite vacuous.
      expect(rafDrivers.length).toBeGreaterThan(0);
    });

    it.each(rafDrivers)('%s survives a hidden tab', (rel) => {
      const source = stripComments(read(rel));
      // Delegating the loop to PreciseScheduler inherits its visible/hidden driver swap.
      const delegatesToScheduler = /\.startLoop\s*\(/.test(source);
      const hasOwnHiddenDriver =
        /setInterval|setTimeout/.test(source) && source.includes('document.hidden');
      expect(
        delegatesToScheduler || hasOwnHiddenDriver,
        `${rel} calls requestAnimationFrame, which does not fire in a hidden tab. Either drive ` +
          `the loop through PreciseScheduler.startLoop (which swaps to a timer when hidden), or ` +
          `add a timer driver gated on document.hidden. If this rAF is not a playback loop, add ` +
          `the file to NOT_A_PLAYBACK_LOOP with a reason.`
      ).toBe(true);
    });
  });

  it('the shared metronome context is created once, not per play', () => {
    // `primePlatformMetronomeAudio` runs on every play AND every loop wrap. Creating a context each
    // time blew the browser's per-document cap and silenced all aux audio for the session.
    const source = read('shared/audio/platform/hooks/usePlatformMediaMetronome.ts');
    expect(source).toMatch(/if \(!sharedClickCtx \|\| sharedClickCtx\.state === 'closed'\)/);
  });
});
