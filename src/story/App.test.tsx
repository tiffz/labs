import { describe, it, expect, beforeAll } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import App from './App';

// Clicking "Generate Story" awaits five dynamic import() calls in parallel.
// Preload in beforeAll so tests stay fast and do not race Vitest's 10s testTimeout.
const ASYNC_TEST_TIMEOUT_MS = 20_000;
const LAZY_FIND_TIMEOUT_MS = 8_000;

beforeAll(async () => {
  await Promise.all([
    import('./data/storyGenerator'),
    import('./kimberly/logline-element-mapping'),
    import('./kimberly/loglines'),
    import('./components/FixedStoryHeader'),
    import('./components/BeatChart'),
  ]);
}, ASYNC_TEST_TIMEOUT_MS);

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

  it(
    'generates a story when button is clicked',
    async () => {
      render(<App />);
      const generateButton = screen.getByRole('button', { name: /generate story/i });

      await act(async () => {
        fireEvent.click(generateButton);
      });

      expect(
        await screen.findByText(/Core Story Elements/i, {}, { timeout: LAZY_FIND_TIMEOUT_MS }),
      ).toBeInTheDocument();
      expect(screen.getByText(/Key Genre Elements/i)).toBeInTheDocument();
    },
    ASYNC_TEST_TIMEOUT_MS,
  );

  it('displays the footer in sidebar', () => {
    render(<App />);
    expect(screen.getByText(/Based on Jessica Brody/i)).toBeInTheDocument();
  });

  it(
    'allows rerolling genre and theme',
    async () => {
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
    },
    ASYNC_TEST_TIMEOUT_MS,
  );
});
