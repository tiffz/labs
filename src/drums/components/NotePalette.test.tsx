import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import NotePalette from './NotePalette';

describe('NotePalette', () => {
  const defaultProps = {
    onInsertPattern: vi.fn(),
    remainingBeats: 16,
    timeSignature: { numerator: 4, denominator: 4 },
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
    
    // 5 rows x 4 columns (table) + 9 common patterns = 29 pattern buttons
    // The checkbox is not counted as a button role
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(29);
  });

  it('renders SVG notation for each button', () => {
    const { container } = render(<NotePalette {...defaultProps} />);
    
    // Check that SVG elements are present
    // Table header has 3 small symbol SVGs (Dum, Tak, Ka - Rest is text)
    // Single note cells now use unicode symbols (no SVG)
    // Common patterns have 9 SVGs
    // Total: 3 + 9 = 12 SVGs
    const svgElements = container.querySelectorAll('svg');
    expect(svgElements.length).toBe(12);
  });

  it('each button has the notation-button class', () => {
    const onInsertPattern = vi.fn();
    const timeSignature = { numerator: 4, denominator: 4 };
    const { container } = render(
      <NotePalette 
        onInsertPattern={onInsertPattern} 
        remainingBeats={16} 
        timeSignature={timeSignature}
      />
    );
    
    const notationButtons = container.querySelectorAll('.notation-button');
    // 5 rows x 4 columns (table) + 9 common patterns = 29 pattern buttons
    expect(notationButtons.length).toBe(29);
  });
});
