// @vitest-environment jsdom
import { StrictMode } from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useMaqamState } from './useMaqamState';

/**
 * Counts every buffer source the app actually starts, so "did a keypress make a
 * sound?" is answerable without a real audio device.
 *
 * The synth used to be an oscillator per note; it is now a rendered
 * plucked-string buffer played as a doubled course, so one keypress starts two
 * sources.
 */
let startedSources: number;
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

  sampleRate = 44100;

  createBufferSource() {
    startedSources += 1;
    return {
      buffer: null,
      playbackRate: new FakeParam(),
      connect() {},
      start() {},
      stop() {},
      onended: null,
    };
  }

  createBuffer(channels: number, length: number) {
    return {
      length,
      numberOfChannels: channels,
      sampleRate: 44100,
      copyToChannel() {},
    };
  }

  createConvolver() {
    return { buffer: null, connect() {} };
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
  const { noteOn, noteOff, activeNotes, keyTunings, togglePlayback, selectMelody, isPlaying, audioBlocked } =
    useMaqamState();
  return (
    <div>
      <button type="button" onClick={togglePlayback} data-testid="toggle-play">
        play melody
      </button>
      <button type="button" onClick={() => selectMelody('scale-down')} data-testid="switch-melody">
        switch melody
      </button>
      <span data-testid="is-playing">{String(isPlaying)}</span>
      <span data-testid="audio-blocked">{String(audioBlocked)}</span>
      <button type="button" onClick={() => noteOn(64)} data-testid="play-e">
        play E
      </button>
      <button type="button" onClick={() => noteOff(64)} data-testid="stop-e">
        stop E
      </button>
      <span data-testid="active-count">{activeNotes.size}</span>
      <span data-testid="e-role">{keyTunings[4]?.role}</span>
      <span data-testid="e-retuned">{String(keyTunings[4]?.isRetuned)}</span>
    </div>
  );
}

beforeEach(() => {
  startedSources = 0;
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
   * Asserting on started sources rather than on visible output, because the
   * visible path was deliberately decoupled from audio: the keyboard responds
   * even when sound fails, which would hide exactly this bug from a DOM
   * assertion.
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

    expect(startedSources).toBeGreaterThan(0);
  });

  it('marks the key as held so the staff can light its degree', async () => {
    render(
      <StrictMode>
        <Harness />
      </StrictMode>,
    );

    await act(async () => {
      screen.getByTestId('play-e').click();
    });

    expect(screen.getByTestId('active-count').textContent).toBe('1');
  });

  it('releases the key on note off', async () => {
    render(<Harness />);
    await act(async () => {
      screen.getByTestId('play-e').click();
    });
    await act(async () => {
      screen.getByTestId('stop-e').click();
    });
    expect(screen.getByTestId('active-count').textContent).toBe('0');
  });

  it('loads the default maqam, so E is in the scale and retuned', () => {
    render(
      <StrictMode>
        <Harness />
      </StrictMode>,
    );
    // Rast's third is E half-flat: membership and retuning are now separate
    // facts, and both must be true of the same key.
    expect(screen.getByTestId('e-role').textContent).toBe('in-scale');
    expect(screen.getByTestId('e-retuned').textContent).toBe('true');
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

  it('keeps the keyboard responding even when the AudioContext cannot be created', async () => {
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
    expect(startedSources).toBe(0);
    expect(screen.getByTestId('active-count').textContent).toBe('1');
  });

  it('does not double-count a retriggered key', async () => {
    render(<Harness />);
    for (let i = 0; i < 4; i += 1) {
      await act(async () => {
        screen.getByTestId('play-e').click();
      });
    }
    // One key held is one entry, however many times it retriggers — otherwise
    // a MIDI controller's key repeat would light phantom degrees.
    expect(screen.getByTestId('active-count').textContent).toBe('1');
  });

  /**
   * `startPlayback` schedules inside `resume().then(...)`, and `isPlaying` is
   * only set there too — so a second press arriving before the microtask ran
   * saw `isPlaying === false`, went ahead, and scheduled the entire phrase a
   * second time. Every note sounded doubled and slightly flammed, and the
   * first animation frame leaked because its handle was overwritten.
   */
  it('schedules one phrase when Play is pressed twice in a row', async () => {
    const first = render(<Harness />);
    await act(async () => {
      screen.getByTestId('toggle-play').click();
    });
    const onePhrase = startedSources;
    expect(onePhrase).toBeGreaterThan(0);
    first.unmount();

    startedSources = 0;
    render(<Harness />);
    await act(async () => {
      // Both presses land before the resume microtask, the way a real
      // double-click does.
      screen.getByTestId('toggle-play').click();
      screen.getByTestId('toggle-play').click();
    });

    expect(startedSources).toBe(onePhrase);
  });

  it('abandons a phrase that was stopped while the audio context was still waking', async () => {
    render(<Harness />);
    await act(async () => {
      screen.getByTestId('toggle-play').click();
      // Changing the pattern stops playback. Before the generation check, the
      // pending `.then` scheduled the old phrase anyway: it played on, with the
      // UI insisting nothing was playing.
      screen.getByTestId('switch-melody').click();
    });

    expect(startedSources).toBe(0);
    expect(screen.getByTestId('is-playing').textContent).toBe('false');
  });

  it('says so when it cannot make a sound, rather than failing silently', async () => {
    vi.stubGlobal(
      'AudioContext',
      class {
        constructor() {
          throw new Error('too many AudioContexts');
        }
      },
    );

    render(<Harness />);
    expect(screen.getByTestId('audio-blocked').textContent).toBe('false');

    await act(async () => {
      screen.getByTestId('play-e').click();
    });

    // The one thing worse than no sound is no sound and no explanation.
    expect(screen.getByTestId('audio-blocked').textContent).toBe('true');
  });

  it('does not cry wolf when audio is working', async () => {
    render(<Harness />);
    await act(async () => {
      screen.getByTestId('play-e').click();
    });
    expect(screen.getByTestId('audio-blocked').textContent).toBe('false');
  });
});
