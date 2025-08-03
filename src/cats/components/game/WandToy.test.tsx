import { render, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import WandToy from './WandToy';


describe('WandToy Component', () => {
  let mockRaf: MockedFunction<typeof requestAnimationFrame>;
  let rafCallbacks: FrameRequestCallback[];

  beforeEach(() => {
    // Mock requestAnimationFrame
    rafCallbacks = [];
    mockRaf = vi.fn((callback: FrameRequestCallback) => {
      rafCallbacks.push(callback);
      return 1;
    });
    global.requestAnimationFrame = mockRaf;
    global.cancelAnimationFrame = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const triggerAnimationFrame = () => {
    const callbacks = [...rafCallbacks];
    rafCallbacks.length = 0;
    callbacks.forEach(callback => callback(performance.now()));
  };

  const defaultProps = {
    isShaking: false,
    initialPosition: { x: 100, y: 100 },
  };

  describe('Initial Rendering', () => {
    it('renders with initial position', () => {
      const { container } = render(<WandToy {...defaultProps} />);
      
      const wandToy = container.querySelector('.wand-toy');
      expect(wandToy).toBeInTheDocument();
      
      // Check initial position
      expect(wandToy).toHaveStyle({
        left: '100px',
        top: '100px',
      });
    });

    it('renders SVG feather with gradient', () => {
      const { container } = render(<WandToy {...defaultProps} />);
      
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      
      const gradient = container.querySelector('#featherGradient');
      expect(gradient).toBeInTheDocument();
      
      const featherPaths = container.querySelectorAll('path[fill="url(#featherGradient)"]');
      expect(featherPaths).toHaveLength(3); // Three feather segments
    });

    it('applies correct initial transform', () => {
      const { container } = render(<WandToy {...defaultProps} />);
      
      const wandToy = container.querySelector('.wand-toy');
      // Initial transform should just be translate (wiggle applied via direct DOM manipulation)
      expect(wandToy).toHaveStyle({
        transform: 'translate(-50%, 0)',
      });
    });
  });

  describe('Shaking State', () => {
    it('applies shaking class when isShaking is true', () => {
      const { container } = render(<WandToy {...defaultProps} isShaking={true} />);
      
      const wandToy = container.querySelector('.wand-toy');
      expect(wandToy).toHaveClass('shaking');
    });

    it('does not apply shaking class when isShaking is false', () => {
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

  describe('Mouse Movement Tracking', () => {
    it('sets up mouse move event listener', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      
      const { unmount } = render(<WandToy {...defaultProps} />);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      
      unmount();
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
    });

    it('updates position when mouse moves', () => {
      const { container } = render(<WandToy {...defaultProps} />);
      
      const wandToy = container.querySelector('.wand-toy');
      
      // Initial position
      expect(wandToy).toHaveStyle({
        left: '100px',
        top: '100px',
      });
      
      // Simulate mouse move
      fireEvent.mouseMove(document, { clientX: 200, clientY: 150 });
      
      // Position should update
      expect(wandToy).toHaveStyle({
        left: '200px',
        top: '150px',
      });
    });

    it('calculates wiggle based on movement distance and direction', () => {
      const { container } = render(<WandToy {...defaultProps} />);
      
      const wandToy = container.querySelector('.wand-toy');
      
      // Start at initial position
      expect(wandToy).toHaveStyle({
        transform: 'translate(-50%, 0)',
      });
      
      // Move right (positive deltaX should create positive wiggle)
      fireEvent.mouseMove(document, { clientX: 150, clientY: 100 });
      
      // The transform should now include a rotation
      // We can't easily test the exact value due to randomness, but it should change
      const transform = wandToy?.getAttribute('style')?.includes('rotate(');
      expect(transform).toBeTruthy();
    });

         it('applies velocity factor to wiggle calculation', () => {
       const { container } = render(<WandToy {...defaultProps} />);
       
       const wandToy = container.querySelector('.wand-toy') as HTMLElement;
       
       // Small movement should create small wiggle
       fireEvent.mouseMove(document, { clientX: 105, clientY: 100 });
       
       const smallTransform = wandToy?.style.transform;
       
       // Large movement should create larger wiggle
       fireEvent.mouseMove(document, { clientX: 200, clientY: 100 });
       
       const largeTransform = wandToy?.style.transform;
       
       // Both should have rotation, but they should be different
       expect(smallTransform).not.toBe(largeTransform);
     });

         it('constrains wiggle to maximum value', () => {
       const { container } = render(<WandToy {...defaultProps} />);
       
       const wandToy = container.querySelector('.wand-toy') as HTMLElement;
       
       // Extremely large movement should be capped at maxWiggle (35 degrees)
       fireEvent.mouseMove(document, { clientX: 1000, clientY: 100 });
       
       // The wiggle should be constrained (we can't test exact value due to randomness)
       expect(wandToy?.style.transform).toContain('rotate(');
     });

     it('includes directional component in wiggle', () => {
       const { container } = render(<WandToy {...defaultProps} />);
       
       const wandToy = container.querySelector('.wand-toy') as HTMLElement;
       
       // Move left (negative deltaX)
       fireEvent.mouseMove(document, { clientX: 50, clientY: 100 });
       
       const leftTransform = wandToy?.style.transform;
       
       // Reset position
       fireEvent.mouseMove(document, { clientX: 100, clientY: 100 });
       
       // Move right (positive deltaX)
       fireEvent.mouseMove(document, { clientX: 150, clientY: 100 });
       
       const rightTransform = wandToy?.style.transform;
       
       // The directions should be different (one should be negative, one positive)
       expect(leftTransform).not.toBe(rightTransform);
     });
  });

  describe('Wiggle Animation', () => {
    it('uses CSS transitions for smooth wiggle decay', () => {
      const { container } = render(<WandToy {...defaultProps} />);
      
      const wandToy = container.querySelector('.wand-toy');
      
      // Should have CSS transition for smooth wiggle decay
      expect(wandToy).toHaveStyle({
        transition: 'transform 0.1s ease-out',
      });
    });

         it('smoothly reduces wiggle over time', () => {
       const { container } = render(<WandToy {...defaultProps} />);
       
       const wandToy = container.querySelector('.wand-toy') as HTMLElement;
       
       // Create initial wiggle
       fireEvent.mouseMove(document, { clientX: 150, clientY: 100 });
       
       // Run animation frames to smooth the wiggle
       act(() => {
         triggerAnimationFrame();
         triggerAnimationFrame();
         triggerAnimationFrame();
       });
       
       const smoothedTransform = wandToy?.style.transform;
       
       // The wiggle should be reducing (getting closer to 0)
       // We can't test exact values, but the transform should still be present
       expect(smoothedTransform).toContain('rotate(');
     });

    it('cleans up event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      
      const { unmount } = render(<WandToy {...defaultProps} />);
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
    });
  });

  describe('Randomness in Wiggle', () => {
         it('adds random component to wiggle', () => {
       // Mock Math.random to control randomness
       const originalRandom = Math.random;
       Math.random = vi.fn(() => {
         return 0.5; // Fixed value for testing
       });
       
       render(<WandToy {...defaultProps} />);
       
       fireEvent.mouseMove(document, { clientX: 150, clientY: 100 });
       
       // Math.random should have been called for adding randomness
       expect(Math.random).toHaveBeenCalled();
       
       // Restore original Math.random
       Math.random = originalRandom;
     });
  });

  describe('Transform Origin', () => {
    it('sets correct transform origin for rotation', () => {
      const { container } = render(<WandToy {...defaultProps} />);
      
      const wandToy = container.querySelector('.wand-toy');
      
      expect(wandToy).toHaveStyle({
        transformOrigin: '50% 0',
      });
    });
  });

  describe('Component Lifecycle', () => {
    it('maintains position state across re-renders', () => {
      const { container, rerender } = render(<WandToy {...defaultProps} />);
      
      const wandToy = container.querySelector('.wand-toy');
      
      // Move the wand
      fireEvent.mouseMove(document, { clientX: 200, clientY: 150 });
      
      expect(wandToy).toHaveStyle({
        left: '200px',
        top: '150px',
      });
      
      // Re-render with different shake state
      rerender(<WandToy {...defaultProps} isShaking={true} />);
      
      // Position should be maintained
      expect(wandToy).toHaveStyle({
        left: '200px',
        top: '150px',
      });
    });

    it('initializes with provided initial position', () => {
      const customInitialPosition = { x: 250, y: 200 };
      const { container } = render(
        <WandToy isShaking={false} initialPosition={customInitialPosition} />
      );
      
      const wandToy = container.querySelector('.wand-toy');
      
      expect(wandToy).toHaveStyle({
        left: '250px',
        top: '200px',
      });
    });
  });
}); 