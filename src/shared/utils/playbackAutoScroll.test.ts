import { describe, expect, it, vi } from 'vitest';
import { scrollPlaybackTarget, type PlaybackAutoScrollState } from './playbackAutoScroll';

function createContainer(scrollTop: number) {
  const container = document.createElement('div');
  Object.defineProperty(container, 'scrollTop', {
    value: scrollTop,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(container, 'clientHeight', {
    value: 400,
    configurable: true,
  });
  container.getBoundingClientRect = () =>
    ({ top: 100, bottom: 500, left: 0, right: 800, width: 800, height: 400, x: 0, y: 100, toJSON: () => ({}) }) as DOMRect;
  Object.defineProperty(container, 'scrollTo', {
    value: vi.fn(({ top }: ScrollToOptions) => {
      if (typeof top === 'number') {
        container.scrollTop = top;
      }
    }),
    configurable: true,
  });
  return container;
}

function createTarget(top: number) {
  const target = document.createElement('div');
  target.getBoundingClientRect = () =>
    ({ top, bottom: top + 20, left: 0, right: 100, width: 100, height: 20, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;
  return target;
}

describe('playbackAutoScroll', () => {
  it('prevents backward movement when allowBackward is false', () => {
    const container = createContainer(600);
    const target = createTarget(120);
    const state: PlaybackAutoScrollState = {
      lastMarker: 4,
      lastScrollAtMs: 0,
      lastTargetTop: 620,
    };

    scrollPlaybackTarget({
      marker: 5,
      target,
      state,
      scrollContainer: container,
      allowBackward: false,
      minDeltaPx: 10,
      minIntervalMs: 0,
      preferredTopRatio: 0.18,
    });

    expect(container.scrollTo).not.toHaveBeenCalled();
    expect(state.lastMarker).toBe(5);
  });

  it('allows backward movement when allowBackward is true', () => {
    const container = createContainer(600);
    const target = createTarget(120);
    const state: PlaybackAutoScrollState = {
      lastMarker: 4,
      lastScrollAtMs: 0,
      lastTargetTop: 620,
    };

    scrollPlaybackTarget({
      marker: 5,
      target,
      state,
      scrollContainer: container,
      allowBackward: true,
      minDeltaPx: 10,
      minIntervalMs: 0,
      preferredTopRatio: 0.18,
    });

    expect(container.scrollTo).toHaveBeenCalledTimes(1);
    expect(container.scrollTop).toBeLessThan(600);
  });

  it('uses smooth scrolling by default', () => {
    const container = createContainer(0);
    const target = createTarget(280);
    const state: PlaybackAutoScrollState = {
      lastMarker: null,
      lastScrollAtMs: 0,
      lastTargetTop: null,
    };

    scrollPlaybackTarget({
      marker: 1,
      target,
      state,
      scrollContainer: container,
      minDeltaPx: 1,
      minIntervalMs: 0,
    });

    expect(container.scrollTo).toHaveBeenCalledTimes(1);
    const mock = container.scrollTo as unknown as { mock: { calls: Array<[ScrollToOptions]> } };
    expect(mock.mock.calls[0][0]?.behavior).toBe('smooth');
  });
});
