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
    connect = vi.fn(() => ({
      disconnect: vi.fn(),
      gain: {},
      exponentialRampToValueAtTime: vi.fn(),
      setValueAtTime: vi.fn(),
    }));
    disconnect = vi.fn();
  }
  class MockGain {
    gain = { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
    connect = vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn() }));
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
      disconnect: vi.fn(),
    }),
    decodeAudioData: vi.fn().mockResolvedValue({
      length: 100,
      numberOfChannels: 1,
      getChannelData: () => new Float32Array(100),
    }),
    createBufferSource: vi.fn(() => ({
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    })),
  }));
  Object.defineProperty(globalThis, 'AudioContext', { value: Ctx, configurable: true });
  Object.defineProperty(window, 'AudioContext', { value: Ctx, configurable: true });
}

function renderApp() {
  return render(
    <ThemeProvider theme={getAppTheme('agility')}>
      <App />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  mockAudioContext();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: new URL('https://example.test/agility/'),
  });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('Vocal Agility Trainer App', () => {
  it('shows onboarding on first run', async () => {
    renderApp();
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByRole('banner')).toHaveTextContent(/Vocal Agility Trainer/i);
    expect(screen.getByRole('heading', { level: 1, name: /Vocal Agility Trainer/i })).toBeInTheDocument();
    expect(screen.getByText(/Timing calibration/i)).toBeInTheDocument();
  });

  it('shows home after calibration stored', async () => {
    localStorage.setItem('agility:calibrationDone:v1', '1');
    localStorage.setItem('agility:comfortLow', '58');
    localStorage.setItem('agility:comfortHigh', '74');
    renderApp();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.queryByText(/Timing calibration/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Begin level/i)).toBeInTheDocument();
  });
});
