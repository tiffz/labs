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

// Clear URL between tests to prevent state pollution
afterEach(() => {
  window.history.pushState({}, '', '/');
});

// Mock RhythmDisplay to expose drop handler
// We use a global variable to capture the prop because usually we can't access it easily otherwise.
// Actually, we can just render a button to call triggers.
// Mock RhythmDisplay to expose drop handler
vi.mock('./components/RhythmDisplay', () => {
  return {
    default: (props: { onDropPattern: (p: string, t: number, op: 'replace' | 'insert') => void, onSelectionChange: (s: number, e: number, l: number) => void, notation: string }) => (
      <div data-testid="rhythm-display-mock">
        Note Display
        <button data-testid="trigger-drop" onClick={() => props.onDropPattern('S---', 144, 'replace')}>Trigger Drop (P4)</button>
        <button data-testid="trigger-drop-ghost" onClick={() => props.onDropPattern('S---', 160, 'replace')}>Drop on Ghost (M10)</button>
        {/* We expose selection handlers here too since RhythmDisplay receives them */}
        <button
          data-testid="trigger-select-ghost"
          onClick={() => props.onSelectionChange(176, 192, 16)}
        >
          Select Ghost (Legacy M11)
        </button>
        <button
          data-testid="trigger-select-ghost-corrected"
          onClick={() => props.onSelectionChange(160, 176, 16)}
        >
          Select Ghost Corrected (M10)
        </button>
        <button
          data-testid="trigger-select-suffix-1"
          onClick={() => props.onSelectionChange(208, 224, 16)}
        >
          Select Suffix 1
        </button>
        <div data-testid="debug-notation">Current: {props.notation}</div>
      </div>
    )
  };
});

