import { useEffect } from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { OriginalsChartPlaybackProvider } from './OriginalsChartPlaybackContext';
import { useOptionalOriginalsChartPlayback } from './useOriginalsChartPlayback';
import { useOptionalOriginalsChartTransport } from './useOriginalsChartTransport';
import type { UseChartChordPlaybackResult } from '../../../shared/hooks/useChartChordPlayback';
import type { ChartLayout } from '../../../shared/music/chordPro/chordChartLayout';

// Control the playback hook's return so we can bump ONLY `playbackBeatTime`
// (the ~20x/second field) and assert the chart subtree does not re-render.
const hoisted = vi.hoisted(() => ({ current: null as UseChartChordPlaybackResult | null }));
vi.mock('../../../shared/hooks/useChartChordPlayback', () => ({
  useChartChordPlayback: () => hoisted.current,
}));

// Stable identities shared across every render — the real hook returns stable
// useCallback/useState references while a beat ticks.
const stableSettings = {} as UseChartChordPlaybackResult['settings'];
const stableLoad = {} as UseChartChordPlaybackResult['sampledPianoLoad'];
const stableMetronomePrefs = {} as UseChartChordPlaybackResult['metronomePreferences'];
const stableFns = {
  updateSettings: vi.fn(),
  setMetronomePreferences: vi.fn(),
  start: vi.fn(),
  startSectionLoop: vi.fn(),
  stop: vi.fn(),
};

function makeResult(playbackBeatTime: number): UseChartChordPlaybackResult {
  // A NEW object every beat (like the real hook), but with the transport fields
  // referentially unchanged — only the beat fields move.
  return {
    playing: true,
    canPlay: true,
    playingSectionId: null,
    settings: stableSettings,
    updateSettings: stableFns.updateSettings,
    metronomePreferences: stableMetronomePrefs,
    setMetronomePreferences: stableFns.setMetronomePreferences,
    start: stableFns.start,
    startSectionLoop: stableFns.startSectionLoop,
    stop: stableFns.stop,
    sampledPianoLoad: stableLoad,
    playbackBeatTime,
    playbackBeat: 0,
  };
}

/**
 * Counted in an effect rather than during render.
 *
 * Incrementing an outer variable (or mutating an outer object) from a render body trips the React
 * Compiler rules — `globals` for a bare `let`, `immutability` for an object property. An effect
 * with no dependency array runs once per commit, which is exactly what "did this subtree re-render"
 * means for this test, and it keeps the assertions below unchanged.
 */
const renderCounts = { transport: 0, full: 0 };

function TransportProbe(): null {
  useOptionalOriginalsChartTransport();
  useEffect(() => {
    renderCounts.transport += 1;
  });
  return null;
}

function FullProbe(): null {
  useOptionalOriginalsChartPlayback();
  useEffect(() => {
    renderCounts.full += 1;
  });
  return null;
}

const layout: ChartLayout = { sections: [] };

describe('OriginalsChartPlaybackProvider — beat ticks do not churn the chart', () => {
  beforeEach(() => {
    renderCounts.transport = 0;
    renderCounts.full = 0;
    hoisted.current = makeResult(0);
  });

  it('transport consumers stay off the beat-tick re-render path', () => {
    // Children element created ONCE so a provider re-render alone cannot re-render
    // them — only a context value they consume can.
    const children = (
      <>
        <TransportProbe />
        <FullProbe />
      </>
    );
    const ui = () => (
      <OriginalsChartPlaybackProvider layout={layout} tempo={120} storageKey="test-key">
        {children}
      </OriginalsChartPlaybackProvider>
    );

    const { rerender } = render(ui());

    const transportAfterMount = renderCounts.transport;
    const fullAfterMount = renderCounts.full;
    expect(transportAfterMount).toBeGreaterThan(0);
    expect(fullAfterMount).toBeGreaterThan(0);

    // Simulate 10 beat ticks: bump only playbackBeatTime, re-render the provider.
    for (let i = 1; i <= 10; i += 1) {
      hoisted.current = makeResult(i * 0.05);
      rerender(ui());
    }

    // The full-context consumer (tiny controls / drum-notation) tracks the beat...
    expect(renderCounts.full - fullAfterMount).toBe(10);
    // ...but the chart subtree (transport-only) must NOT re-render on beat ticks.
    // Before the context split this incremented once per tick (20Hz full-chart churn).
    expect(renderCounts.transport - transportAfterMount).toBe(0);
  });
});
