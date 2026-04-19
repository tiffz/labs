import { describe, it, expect } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import App from './App';

// This test clicks "Generate Story", which chains five dynamic import() calls
// (three inside loadGenerator(), plus lazy FixedStoryHeader and BeatChart).
// On a cold CI runner those imports can take several seconds in jsdom, so we
// give findBy* a generous ceiling. See docs/STYLE_GUIDE.md "Async tests with
// React.lazy" for the canonical pattern.
const LAZY_FIND_TIMEOUT_MS = 15000;

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

  it('generates a story when button is clicked', async () => {
    render(<App />);
    const generateButton = screen.getByRole('button', { name: /generate story/i });

    await act(async () => {
      fireEvent.click(generateButton);
    });

    expect(
      await screen.findByText(/Core Story Elements/i, {}, { timeout: LAZY_FIND_TIMEOUT_MS }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Key Genre Elements/i)).toBeInTheDocument();
  });

  it('displays the footer in sidebar', () => {
    render(<App />);
    expect(screen.getByText(/Based on Jessica Brody/i)).toBeInTheDocument();
  });

  it('allows rerolling genre and theme', async () => {
    render(<App />);
    const generateButton = screen.getByRole('button', { name: /generate story/i });

    await act(async () => {
      fireEvent.click(generateButton);
    });

    expect(
      await screen.findByText(/Core Story Elements/i, {}, { timeout: LAZY_FIND_TIMEOUT_MS }),
    ).toBeInTheDocument();

    const rerollButtons = screen.getAllByRole('button', { name: /reroll/i });
    expect(rerollButtons.length).toBeGreaterThan(0);
  });
});

