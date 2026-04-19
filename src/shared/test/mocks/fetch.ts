import { vi, type MockedFunction } from 'vitest';

/**
 * Install a mocked global `fetch` that resolves to a configurable JSON body.
 *
 * ```ts
 * import { mockFetch } from '../../shared/test/mocks/fetch';
 *
 * beforeEach(() => {
 *   mockFetch({ status: 'ok' });
 * });
 * ```
 *
 * Returns the underlying mock so tests can assert on calls or override the
 * implementation for specific URLs.
 */
export function mockFetch(
  defaultJson: unknown = { status: 'ok' },
  defaultStatus: number = 200,
): MockedFunction<typeof fetch> {
  const mock = vi.fn() as MockedFunction<typeof fetch>;
  mock.mockResolvedValue(
    new Response(JSON.stringify(defaultJson), {
      status: defaultStatus,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  globalThis.fetch = mock as unknown as typeof fetch;
  return mock;
}

/**
 * Restore whatever `fetch` was present before a test mocked it. Pair with a
 * `const original = globalThis.fetch` snapshot in `beforeEach`.
 */
export function restoreFetch(original: typeof fetch | undefined): void {
  if (original) {
    globalThis.fetch = original;
  }
}
