import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LocalDevBadge from './LocalDevBadge';

describe('LocalDevBadge', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('renders the LOCAL badge on the local dev server', () => {
    vi.stubEnv('DEV', true);
    vi.stubGlobal('location', { hostname: 'localhost' });
    render(<LocalDevBadge />);
    expect(screen.getByText('LOCAL')).toBeInTheDocument();
  });

  it('renders nothing in the production build', () => {
    vi.stubEnv('DEV', false);
    const { container } = render(<LocalDevBadge />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText('LOCAL')).not.toBeInTheDocument();
  });

  it('never renders on a deployed host, even if the bundle was built without production mode', () => {
    // Regression: a non-production-mode build (import.meta.env.DEV === true) shipped
    // to prod and showed "LOCAL" on labs.tiffzhang.com, defeating the badge's purpose.
    // The host gate must refuse to render on any deployed origin.
    vi.stubEnv('DEV', true);
    for (const host of ['labs.tiffzhang.com', 'tiffz.github.io', 'example.com']) {
      vi.stubGlobal('location', { hostname: host });
      const { container, unmount } = render(<LocalDevBadge />);
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
    expect(screen.queryByText('LOCAL')).not.toBeInTheDocument();
  });
});
