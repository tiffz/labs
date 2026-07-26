import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LocalDevBadge from './LocalDevBadge';

describe('LocalDevBadge', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders the LOCAL badge on the dev server', () => {
    vi.stubEnv('DEV', true);
    render(<LocalDevBadge />);
    expect(screen.getByText('LOCAL')).toBeInTheDocument();
  });

  it('renders nothing in the production build', () => {
    vi.stubEnv('DEV', false);
    const { container } = render(<LocalDevBadge />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText('LOCAL')).not.toBeInTheDocument();
  });
});
