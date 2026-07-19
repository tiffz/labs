import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLabsDebouncedChangeBus } from './labsDebouncedChangeBus';

describe('createLabsDebouncedChangeBus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('coalesces rapid notifies into one trailing flush', () => {
    const bus = createLabsDebouncedChangeBus();
    const listener = vi.fn();
    bus.subscribe(listener);

    bus.notify();
    bus.notify();
    bus.notify();
    expect(listener).not.toHaveBeenCalled();
    expect(bus.isPending()).toBe(true);

    vi.advanceTimersByTime(750);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(undefined);
    expect(bus.isPending()).toBe(false);
  });

  it('immediate notify flushes now with the immediate event and cancels the armed timer', () => {
    const bus = createLabsDebouncedChangeBus();
    const listener = vi.fn();
    bus.subscribe(listener);

    bus.notify();
    bus.notify({ immediate: true });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ immediate: true });

    vi.advanceTimersByTime(2000);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('respects a custom debounce window', () => {
    const bus = createLabsDebouncedChangeBus();
    const listener = vi.fn();
    bus.subscribe(listener);

    bus.notify({ debounceMs: 100 });
    vi.advanceTimersByTime(99);
    expect(listener).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe stops delivery', () => {
    const bus = createLabsDebouncedChangeBus();
    const listener = vi.fn();
    const unsubscribe = bus.subscribe(listener);
    unsubscribe();

    bus.notify({ immediate: true });
    expect(listener).not.toHaveBeenCalled();
  });
});
