import { describe, expect, it, beforeEach, vi, type MockedFunction } from 'vitest';
import { installServerLogger, resetServerLoggerForTesting } from '../utils/serverLogger';
import { labsDebug } from './labsDebugLog';

const mockFetch = vi.fn() as MockedFunction<typeof fetch>;
global.fetch = mockFetch;

async function flushLogs(): Promise<void> {
  await vi.advanceTimersByTimeAsync(600);
  await Promise.resolve();
}

describe('labsDebug', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockFetch.mockResolvedValue(new Response('{"status":"ok"}'));
    vi.stubEnv('DEV', true);
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    resetServerLoggerForTesting();
    window.history.replaceState({}, '', `${window.location.pathname}?debug=1`);
  });

  afterEach(() => {
    vi.useRealTimers();
    window.history.replaceState({}, '', window.location.pathname);
  });

  it('forwards info to ServerLogger when debug URL is on', async () => {
    installServerLogger('TESTAPP');
    labsDebug.info('hello', { n: 1 });
    await flushLogs();
    expect(mockFetch).toHaveBeenCalled();
    const body = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string) as { logs: unknown[] };
    expect(body.logs.some((l) => (l as { message?: string }).message === 'hello')).toBe(true);
  });

  it('does not forward info when debug URL is off', async () => {
    window.history.replaceState({}, '', window.location.pathname);
    resetServerLoggerForTesting();
    installServerLogger('TESTAPP2');
    labsDebug.info('silent');
    await flushLogs();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('forwards warn when debug URL is off', async () => {
    window.history.replaceState({}, '', window.location.pathname);
    resetServerLoggerForTesting();
    installServerLogger('TESTAPP3');
    labsDebug.warn('look out');
    await flushLogs();
    expect(mockFetch).toHaveBeenCalled();
  });
});
