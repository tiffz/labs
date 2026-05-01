import { describe, expect, it, vi } from 'vitest';
import { combineUndoCommits, createLabsUndoStack } from './labsUndoStack';

describe('createLabsUndoStack', () => {
  it('undo runs last undo and enables redo', async () => {
    const u = vi.fn();
    const r = vi.fn();
    const stack = createLabsUndoStack(10);
    stack.push({ undo: u, redo: r });
    expect(stack.canUndo).toBe(true);
    expect(stack.canRedo).toBe(false);
    await stack.undo();
    expect(u).toHaveBeenCalledOnce();
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(true);
  });

  it('redo replays after undo', async () => {
    const u = vi.fn();
    const r = vi.fn();
    const stack = createLabsUndoStack(10);
    stack.push({ undo: u, redo: r });
    await stack.undo();
    await stack.redo();
    expect(r).toHaveBeenCalledOnce();
    expect(stack.canUndo).toBe(true);
  });

  it('push after undo clears redo', async () => {
    const stack = createLabsUndoStack(10);
    stack.push({ undo: vi.fn(), redo: vi.fn() });
    await stack.undo();
    expect(stack.canRedo).toBe(true);
    stack.push({ undo: vi.fn(), redo: vi.fn() });
    expect(stack.canRedo).toBe(false);
  });

  it('drops oldest past when over maxDepth', () => {
    const stack = createLabsUndoStack(2);
    stack.push({ undo: vi.fn(), redo: vi.fn() });
    stack.push({ undo: vi.fn(), redo: vi.fn() });
    stack.push({ undo: vi.fn(), redo: vi.fn() });
    expect(stack.snapshot().pastLen).toBe(2);
  });
});

describe('combineUndoCommits', () => {
  it('returns null for empty input', () => {
    expect(combineUndoCommits([])).toBeNull();
  });

  it('runs undo in reverse order (LIFO)', async () => {
    const order: string[] = [];
    const a = { undo: () => void order.push('a-u'), redo: () => void order.push('a-r') };
    const b = { undo: () => void order.push('b-u'), redo: () => void order.push('b-r') };
    const c = { undo: () => void order.push('c-u'), redo: () => void order.push('c-r') };
    const combined = combineUndoCommits([a, b, c])!;
    await combined.undo();
    expect(order).toEqual(['c-u', 'b-u', 'a-u']);
  });

  it('runs redo in original order (FIFO)', async () => {
    const order: string[] = [];
    const a = { undo: () => void order.push('a-u'), redo: () => void order.push('a-r') };
    const b = { undo: () => void order.push('b-u'), redo: () => void order.push('b-r') };
    const combined = combineUndoCommits([a, b])!;
    await combined.redo();
    expect(order).toEqual(['a-r', 'b-r']);
  });

  it('awaits async undo/redo callbacks sequentially', async () => {
    const events: string[] = [];
    const slow = (label: string, ms: number): (() => Promise<void>) =>
      async () => {
        events.push(`${label}-start`);
        await new Promise((r) => setTimeout(r, ms));
        events.push(`${label}-end`);
      };
    const combined = combineUndoCommits([
      { undo: slow('a', 5), redo: slow('a-r', 5) },
      { undo: slow('b', 1), redo: slow('b-r', 1) },
    ])!;
    await combined.undo();
    expect(events).toEqual(['b-start', 'b-end', 'a-start', 'a-end']);
  });

  it('snapshots the input array (later mutation has no effect)', async () => {
    const a = { undo: vi.fn(), redo: vi.fn() };
    const inputs = [a];
    const combined = combineUndoCommits(inputs)!;
    inputs.push({ undo: vi.fn(), redo: vi.fn() });
    await combined.undo();
    expect(a.undo).toHaveBeenCalledOnce();
  });
});
