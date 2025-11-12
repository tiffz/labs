import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('Story Generator App', () => {
  it('renders the main heading', () => {
    render(<App />);
    expect(screen.getByText('Save the Cat!')).toBeInTheDocument();
    expect(screen.getByText('Story Generator')).toBeInTheDocument();
  });

  it('renders the about section in sidebar', () => {
    render(<App />);
    expect(screen.getByText(/Generates random story plots/i)).toBeInTheDocument();
  });

  it('renders the generate button', () => {
    render(<App />);
    const generateButton = screen.getByRole('button', { name: /generate story/i });
    expect(generateButton).toBeInTheDocument();
  });

  it('generates a story when button is clicked', () => {
    render(<App />);
    const generateButton = screen.getByRole('button', { name: /generate story/i });

    fireEvent.click(generateButton);

    // Check that story elements appear - now in the fixed header
    expect(screen.getByText(/Core Story Elements/i)).toBeInTheDocument();
    expect(screen.getByText(/Key Genre Elements/i)).toBeInTheDocument();
  });

  it('displays the footer in sidebar', () => {
    render(<App />);
    expect(screen.getByText(/Based on Jessica Brody/i)).toBeInTheDocument();
  });

  it('allows rerolling genre and theme', () => {
    render(<App />);
    const generateButton = screen.getByRole('button', { name: /generate story/i });

    // First generate a story
    fireEvent.click(generateButton);

    // Check that the fixed header appears with core elements
    expect(screen.getByText(/Core Story Elements/i)).toBeInTheDocument();

    // Find reroll buttons (there should be multiple)
    const rerollButtons = screen.getAllByRole('button', { name: /reroll/i });
    expect(rerollButtons.length).toBeGreaterThan(0);
  });
});

