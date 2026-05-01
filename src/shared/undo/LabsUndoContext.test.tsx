import { act, render, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LabsUndoProvider, useLabsUndo } from './LabsUndoContext';

function wrapper({ children }: { children: React.ReactNode }) {
  return <LabsUndoProvider>{children}</LabsUndoProvider>;
}

describe('LabsUndoProvider.withBatch', () => {
  it('combines many pushes into a single undo entry', async () => {
    const { result } = renderHook(() => useLabsUndo(), { wrapper });
    const order: string[] = [];

    await act(async () => {
      await result.current.withBatch(async (queue) => {
        queue.push({
          undo: () => void order.push('a-u'),
          redo: () => void order.push('a-r'),
        });
        queue.push({
          undo: () => void order.push('b-u'),
          redo: () => void order.push('b-r'),
        });
        queue.push({
          undo: () => void order.push('c-u'),
          redo: () => void order.push('c-r'),
        });
      });
    });

    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);

    await act(async () => {
      await result.current.undo();
    });
    expect(order).toEqual(['c-u', 'b-u', 'a-u']);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);

    await act(async () => {
      await result.current.redo();
    });
    expect(order).toEqual(['c-u', 'b-u', 'a-u', 'a-r', 'b-r', 'c-r']);
  });

  it('does not push when zero entries are queued', async () => {
    const { result } = renderHook(() => useLabsUndo(), { wrapper });

    await act(async () => {
      await result.current.withBatch(async () => {
        // do nothing
      });
    });

    expect(result.current.canUndo).toBe(false);
  });

  it('returns the function result', async () => {
    const { result } = renderHook(() => useLabsUndo(), { wrapper });
    let returned: number | null = null;
    await act(async () => {
      returned = await result.current.withBatch(async (queue) => {
        queue.push({ undo: vi.fn(), redo: vi.fn() });
        return 42;
      });
    });
    expect(returned).toBe(42);
  });

  it('does not commit if the function throws', async () => {
    const { result } = renderHook(() => useLabsUndo(), { wrapper });
    await act(async () => {
      await result.current
        .withBatch(async (queue) => {
          queue.push({ undo: vi.fn(), redo: vi.fn() });
          throw new Error('boom');
        })
        .catch(() => undefined);
    });
    expect(result.current.canUndo).toBe(false);
  });

  it('queue.push is a no-op while replaying', async () => {
    const { result } = renderHook(() => useLabsUndo(), { wrapper });
    const undoSpy = vi.fn();
    const redoSpy = vi.fn();

    await act(async () => {
      await result.current.withBatch(async (queue) => {
        queue.push({ undo: undoSpy, redo: redoSpy });
      });
    });

    await act(async () => {
      await result.current.undo();
    });

    expect(undoSpy).toHaveBeenCalledOnce();
    expect(result.current.canRedo).toBe(true);
    expect(result.current.canUndo).toBe(false);
  });

  it('redirects downstream push calls into the batch transparently', async () => {
    const { result } = renderHook(() => useLabsUndo(), { wrapper });
    const order: string[] = [];

    await act(async () => {
      await result.current.withBatch(async () => {
        result.current.push({
          undo: () => void order.push('a-u'),
          redo: () => void order.push('a-r'),
        });
        result.current.push({
          undo: () => void order.push('b-u'),
          redo: () => void order.push('b-r'),
        });
      });
    });

    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);

    await act(async () => {
      await result.current.undo();
    });
    expect(order).toEqual(['b-u', 'a-u']);
  });

  it('nested withBatch flattens into the outer entry', async () => {
    const { result } = renderHook(() => useLabsUndo(), { wrapper });
    const order: string[] = [];

    await act(async () => {
      await result.current.withBatch(async () => {
        result.current.push({
          undo: () => void order.push('outer-1-u'),
          redo: () => void order.push('outer-1-r'),
        });
        await result.current.withBatch(async (q) => {
          q.push({
            undo: () => void order.push('inner-1-u'),
            redo: () => void order.push('inner-1-r'),
          });
          result.current.push({
            undo: () => void order.push('inner-2-u'),
            redo: () => void order.push('inner-2-r'),
          });
        });
        result.current.push({
          undo: () => void order.push('outer-2-u'),
          redo: () => void order.push('outer-2-r'),
        });
      });
    });

    expect(result.current.canUndo).toBe(true);
    await act(async () => {
      await result.current.undo();
    });
    expect(order).toEqual(['outer-2-u', 'inner-2-u', 'inner-1-u', 'outer-1-u']);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it('renders without crashing in a Provider', () => {
    const { unmount } = render(
      <LabsUndoProvider>
        <div>hi</div>
      </LabsUndoProvider>,
    );
    unmount();
  });
});
