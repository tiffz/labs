import { getConfig } from '@testing-library/dom';
import { describe, expect, it } from 'vitest';

/**
 * The async-assertion budget is a real setting, not a default.
 *
 * Testing Library ships `asyncUtilTimeout: 1000`. This suite runs with `testTimeout: 10000`, so the
 * stock default gave every `findBy*` one tenth of its test's budget. Two nightly runs
 * (2026-09-03, 2026-09-04) died on a lazy `<Suspense>` boundary that resolves in ~60ms locally but
 * did not get 1000ms of CPU under the coverage run's 852 files across 6 workers.
 *
 * This is a config value with no other observable behaviour, so nothing else would notice it being
 * removed, reset by a dependency bump, or dropped when `setupTests.ts` is refactored — it would
 * simply go back to flaking a few nights a month. Hence a test.
 */
describe('Testing Library async budget', () => {
  const VITEST_TEST_TIMEOUT_MS = 10_000; // vite.config.ts → test.testTimeout

  it('is configured well above the 1000ms library default', () => {
    expect(
      getConfig().asyncUtilTimeout,
      'setupTests.ts must call configure({ asyncUtilTimeout }). At the 1000ms default, an async ' +
        'assertion fails 9 seconds before its own test is out of time.',
    ).toBeGreaterThanOrEqual(3000);
  });

  it('leaves room for two full waits inside testTimeout', () => {
    // Keeps a genuinely missing element failing with Testing Library's DOM dump — which names the
    // element and prints the markup — instead of a bare Vitest timeout that says only "10000ms".
    expect(
      getConfig().asyncUtilTimeout * 2,
      `asyncUtilTimeout must stay under half of testTimeout (${VITEST_TEST_TIMEOUT_MS}ms). Raise ` +
        'testTimeout first if you need a longer async budget — see .agents/rules/flaky-tests.md.',
    ).toBeLessThanOrEqual(VITEST_TEST_TIMEOUT_MS);
  });
});
