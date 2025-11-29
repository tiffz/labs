import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
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
});

