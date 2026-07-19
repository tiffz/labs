import { afterEach, describe, expect, it, vi } from 'vitest';
import { withLabsDriveSyncLock } from './labsDriveSyncLock';

function stubNavigatorLocks() {
  const queues = new Map<string, Promise<unknown>>();
  const request = vi.fn(async (name: string, cb: () => Promise<unknown>) => {
    const prev = queues.get(name) ?? Promise.resolve();
    const next = prev.then(() => cb());
    queues.set(name, next.catch(() => {}));
    return next;
  });
  vi.stubGlobal('navigator', { locks: { request } });
  return request;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('withLabsDriveSyncLock', () => {
  it('serializes concurrent sections on the same key', async () => {
    stubNavigatorLocks();
    const order: string[] = [];
    const first = withLabsDriveSyncLock('Stanza', async () => {
      order.push('first-start');
      await new Promise((r) => setTimeout(r, 20));
      order.push('first-end');
    });
    const second = withLabsDriveSyncLock('Stanza', async () => {
      order.push('second-start');
    });
    await Promise.all([first, second]);
    expect(order).toEqual(['first-start', 'first-end', 'second-start']);
  });

  it('re-enters without deadlock when already held by this tab (412 retry path)', async () => {
    const request = stubNavigatorLocks();
    const result = await withLabsDriveSyncLock('Stanza', async () => {
      // flush → pull nesting: inner call must not wait on the outer lock.
      return withLabsDriveSyncLock('Stanza', async () => 'inner-done');
    });
    expect(result).toBe('inner-done');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('runs directly when Web Locks are unavailable', async () => {
    vi.stubGlobal('navigator', {});
    await expect(withLabsDriveSyncLock('Stanza', async () => 'ran')).resolves.toBe('ran');
  });
});
