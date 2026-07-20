import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

/**
 * App wiring tests for Count Me In — the most timing-critical app.
 *
 * The engine itself is covered by the shared MetronomeEngine suites (grid, tempo
 * change, OfflineAudioContext render regression). These tests pin the *wiring*:
 * every control in the shell must forward to the right engine call with the
 * right arguments, because a silent wiring break (e.g. a stale closure) would
 * pass all engine unit tests while the UI does nothing.
 */

type EngineCall = { method: string; args: unknown[] };

const engineCalls: EngineCall[] = [];
let startConfigs: Array<Record<string, unknown>> = [];

vi.mock('./engine/MetronomeEngine', () => {
  class MockMetronomeEngine {
    onBeat(...args: unknown[]) {
      engineCalls.push({ method: 'onBeat', args });
    }
    async start(config: Record<string, unknown>) {
      engineCalls.push({ method: 'start', args: [config] });
      startConfigs.push(config);
    }
    stop() {
      engineCalls.push({ method: 'stop', args: [] });
    }
    setTempo(bpm: number) {
      engineCalls.push({ method: 'setTempo', args: [bpm] });
    }
    setTimeSignature(...args: unknown[]) {
      engineCalls.push({ method: 'setTimeSignature', args });
    }
    setSubdivisionVolumes(...args: unknown[]) {
      engineCalls.push({ method: 'setSubdivisionVolumes', args });
    }
    setSubdivisionLevel(...args: unknown[]) {
      engineCalls.push({ method: 'setSubdivisionLevel', args });
    }
    setVoiceGain(...args: unknown[]) {
      engineCalls.push({ method: 'setVoiceGain', args });
    }
    setClickGain(...args: unknown[]) {
      engineCalls.push({ method: 'setClickGain', args });
    }
    setDrumGain(...args: unknown[]) {
      engineCalls.push({ method: 'setDrumGain', args });
    }
    setChannelVoiceMutes(...args: unknown[]) {
      engineCalls.push({ method: 'setChannelVoiceMutes', args });
    }
    setChannelClickMutes(...args: unknown[]) {
      engineCalls.push({ method: 'setChannelClickMutes', args });
    }
    setChannelDrumMutes(...args: unknown[]) {
      engineCalls.push({ method: 'setChannelDrumMutes', args });
    }
    setPerBeatVolumes(...args: unknown[]) {
      engineCalls.push({ method: 'setPerBeatVolumes', args });
    }
    setVoiceMode(...args: unknown[]) {
      engineCalls.push({ method: 'setVoiceMode', args });
    }
  }
  return { MetronomeEngine: MockMetronomeEngine };
});

function callsFor(method: string): EngineCall[] {
  return engineCalls.filter((c) => c.method === method);
}

/** The engine is created lazily on first play; live setters forward only after that. */
async function startPlayback(): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: 'Play' }));
  await waitFor(() => expect(callsFor('start').length).toBeGreaterThan(0));
}

describe('Count App engine wiring', () => {
  beforeEach(() => {
    engineCalls.length = 0;
    startConfigs = [];
    window.localStorage.clear();
    window.history.replaceState(null, '', '/count/');
  });

  it('PLAY starts the engine with the current settings and STOP stops it', async () => {
    render(<App />);

    await startPlayback();
    const config = startConfigs[0];
    expect(config.bpm).toBe(120);
    expect(config.timeSignature).toEqual({ numerator: 4, denominator: 4 });
    // Beat callback wired before start so the first beat paints.
    expect(engineCalls.findIndex((c) => c.method === 'onBeat')).toBeLessThan(
      engineCalls.findIndex((c) => c.method === 'start'),
    );

    const stopButton = await screen.findByRole('button', { name: 'Stop' });
    fireEvent.click(stopButton);
    expect(callsFor('stop')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Play' })).toBeTruthy();
  });

  it('spacebar toggles playback like the play button', async () => {
    render(<App />);

    // Wait for the keydown listener (depends on handlePlay) before pressing Space —
    // under full-suite load a fixed 50ms sleep was flaky on CI.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Play' })).toBeTruthy());
    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    await waitFor(() => {
      expect(callsFor('start')).toHaveLength(1);
      expect(callsFor('onBeat').length).toBeGreaterThan(0);
    });
    // Listener re-binds after playing flips; wait for Stop before the second press.
    await screen.findByRole('button', { name: 'Stop' });
    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    await waitFor(() => expect(callsFor('stop')).toHaveLength(1));
  });

  it('BPM edits forward to engine.setTempo', async () => {
    render(<App />);
    await startPlayback();

    // Count uses a first-class BPM control (display → edit), not shared BpmInput.
    fireEvent.click(screen.getByTitle('Click to type a BPM'));
    const bpmInput = screen.getByRole('spinbutton', { name: 'BPM value' });
    fireEvent.change(bpmInput, { target: { value: '95' } });
    fireEvent.keyDown(bpmInput, { key: 'Enter' });

    await waitFor(() => {
      const tempoCalls = callsFor('setTempo');
      expect(tempoCalls.length).toBeGreaterThan(0);
      expect(tempoCalls[tempoCalls.length - 1].args).toEqual([95]);
    });
  });

  it('time-signature preset forwards to engine.setTimeSignature', async () => {
    render(<App />);
    await startPlayback();

    fireEvent.click(screen.getByRole('button', { name: '3/4' }));

    const tsCalls = callsFor('setTimeSignature');
    expect(tsCalls.length).toBeGreaterThan(0);
    expect(tsCalls[tsCalls.length - 1].args[0]).toEqual({ numerator: 3, denominator: 4 });
  });

  it('voice / click / drum toggles forward gains to the engine', async () => {
    render(<App />);
    await startPlayback();

    fireEvent.click(screen.getByRole('button', { name: 'Unmute voice' }));
    expect(callsFor('setVoiceGain').at(-1)?.args).toEqual([1]);

    // Click starts ON (0.5) → toggling mutes it.
    fireEvent.click(screen.getByRole('button', { name: 'Mute click' }));
    expect(callsFor('setClickGain').at(-1)?.args).toEqual([0]);

    fireEvent.click(screen.getByRole('button', { name: 'Unmute drum' }));
    expect(callsFor('setDrumGain').at(-1)?.args).toEqual([0.7]);
  });

  it('counting-style radio forwards to engine.setVoiceMode', async () => {
    render(<App />);
    await startPlayback();

    fireEvent.click(screen.getByRole('radio', { name: 'Ta ka di mi' }));
    expect(callsFor('setVoiceMode').at(-1)?.args).toEqual(['takadimi']);
  });

  it('URL params seed the initial engine start config', async () => {
    window.history.replaceState(null, '', '/count/?bpm=90&ts=7-8&sub=2&vm=takadimi&bg=2.2.3');
    render(<App />);

    await startPlayback();
    const config = startConfigs[0];
    expect(config.bpm).toBe(90);
    expect(config.timeSignature).toEqual({ numerator: 7, denominator: 8 });
    expect(config.voiceMode).toBe('takadimi');
    // `bg` URL values are dot-separated and parse to "+"-joined groupings.
    expect(config.beatGrouping).toBe('2+2+3');
  });
});
