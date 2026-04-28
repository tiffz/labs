import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { getAppTheme } from '../shared/ui/theme/appTheme';
import App from './App';

function mockAudioContext(): void {
  class MockOscillator {
    frequency = { value: 0, setValueAtTime: vi.fn() };
    type = 'sine';
    start = vi.fn();
    stop = vi.fn();
    connect = vi.fn(() => ({ connect: vi.fn() }));
    disconnect = vi.fn();
  }
  class MockGain {
    gain = { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
    connect = vi.fn(() => ({ connect: vi.fn() }));
    disconnect = vi.fn();
  }
  const Ctx = vi.fn().mockImplementation(() => ({
    state: 'running',
    currentTime: 0,
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    createOscillator: () => new MockOscillator(),
    createGain: () => new MockGain(),
    createStereoPanner: () => ({
      pan: { setValueAtTime: vi.fn() },
      connect: vi.fn(() => ({ connect: vi.fn() })),
    }),
    decodeAudioData: vi.fn().mockResolvedValue({}),
    createBufferSource: vi.fn(),
  }));
  Object.defineProperty(globalThis, 'AudioContext', { value: Ctx, configurable: true });
  Object.defineProperty(window, 'AudioContext', { value: Ctx, configurable: true });
}

function renderApp() {
  return render(
    <ThemeProvider theme={getAppTheme('melodia')}>
      <App />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  mockAudioContext();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: new URL('https://example.test/melodia/'),
  });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('Melodia App', () => {
  it('shows the calibration phase on first run', async () => {
    renderApp();
    await act(async () => {
      await Promise.resolve();
    });
    expect(
      screen.getByRole('heading', { name: /Melodia Online/i, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sing your Do/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Low voice/i })).toBeInTheDocument();
  });

  it('skips calibration on subsequent visits and routes into a lesson', async () => {
    localStorage.setItem('melodia:calibrationDone:v1', '1');
    localStorage.setItem('melodia:comfortLow', '60');
    localStorage.setItem('melodia:comfortHigh', '72');
    renderApp();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.queryByRole('button', { name: /Sing your Do/i })).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /^Audiation — sing this silently$/i }),
    ).toBeInTheDocument();
  });

  it('renders the catalog in debug mode without requiring calibration', async () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: new URL('https://example.test/melodia/?debug=1'),
    });
    renderApp();
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByRole('heading', { name: /Catalog/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Sing your Do/i })).not.toBeInTheDocument();
  });
});
