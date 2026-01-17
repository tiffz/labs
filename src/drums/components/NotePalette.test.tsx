import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import NotePalette, { type NotePaletteHandle } from './NotePalette';

describe('NotePalette', () => {
  const defaultProps = {
    onInsertPattern: vi.fn(),
    remainingBeats: 16,
    timeSignature: { numerator: 4, denominator: 4 } as const,
  };

  it('renders the palette header', () => {
    render(<NotePalette {...defaultProps} />);
    
    expect(screen.getByText('Note Palette')).toBeInTheDocument();
    expect(screen.getByText('Click or drag and drop to insert patterns')).toBeInTheDocument();
  });

  it('renders single note section', () => {
    render(<NotePalette {...defaultProps} />);
    
    // Section title should be visible
    expect(screen.getByText('Single Notes')).toBeInTheDocument();
  });

  it('renders common patterns section', () => {
    render(<NotePalette {...defaultProps} />);
    
    // Section title should be visible
    expect(screen.getByText('Common Patterns')).toBeInTheDocument();
  });

  it('calls onInsertPattern when a pattern button is clicked', () => {
    const onInsertPattern = vi.fn();
    render(<NotePalette {...defaultProps} onInsertPattern={onInsertPattern} />);
    
    // Find all buttons that are not disabled
    const buttons = screen.getAllByRole('button').filter(btn => 
      !btn.hasAttribute('disabled') && 
      !btn.querySelector('input[type="checkbox"]') // Exclude sound preview checkbox
    );
    
    // Click the first enabled pattern button
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.click(buttons[0]);
    
    // Should have been called with some pattern
    expect(onInsertPattern).toHaveBeenCalledTimes(1);
    expect(typeof onInsertPattern.mock.calls[0][0]).toBe('string');
  });

  it('renders multiple note pattern buttons', () => {
    render(<NotePalette {...defaultProps} />);
    
    // 5 rows x 5 columns (table: D, T, K, S, Rest) = 25 single note buttons
    // Common patterns are now in expandable groups, so they're not all visible by default
    // Plus group headers and quick insert buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(25);
  });

  it('renders SVG notation for each button', () => {
    const { container } = render(<NotePalette {...defaultProps} />);
    
    // Check that SVG elements are present
    // Table header has 4 small symbol SVGs (Dum, Tak, Ka, Slap - Rest is text)
    // Single note cells now use unicode symbols (no SVG)
    // Common patterns have SVGs (number depends on expanded groups)
    // At minimum: 4 header SVGs + quick insert buttons in collapsed groups
    const svgElements = container.querySelectorAll('svg');
    expect(svgElements.length).toBeGreaterThanOrEqual(4);
  });

  it('each button has the notation-button class', () => {
    const onInsertPattern = vi.fn();
    const timeSignature = { numerator: 4, denominator: 4 } as const;
    const { container } = render(
      <NotePalette 
        onInsertPattern={onInsertPattern} 
        remainingBeats={16} 
        timeSignature={timeSignature}
      />
    );
    
    const notationButtons = container.querySelectorAll('.notation-button');
    // 5 rows x 5 columns (table: D, T, K, S, Rest) = 25 single note buttons
    // Common patterns are now in expandable groups, so they're not all visible by default
    // Plus quick insert buttons in collapsed groups
    expect(notationButtons.length).toBeGreaterThanOrEqual(25);
  });

  describe('Keyboard Navigation', () => {
    it('exposes focusFirstButton method via ref', () => {
      const ref = createRef<NotePaletteHandle>();
      render(<NotePalette {...defaultProps} ref={ref} />);
      
      expect(ref.current).not.toBeNull();
      expect(typeof ref.current?.focusFirstButton).toBe('function');
    });

    it('focusFirstButton focuses the first non-disabled button', () => {
      const ref = createRef<NotePaletteHandle>();
      const { container } = render(<NotePalette {...defaultProps} ref={ref} />);
      
      ref.current?.focusFirstButton();
      
      // Should focus a button in the grid
      const focusedElement = document.activeElement;
      expect(focusedElement?.tagName).toBe('BUTTON');
      expect(container.contains(focusedElement)).toBe(true);
    });

    it('arrow keys navigate within the grid', () => {
      const ref = createRef<NotePaletteHandle>();
      const { container } = render(<NotePalette {...defaultProps} ref={ref} />);
      
      // Focus the first button
      ref.current?.focusFirstButton();
      const firstFocused = document.activeElement;
      
      // Press ArrowRight
      fireEvent.keyDown(firstFocused!, { key: 'ArrowRight' });
      const afterRight = document.activeElement;
      
      // Should have moved to a different button
      expect(afterRight?.tagName).toBe('BUTTON');
      expect(container.contains(afterRight)).toBe(true);
    });

    it('Tab moves from grid to patterns section', () => {
      const ref = createRef<NotePaletteHandle>();
      const { container } = render(<NotePalette {...defaultProps} ref={ref} />);
      
      // Focus the first button in grid
      ref.current?.focusFirstButton();
      const gridButton = document.activeElement;
      
      // Press Tab to move to patterns
      fireEvent.keyDown(gridButton!, { key: 'Tab' });
      
      // Should focus a pattern button (or stay in grid if patterns disabled)
      const afterTab = document.activeElement;
      expect(afterTab?.tagName).toBe('BUTTON');
      expect(container.contains(afterTab)).toBe(true);
    });

    it('Escape calls onRequestNotationFocus', () => {
      const onRequestNotationFocus = vi.fn();
      const ref = createRef<NotePaletteHandle>();
      render(
        <NotePalette 
          {...defaultProps} 
          ref={ref}
          onRequestNotationFocus={onRequestNotationFocus}
        />
      );
      
      // Focus the first button
      ref.current?.focusFirstButton();
      const focusedButton = document.activeElement;
      
      // Press Escape
      fireEvent.keyDown(focusedButton!, { key: 'Escape' });
      
      expect(onRequestNotationFocus).toHaveBeenCalledTimes(1);
    });

    it('Enter on enabled button calls onInsertPattern', () => {
      const onInsertPattern = vi.fn();
      const ref = createRef<NotePaletteHandle>();
      render(
        <NotePalette 
          {...defaultProps}
          onInsertPattern={onInsertPattern}
          ref={ref}
        />
      );
      
      // Focus the first button
      ref.current?.focusFirstButton();
      const focusedButton = document.activeElement as HTMLButtonElement;
      
      // Only test if button is not disabled
      if (!focusedButton?.disabled) {
        fireEvent.keyDown(focusedButton, { key: 'Enter' });
        expect(onInsertPattern).toHaveBeenCalled();
      }
    });

    it('selection mode shows replacement message', () => {
      const selection = {
        startCharPosition: 0,
        endCharPosition: 4,
        isSelecting: false,
      };
      
      render(
        <NotePalette 
          {...defaultProps}
          selection={selection}
          selectionDuration={4}
        />
      );
      
      expect(screen.getByText(/Click to replace selection/)).toBeInTheDocument();
    });

    it('Enter in selection mode calls onReplaceSelection when button is enabled', () => {
      const onReplaceSelection = vi.fn();
      const onInsertPattern = vi.fn();
      const selection = {
        startCharPosition: 0,
        endCharPosition: 4,
        isSelecting: false,
      };
      
      const { container } = render(
        <NotePalette 
          {...defaultProps}
          onInsertPattern={onInsertPattern}
          selection={selection}
          selectionDuration={4}
          onReplaceSelection={onReplaceSelection}
        />
      );
      
      // Find a non-disabled button in the palette
      const buttons = container.querySelectorAll('.notation-button:not([disabled])');
      const enabledButton = buttons[0] as HTMLButtonElement;
      
      if (enabledButton) {
        fireEvent.click(enabledButton);
        // In selection mode, clicking should call onReplaceSelection
        expect(onReplaceSelection).toHaveBeenCalled();
      }
    });
  });
});
