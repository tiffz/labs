import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MiniNotationRenderer from './MiniNotationRenderer';

describe('MiniNotationRenderer', () => {
  it('renders without crashing', () => {
    const { container } = render(<MiniNotationRenderer pattern="D---" />);
    expect(container.querySelector('.mini-notation-renderer')).toBeInTheDocument();
  });

  it('renders SVG element', () => {
    const { container } = render(<MiniNotationRenderer pattern="D---" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('handles empty pattern gracefully', () => {
    const { container } = render(<MiniNotationRenderer pattern="" />);
    expect(container.querySelector('.mini-notation-renderer')).toBeInTheDocument();
  });

  it('handles multiple notes', () => {
    const { container } = render(<MiniNotationRenderer pattern="DKTK" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('handles rest patterns', () => {
    const { container } = render(<MiniNotationRenderer pattern="...." />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('handles dotted notes', () => {
    const { container } = render(<MiniNotationRenderer pattern="D---." />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('respects width and height props', () => {
    const { container } = render(<MiniNotationRenderer pattern="D---" width={150} height={90} />);
    const renderer = container.querySelector('.mini-notation-renderer') as HTMLElement;
    expect(renderer.style.width).toBe('150px');
    expect(renderer.style.height).toBe('90px');
  });
});

