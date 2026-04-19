import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import { SHARED_CATALOG } from './generatedSharedCatalog';

describe('UI Catalog App', () => {
  it('loads the generated shared catalog without error', () => {
    // Smoke test the catalog module itself — both that it imports cleanly and
    // that it has entries. If the generator desyncs, entries will be empty.
    expect(Array.isArray(SHARED_CATALOG)).toBe(true);
    expect(SHARED_CATALOG.length).toBeGreaterThan(0);
  });

  it('renders the shell without throwing', () => {
    render(<App />);
    expect(screen.getByText(/skip to main content/i)).toBeInTheDocument();
  });
});
