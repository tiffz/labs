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
    expect(screen.getByLabelText('Enter Rhythm Notation')).toBeInTheDocument();
  });

  it('renders the rhythm display section', () => {
    render(<App />);
    expect(screen.getByText('Rhythm Notation')).toBeInTheDocument();
  });

  it('displays the default time signature in controls', () => {
    render(<App />);
    // Check the time signature controls have correct default values
    const selects = screen.getAllByRole('combobox');
    expect(selects[0]).toHaveValue('4'); // numerator
    expect(selects[1]).toHaveValue('4'); // denominator
  });

  it('has a default rhythm notation', () => {
    render(<App />);
    const input = screen.getByLabelText('Enter Rhythm Notation') as HTMLInputElement;
    expect(input.value).toBe('D---T-K-D-D-T---');
  });
});

