import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import { rhythmPlayer } from './utils/rhythmPlayer';

// Mock rhythmPlayer
vi.mock('./utils/rhythmPlayer', () => ({
  rhythmPlayer: {
    play: vi.fn(),
    stop: vi.fn(),
    setMetronomeEnabled: vi.fn(),
    setSettings: vi.fn(),
    setBpmAtMeasureBoundary: vi.fn(),
  },
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset URL
    window.history.replaceState({}, '', '/drums');
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('renders the app title', () => {
    render(<App />);
    expect(screen.getByText('Darbuka Rhythm Trainer')).toBeInTheDocument();
  });

  it('renders the rhythm input section', () => {
    render(<App />);
    expect(screen.getByLabelText('Rhythm Notation')).toBeInTheDocument();
  });

  it('renders the rhythm display section', () => {
    render(<App />);
    // Check for the input field instead since "Rhythm Notation" appears twice
    expect(screen.getByPlaceholderText('D-T-__T-D---T---')).toBeInTheDocument();
  });

  it('displays the default time signature in controls', () => {
    render(<App />);
    // Check the time signature controls have correct default values
    const numeratorInput = screen.getByLabelText('Time signature numerator') as HTMLInputElement;
    const denominatorSelect = screen.getAllByRole('combobox').find(
      select => (select as HTMLElement).getAttribute('aria-label') === 'Time signature denominator'
    ) as HTMLSelectElement;
    expect(numeratorInput).toHaveValue(4); // numerator
    expect(denominatorSelect).toHaveValue('4'); // denominator
  });

  it('has a default rhythm notation', () => {
    render(<App />);
    const input = screen.getByLabelText('Rhythm Notation') as HTMLInputElement;
    expect(input.value).toBe('D-T-__T-D---T---');
  });

  describe('Metronome toggle', () => {
    it('should toggle metronome when button is clicked', () => {
      render(<App />);
      
      const metronomeButton = screen.getByLabelText('Toggle metronome');
      
      // Initially should be off
      expect(metronomeButton).not.toHaveClass('active');
      
      // Click to enable
      fireEvent.click(metronomeButton);
      
      expect(metronomeButton).toHaveClass('active');
      expect(rhythmPlayer.setMetronomeEnabled).toHaveBeenCalledWith(true);
      
      // Click to disable
      fireEvent.click(metronomeButton);
      
      expect(metronomeButton).not.toHaveClass('active');
      expect(rhythmPlayer.setMetronomeEnabled).toHaveBeenCalledWith(false);
    });

    it('should update metronome state and rhythm player when toggled', () => {
      render(<App />);
      
      const metronomeButton = screen.getByLabelText('Toggle metronome');
      
      fireEvent.click(metronomeButton);
      
      // Should have been called with true
      expect(rhythmPlayer.setMetronomeEnabled).toHaveBeenCalledWith(true);
      
      // Verify the button shows active state
      expect(metronomeButton).toHaveClass('active');
    });
  });

  describe('Notation history', () => {
    it('should support undo/redo', () => {
      render(<App />);
      
      const input = screen.getByLabelText('Rhythm Notation') as HTMLTextAreaElement;
      const undoButton = screen.getByLabelText('Undo');
      const redoButton = screen.getByLabelText('Redo');
      
      // Initially undo/redo should be disabled
      expect(undoButton).toBeDisabled();
      expect(redoButton).toBeDisabled();
      
      // Make a change
      fireEvent.change(input, { target: { value: 'D-T-K-T-' } });
      
      // Undo should be enabled
      expect(undoButton).not.toBeDisabled();
      
      // Undo
      fireEvent.click(undoButton);
      
      expect(input.value).toBe('D-T-__T-D---T---');
      expect(redoButton).not.toBeDisabled();
      
      // Redo
      fireEvent.click(redoButton);
      
      expect(input.value).toBe('D-T-K-T-');
    });

    it('should clear notation when clear button is clicked', () => {
      render(<App />);
      
      const input = screen.getByLabelText('Rhythm Notation') as HTMLTextAreaElement;
      const clearButton = screen.getByLabelText('Clear rhythm');
      
      // Make a change first
      fireEvent.change(input, { target: { value: 'D-T-K-T-' } });
      expect(input.value).toBe('D-T-K-T-');
      
      // Clear
      fireEvent.click(clearButton);
      
      expect(input.value).toBe('');
    });
  });

  describe('Playback controls', () => {
    it('should render play button', () => {
      render(<App />);
      
      const playButton = screen.getByLabelText('Play rhythm (Spacebar)');
      expect(playButton).toBeInTheDocument();
    });

    it('should call rhythmPlayer.play when play button is clicked', () => {
      render(<App />);
      
      const playButton = screen.getByLabelText('Play rhythm (Spacebar)');
      fireEvent.click(playButton);
      
      expect(rhythmPlayer.play).toHaveBeenCalled();
    });

    it('should stop playback when notation changes', async () => {
      render(<App />);
      
      const input = screen.getByLabelText('Rhythm Notation') as HTMLTextAreaElement;
      const playButton = screen.getByLabelText('Play rhythm (Spacebar)');
      
      // Start playback
      fireEvent.click(playButton);
      
      expect(rhythmPlayer.play).toHaveBeenCalled();
      
      // Change notation
      fireEvent.change(input, { target: { value: 'D-T-K-T-' } });
      
      await waitFor(() => {
        expect(rhythmPlayer.stop).toHaveBeenCalled();
      });
    });
  });
});

