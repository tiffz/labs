// @vitest-environment jsdom
import { StrictMode } from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useMaqamState } from './useMaqamState';

/**
 * Counts every oscillator the app actually starts, so "did a keypress make a
 * sound?" is answerable without a real audio device.
 */
let startedOscillators: number;
let closedContexts: number;

class FakeParam {
  value = 0;
  setValueAtTime() {
    return this;
  }
  exponentialRampToValueAtTime() {
    return this;
  }
  linearRampToValueAtTime() {
    return this;
  }
  cancelScheduledValues() {
    return this;
  }
}

class FakeAudioContext {
  state: AudioContextState = 'running';
  currentTime = 0;
  destination = {};
  onstatechange: (() => void) | null = null;

  createOscillator() {
    startedOscillators += 1;
    return {
      type: 'sine',
      frequency: new FakeParam(),
      detune: new FakeParam(),
      connect() {},
      start() {},
      stop() {},
      onended: null,
    };
  }

  createGain() {
    return { gain: new FakeParam(), connect() {} };
  }

  addEventListener() {}
  removeEventListener() {}
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
  close() {
    closedContexts += 1;
    this.state = 'closed';
    return Promise.resolve();
  }
}

function Harness() {
  const { noteOn, noteOff, ribbon, keyTunings } = useMaqamState();
  return (
    <div>
      <button type="button" onClick={() => noteOn(64)} data-testid="play-e">
        play E
      </button>
      <button type="button" onClick={() => noteOff(64)} data-testid="stop-e">
        stop E
      </button>
      <span data-testid="ribbon-length">{ribbon.length}</span>
      <span data-testid="e-role">{keyTunings[4]?.role}</span>
    </div>
  );
}

beforeEach(() => {
  startedOscillators = 0;
  closedContexts = 0;
  vi.stubGlobal('AudioContext', FakeAudioContext);
  window.history.replaceState({}, '', '/maqam/');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useMaqamState under StrictMode', () => {
  /**
   * The regression this exists for: the synth was created in the render body
   * and disposed by an unmount effect. StrictMode runs that cleanup once right
   * after mount, and because a ref is not state nothing rebuilt it — so every
   * key was silently inaudible in production while the UI looked fine.
   *
   * Asserting on started oscillators rather than on visible output, because the
   * visible path was deliberately decoupled from audio: the staff updates even
   * when sound fails, which would hide exactly this bug from a DOM assertion.
   */
  it('still sounds a note after StrictMode tears the first effect pass down', async () => {
    render(
      <StrictMode>
        <Harness />
      </StrictMode>,
    );

    await act(async () => {
      screen.getByTestId('play-e').click();
    });

    expect(startedOscillators).toBeGreaterThan(0);
  });

  it('records the note on the staff as well', async () => {
    render(
      <StrictMode>
        <Harness />
      </StrictMode>,
    );

    await act(async () => {
      screen.getByTestId('play-e').click();
    });

    expect(screen.getByTestId('ribbon-length').textContent).toBe('1');
  });

  it('loads the default maqam, so E is a retuned key', () => {
    render(
      <StrictMode>
        <Harness />
      </StrictMode>,
    );
    expect(screen.getByTestId('e-role').textContent).toBe('microtonal');
  });

  it('closes its AudioContext when the app really unmounts', async () => {
    const { unmount } = render(<Harness />);
    await act(async () => {
      screen.getByTestId('play-e').click();
    });
    expect(closedContexts).toBe(0);

    unmount();
    expect(closedContexts).toBe(1);
  });

  it('keeps the staff updating even when the AudioContext cannot be created', async () => {
    // Chrome throws from the constructor past its six-context-per-document cap.
    vi.stubGlobal(
      'AudioContext',
      class {
        constructor() {
          throw new Error('too many AudioContexts');
        }
      },
    );

    render(<Harness />);
    await act(async () => {
      screen.getByTestId('play-e').click();
    });

    // No sound, but the notation still teaches — the app's other half survives.
    expect(startedOscillators).toBe(0);
    expect(screen.getByTestId('ribbon-length').textContent).toBe('1');
  });

  it('caps the live staff at four notes', async () => {
    render(<Harness />);
    for (let i = 0; i < 6; i += 1) {
      await act(async () => {
        screen.getByTestId('play-e').click();
      });
    }
    expect(screen.getByTestId('ribbon-length').textContent).toBe('4');
  });
});
