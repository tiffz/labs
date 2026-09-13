// @vitest-environment node
/**
 * The owner: "Stanza still regularly crashes."
 *
 * Her crash log holds an entry that explains one shape of that, and the giveaway is the `source`
 * field:
 *
 *   message: "Failed to fetch dynamically imported module: js/PerformancesScreen-DpnElU9v.js"
 *   source:  "unhandled-rejection"          <- NOT "window-error"
 *
 * `installDynamicImportReloadGuard` listens for `vite:preloadError` and logs with
 * `source: 'window-error'`. This entry came through the plain `unhandledrejection` handler, which
 * only wrote it down. So the stale-chunk reload never ran and the screen broke instead.
 *
 * That path is reachable whenever a lazy `import()` fails outside Vite's preload helper — i.e. any
 * time a deploy lands while a tab is open, which on this repo is several times a day.
 */
import { describe, expect, it } from 'vitest';
import { isStaleChunkLoadMessage, shouldReloadForPreloadError } from './labsCrashLog';

describe('isStaleChunkLoadMessage', () => {
  it('matches the exact message from the owner’s crash log', () => {
    expect(
      isStaleChunkLoadMessage(
        'Failed to fetch dynamically imported module: https://labs.tiffzhang.com/js/PerformancesScreen-DpnElU9v.js',
      ),
    ).toBe(true);
  });

  it('matches the other engines’ wording for the same failure', () => {
    for (const m of [
      'error loading dynamically imported module',
      'Importing a module script failed.',
      'Unable to preload CSS for /assets/x.css',
    ]) {
      expect(isStaleChunkLoadMessage(m)).toBe(true);
    }
  });

  it('is case-insensitive', () => {
    expect(isStaleChunkLoadMessage('FAILED TO FETCH DYNAMICALLY IMPORTED MODULE: a.js')).toBe(true);
  });

  it('does not reload for unrelated rejections', () => {
    // Reloading on a Drive or playback failure would be a reload loop over a real bug.
    for (const m of [
      'Uncaught TypeError: e.getPlayerState is not a function',
      'NetworkError when attempting to fetch resource.',
      'Drive pull failed.',
      'Unhandled rejection',
      '',
      undefined,
      null,
    ]) {
      expect(isStaleChunkLoadMessage(m)).toBe(false);
    }
  });
});

describe('reload loop guard', () => {
  it('reloads the first time', () => {
    expect(shouldReloadForPreloadError(1_000_000, null)).toBe(true);
  });

  it('refuses a second reload inside the cooldown, so a truly missing asset surfaces', () => {
    expect(shouldReloadForPreloadError(1_000_000, 1_000_000 - 5)).toBe(false);
  });

  it('allows another attempt after the cooldown — a later deploy is a new event', () => {
    expect(shouldReloadForPreloadError(1_000_000 + 60_000, 1_000_000)).toBe(true);
  });
});