// Mock NotePalette to expose replace handler
vi.mock('./components/NotePalette', () => {
  return {
    default: (props: { onReplaceSelection: (p: string) => void }) => (
      <div data-testid="note-palette-mock">
        <button
          data-testid="trigger-replace"
          onClick={() => props.onReplaceSelection('S---')}
        >
          Replace Selection
        </button>
      </div>
    )
  };
});

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset URL
    window.history.replaceState({}, '', '/drums');

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
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

  describe('Keyboard shortcuts', () => {
    it('should not trigger randomize on Command+R (Mac) or Ctrl+R (Windows)', () => {
      render(<App />);

      const input = screen.getByLabelText('Rhythm Notation') as HTMLInputElement;
      const initialNotation = input.value;
      const undoButton = screen.getByLabelText('Undo');

      // Initially undo should be disabled
      expect(undoButton).toBeDisabled();

      // Simulate Command+R (Mac) - metaKey pressed
      // Use native KeyboardEvent to ensure metaKey property is set correctly
      const macEvent = new KeyboardEvent('keydown', {
        key: 'r',
        code: 'KeyR',
        metaKey: true, // Command key on Mac
        bubbles: true,
        cancelable: true,
      });
      window.dispatchEvent(macEvent);

      // Notation should not change and undo should still be disabled
      expect(input.value).toBe(initialNotation);
      expect(undoButton).toBeDisabled();

      // Simulate Ctrl+R (Windows/Linux) - ctrlKey pressed
      const windowsEvent = new KeyboardEvent('keydown', {
        key: 'r',
        code: 'KeyR',
        ctrlKey: true, // Ctrl key on Windows/Linux
        bubbles: true,
        cancelable: true,
      });
      window.dispatchEvent(windowsEvent);

      // Notation should still not change and undo should still be disabled
      expect(input.value).toBe(initialNotation);
      expect(undoButton).toBeDisabled();
    });

    it('should trigger randomize on R key without modifier keys', async () => {
      render(<App />);

      const input = screen.getByLabelText('Rhythm Notation') as HTMLInputElement;

      // Ensure input is not focused (keyboard shortcuts don't work when typing)
      input.blur();

      // Simulate R key without modifiers
      fireEvent.keyDown(window, {
        key: 'r',
        code: 'KeyR',
        shiftKey: false,
        metaKey: false,
        ctrlKey: false,
      });

      // Wait for state update - randomize adds to history, so undo should be enabled
      await waitFor(() => {
        const undoButton = screen.getByLabelText('Undo');
        // If randomize was called, undo should be enabled (notation was added to history)
        expect(undoButton).not.toBeDisabled();
      }, { timeout: 1000 });
    });

    it('should not trigger randomize when typing in input fields', () => {
      render(<App />);

      const input = screen.getByLabelText('Rhythm Notation') as HTMLInputElement;
      const initialNotation = input.value;

      // Focus the input
      input.focus();

      // Simulate R key while typing
      fireEvent.keyDown(input, {
        key: 'r',
        code: 'KeyR',
        target: input,
      });

      // Notation should not change (R should be typed into input, not trigger randomize)
      expect(input.value).toBe(initialNotation);
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

  describe('Share functionality', () => {
    it('should copy URL to clipboard when share button is clicked', async () => {
      render(<App />);

      // Find share button
      const shareButton = screen.getByLabelText('Share rhythm');
      expect(shareButton).toBeInTheDocument();

      // Click share button
      fireEvent.click(shareButton);

      // Wait for clipboard API to be called
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
      });

      // Verify it was called with the current URL
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(window.location.href);

      // Verify feedback toast appears
      await waitFor(() => {
        expect(screen.getByText('URL copied to clipboard!')).toBeInTheDocument();
      });
    });

    it('should handle clipboard API failure gracefully', async () => {
      // Mock clipboard API to fail
      const mockWriteText = vi.fn().mockRejectedValue(new Error('Clipboard failed'));
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      // Mock document.execCommand as fallback
      const mockExecCommand = vi.fn().mockReturnValue(true);
      document.execCommand = mockExecCommand;

      render(<App />);

      const shareButton = screen.getByLabelText('Share rhythm');
      fireEvent.click(shareButton);

      // Should attempt fallback
      await waitFor(() => {
        expect(mockExecCommand).toHaveBeenCalledWith('copy');
      });
    });
  });

  describe('Note Selection', () => {
    it('should clear selection when Escape key is pressed', () => {
      render(<App />);

      // Simulate pressing Escape key
      fireEvent.keyDown(document, { key: 'Escape' });

      // Selection should be cleared (no error should occur)
      // The app should still be functional
      expect(screen.getByText('Darbuka Rhythm Trainer')).toBeInTheDocument();
    });

    it('should not crash when Delete key is pressed without selection', () => {
      render(<App />);

      // Simulate pressing Delete key without any selection
      fireEvent.keyDown(document, { key: 'Delete' });

      // App should still be functional
      expect(screen.getByText('Darbuka Rhythm Trainer')).toBeInTheDocument();
    });

    it('should not crash when Backspace key is pressed without selection', () => {
      render(<App />);

      // Simulate pressing Backspace key without any selection
      fireEvent.keyDown(document, { key: 'Backspace' });

      // App should still be functional
      expect(screen.getByText('Darbuka Rhythm Trainer')).toBeInTheDocument();
    });

    it('should render Note Display section', () => {
      render(<App />);

      // Note Display section should be present
      expect(screen.getByText('Note Display')).toBeInTheDocument();
    });
  });

  describe('Regression: Repeat Handling', () => {
    it('should NOT unroll repeats when editing a measure AFTER a repeat block', async () => {
      // Setup Complex Notation
      const P1 = 'D-----T-S-----TK'; // 16 ticks
      const P2 = 'D-----DKTKD--DKS';
      const P3 = 'DKTKT-______D-DT';
      const P4 = '-K-S';
      // Notation: P1 | % |x6 | P2 | |: P3 :|x3 | P4
      const complexNotation = `${P1} | % |x6 | ${P2} | |: ${P3} :|x3 | ${P4}`;

      render(<App />);

      const input = screen.getByLabelText('Rhythm Notation') as HTMLTextAreaElement;
      fireEvent.change(input, { target: { value: complexNotation } });

      // Wait for state update
      await waitFor(() => {
        expect(input.value).toBe(complexNotation);
      });

      // Trigger Drop on M13 (P4). 
      // 13 * 16 = 208 ticks.

      const trigger = screen.getByTestId('trigger-drop');
      fireEvent.click(trigger);

      // Expected result: P4 ('-K-S') replaced by 'S---'.

      const expectedPrefix = `${P1} | % |x6 | ${P2} | |: ${P3} :|x3 |`;
      const expected = `${expectedPrefix} S---`;

      await waitFor(() => {
        expect(input.value).toBe(expected);
      });

      // Explicitly check for unrolling
      expect(input.value).toContain('|:');
      expect(input.value).toContain(':|x3');
      expect(input.value).toContain('% |x6');
      expect(input.value).toContain('% |x6');
    });

    it.skip('should UNROLL section repeats when editing a Ghost Measure explicitly', async () => {
      const P1 = 'D-----T-S-----TK'; const P2 = 'D-----DKTKD--DKS'; const P3 = 'DKTKT-______D-DT'; const P4 = '-K-S';
      const complexNotation = `${P1} | % |x6 | ${P2} | |: ${P3} :|x3 | ${P4}`;
      render(<App />);

      const input = screen.getByLabelText('Rhythm Notation') as HTMLTextAreaElement;
      fireEvent.change(input, { target: { value: complexNotation } });
      await waitFor(() => expect(input.value).toBe(complexNotation));

      // Trigger Selection on M10 (Ghost).
      fireEvent.click(screen.getByTestId('trigger-select-ghost-corrected'));

      // Trigger Replace
      fireEvent.click(screen.getByTestId('trigger-replace'));

      // Expected: |: P3 :| P3 | S--- | P3 ...
      // Wait. Original: |: P3 :| x3.
      // Expansion: |: P3 :| P3 | P3 | P3.
      // M11 is SECOND "P3". (M9 Source, M10 Ghost1, M11 Ghost2, M12 Ghost3).
      // We edit M11 -> replaced with 'S---'.
      // Result: |: P3 :| P3 | S--- | P3.
      // Notation: P1...P2 | |: P3 :| P3 | S--- | P3 | P4.

      // Check that |: P3 :| still exists (Source preserved).
      // Check that S--- appears.
      // Check that :|x3 GONE.

      await waitFor(() => {
        expect(input.value).not.toContain(':|x3');
      });
      expect(input.value).toContain('|:'); // Source block preserved
      expect(input.value).toContain('S---'); // Edit applied
      expect(input.value).toContain('DKTKT-______D-DT | S---'); // Context
    });
    // Duplicate test removed.


  });
});
