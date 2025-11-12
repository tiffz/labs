import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('Story Generator App', () => {
  it('renders the main heading', () => {
    render(<App />);
    expect(screen.getByText('Save the Cat!')).toBeInTheDocument();
    expect(screen.getByText('Random Story Generator')).toBeInTheDocument();
  });

  it('renders genre and theme selectors', () => {
    render(<App />);
    expect(screen.getByText('Select a Genre:')).toBeInTheDocument();
    expect(screen.getByText('Select a Theme:')).toBeInTheDocument();
  });

  it('renders the generate button', () => {
    render(<App />);
    const generateButton = screen.getByRole('button', { name: /generate story plot/i });
    expect(generateButton).toBeInTheDocument();
  });

  it('generates a story when button is clicked', () => {
    render(<App />);
    const generateButton = screen.getByRole('button', { name: /generate story plot/i });

    fireEvent.click(generateButton);

    // Check that story elements appear
    expect(screen.getByText('Core Story Elements')).toBeInTheDocument();
    expect(screen.getByText('Key Genre Elements')).toBeInTheDocument();
  });

  it('displays the footer', () => {
    render(<App />);
    expect(screen.getByText(/Based on the story structures from/i)).toBeInTheDocument();
  });

  it('allows selecting different genres', () => {
    render(<App />);

    // Find and click a genre option
    const whydunitOption = screen.getByLabelText('Whydunit');
    fireEvent.click(whydunitOption);

    expect(whydunitOption).toBeChecked();
  });

  it('allows selecting different themes', () => {
    render(<App />);

    // Find and click a theme option
    const forgivenessOption = screen.getByLabelText('Forgiveness');
    fireEvent.click(forgivenessOption);

    expect(forgivenessOption).toBeChecked();
  });
});

