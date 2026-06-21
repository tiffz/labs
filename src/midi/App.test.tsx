import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { getAppTheme } from '../shared/ui/theme/appTheme';
import App from './App';

vi.mock('../shared/midi/midiInput', () => ({
  getMidiInput: () => ({
    onNote: vi.fn(),
    onConnection: vi.fn(),
    init: vi.fn().mockResolvedValue(true),
    isConnected: vi.fn().mockReturnValue(false),
  }),
}));

describe('Midi App', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      ...navigator,
      requestMIDIAccess: undefined,
    });
  });

  it('renders scratchpad shell', () => {
    render(
      <ThemeProvider theme={getAppTheme('midi')}>
        <App />
      </ThemeProvider>,
    );
    expect(screen.getByRole('heading', { name: /Midi Scratchpad/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Capture last/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Scratchpad/i })).toBeInTheDocument();
  });
});
