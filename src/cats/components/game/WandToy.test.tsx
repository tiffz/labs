import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import WandToy from './WandToy';
import type { MouseState } from '../../hooks/useMouseTracking';

describe('WandToy Component (Unified Mouse Tracking)', () => {
  // Mock mouseState for testing - ALL REFS, NO STATE
  const mockPositionRef = { current: { x: 100, y: 100 } };
  const mockLastMovementTimeRef = { current: Date.now() };
  const mockSmoothPositionRef = { current: { x: 100, y: 100 } };
  const mockMouseState: MouseState = {
    positionRef: mockPositionRef,
    lastMovementTimeRef: mockLastMovementTimeRef,
    hasRecentMovement: vi.fn(() => true),
    smoothPositionRef: mockSmoothPositionRef,
    onMouseMove: vi.fn(() => vi.fn()), // Returns cleanup function
  };

  const defaultProps = {
    isShaking: false,
    initialPosition: { x: 100, y: 100 },
    mouseState: mockMouseState,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock setTimeout for wiggle decay
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    it('renders with initial position', () => {
      const { container } = render(<WandToy {...defaultProps} />);
      
      const wandToy = container.querySelector('.wand-toy');
      expect(wandToy).toBeInTheDocument();
      expect(wandToy).toHaveStyle({
        left: '100px',
        top: '100px',
        transform: 'translate(-50%, 0)',
      });
    });

    it('uses custom initial position', () => {
      const customPosition = { x: 250, y: 200 };
      const { container } = render(
        <WandToy {...defaultProps} initialPosition={customPosition} />
      );
      
      const wandToy = container.querySelector('.wand-toy');
      expect(wandToy).toHaveStyle({
        left: '250px',
        top: '200px',
      });
    });
  });

  describe('Mouse Tracking Integration', () => {
    it('registers with unified mouse tracking system', () => {
      const onMouseMoveSpy = vi.fn(() => vi.fn());
      const mouseStateWithSpy = {
        ...mockMouseState,
        onMouseMove: onMouseMoveSpy,
      };
      
      render(<WandToy {...defaultProps} mouseState={mouseStateWithSpy} />);
      
      expect(onMouseMoveSpy).toHaveBeenCalledWith(expect.any(Function));
    });

    it('calls cleanup function on unmount', () => {
      const cleanupFn = vi.fn();
      const onMouseMoveSpy = vi.fn(() => cleanupFn);
      const mouseStateWithSpy = {
        ...mockMouseState,
        onMouseMove: onMouseMoveSpy,
      };
      
      const { unmount } = render(<WandToy {...defaultProps} mouseState={mouseStateWithSpy} />);
      
      unmount();
      
      expect(cleanupFn).toHaveBeenCalled();
    });
  });

  describe('Wiggle Animation', () => {
    it('applies wiggle transform on mouse movement', () => {
      let registeredCallback: ((position: { x: number; y: number }) => void) | undefined;
      
      const onMouseMoveSpy = vi.fn((callback) => {
        registeredCallback = callback;
        return vi.fn(); // cleanup function
      });
      
      const mouseStateWithSpy = {
        ...mockMouseState,
        onMouseMove: onMouseMoveSpy,
      };
      
      const { container } = render(<WandToy {...defaultProps} mouseState={mouseStateWithSpy} />);
      const wandToy = container.querySelector('.wand-toy') as HTMLElement;
      
      // Simulate mouse movement through the registered callback
      if (registeredCallback) {
        registeredCallback({ x: 150, y: 100 });
      }
      
      // Check that transform includes rotation (wiggle)
      const transformStyle = wandToy.style.transform;
      expect(transformStyle).toContain('rotate(');
    });

    it('decays wiggle effect over time', () => {
      let registeredCallback: ((position: { x: number; y: number }) => void) | undefined;
      
      const onMouseMoveSpy = vi.fn((callback) => {
        registeredCallback = callback;
        return vi.fn();
      });
      
      const mouseStateWithSpy = {
        ...mockMouseState,
        onMouseMove: onMouseMoveSpy,
      };
      
      const { container } = render(<WandToy {...defaultProps} mouseState={mouseStateWithSpy} />);
      const wandToy = container.querySelector('.wand-toy') as HTMLElement;
      
      // Apply wiggle
      if (registeredCallback) {
        registeredCallback({ x: 150, y: 100 });
      }
      
      // Fast-forward to decay
      vi.advanceTimersByTime(100);
      
      // Should reset to no rotation
      expect(wandToy.style.transform).toBe('translate(-50%, 0) rotate(0deg)');
    });
  });

  describe('Shaking State', () => {
    it('applies shaking class when isShaking is true', () => {
      const { container } = render(<WandToy {...defaultProps} isShaking={true} />);
      
      const wandToy = container.querySelector('.wand-toy');
      expect(wandToy).toHaveClass('shaking');
    });

    it('removes shaking class when isShaking is false', () => {
      const { container } = render(<WandToy {...defaultProps} isShaking={false} />);
      
      const wandToy = container.querySelector('.wand-toy');
      expect(wandToy).not.toHaveClass('shaking');
    });

    it('updates shaking class when prop changes', () => {
      const { container, rerender } = render(<WandToy {...defaultProps} isShaking={false} />);
      const wandToy = container.querySelector('.wand-toy');
      
      expect(wandToy).not.toHaveClass('shaking');
      
      rerender(<WandToy {...defaultProps} isShaking={true} />);
      expect(wandToy).toHaveClass('shaking');
    });
  });

  describe('Transform Properties', () => {
    it('sets correct transform origin', () => {
      const { container } = render(<WandToy {...defaultProps} />);
      
      const wandToy = container.querySelector('.wand-toy');
      expect(wandToy).toHaveStyle({
        transformOrigin: '50% 0',
      });
    });

    it('applies CSS transition for smooth animations', () => {
      const { container } = render(<WandToy {...defaultProps} />);
      
      const wandToy = container.querySelector('.wand-toy');
      expect(wandToy).toHaveStyle({
        transition: 'transform 0.1s ease-out',
      });
    });
  });

  describe('SVG Rendering', () => {
    it('renders SVG wand element', () => {
      const { container } = render(<WandToy {...defaultProps} />);
      
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('width', '50');
      expect(svg).toHaveAttribute('height', '50');
      expect(svg).toHaveAttribute('viewBox', '0 0 100 100');
    });
  });
});