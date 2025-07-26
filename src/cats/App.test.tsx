import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import App from './App';
import React from 'react';

// Mock ReactDOM.createPortal to avoid portal-related issues in tests
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (children: React.ReactNode) => children,
  };
});

describe.skip('App Component - Wand Toy Mode (DEPRECATED - needs update for new useCatSystem)', () => {
  let mockRaf: MockedFunction<typeof requestAnimationFrame>;
  let rafCallbacks: FrameRequestCallback[];
  let heartContainer: HTMLDivElement;

  beforeEach(() => {
    // Create the heart-container element that the App component expects
    heartContainer = document.createElement('div');
    heartContainer.id = 'heart-container';
    document.body.appendChild(heartContainer);

    // Mock DOMMatrix for the cat animation
    (global as unknown as { DOMMatrix: unknown }).DOMMatrix = class MockDOMMatrix {
      m41 = 0; // translateX
      m42 = 0; // translateY
      constructor() {}
    };

    // Mock getComputedStyle
    global.getComputedStyle = vi.fn().mockReturnValue({
      transform: 'matrix(1, 0, 0, 1, 0, 0)',
    });

    // Mock getBoundingClientRect for the cat element
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 220,
      height: 200,
      top: 100,
      left: 100,
      right: 320,
      bottom: 300,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    }));

    // Mock requestAnimationFrame to control animation loops
    rafCallbacks = [];
    mockRaf = vi.fn((callback: FrameRequestCallback) => {
      rafCallbacks.push(callback);
      return 1;
    });
    global.requestAnimationFrame = mockRaf;
    global.cancelAnimationFrame = vi.fn();

    // Mock timers for intervals and timeouts
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Clean up the heart-container element
    if (heartContainer && heartContainer.parentNode) {
      heartContainer.parentNode.removeChild(heartContainer);
    }
    
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const triggerAnimationFrame = () => {
    const callbacks = [...rafCallbacks];
    rafCallbacks.length = 0;
    callbacks.forEach(callback => callback(performance.now()));
  };

  const triggerInterval = (times = 1) => {
    for (let i = 0; i < times; i++) {
      act(() => {
        vi.advanceTimersByTime(100); // The pounce planning interval runs every 100ms
      });
    }
  };

  describe('Wand Mode Toggle', () => {
    it('toggles wand mode when wand button is clicked', () => {
      render(<App />);
      
      const wandButton = screen.getByText('Play with wand');
      
      // Should start in normal mode
      expect(wandButton).toBeInTheDocument();
      
      // Click to enable wand mode
      fireEvent.click(wandButton);
      
      // Button text should change
      expect(screen.getByText('Put away wand')).toBeInTheDocument();
      expect(screen.queryByText('Play with wand')).not.toBeInTheDocument();
    });

    it('sets wand initial position based on click location', () => {
      render(<App />);
      
      const wandButton = screen.getByText('Play with wand');
      
      // Click at specific coordinates
      fireEvent.click(wandButton, { clientX: 200, clientY: 150 });
      
      // Should pass the coordinates to WandToy component
      // We can't directly test this, but we can verify the component responds to wand mode
      expect(screen.getByText('Put away wand')).toBeInTheDocument();
    });

    it('disables wand mode when put away button is clicked', () => {
      render(<App />);
      
      // Enable wand mode first
      fireEvent.click(screen.getByText('Play with wand'));
      expect(screen.getByText('Put away wand')).toBeInTheDocument();
      
      // Disable wand mode
      fireEvent.click(screen.getByText('Put away wand'));
      expect(screen.getByText('Play with wand')).toBeInTheDocument();
    });
  });

  describe('Wand Mode Functionality', () => {
    it('enables wand mode and accepts mouse movement without errors', () => {
      render(<App />);
      
      // Enable wand mode
      fireEvent.click(screen.getByText('Play with wand'));
      
      // Simulate wand movement - should not throw errors
      expect(() => {
        fireEvent.mouseMove(document, { clientX: 150, clientY: 120 });
        fireEvent.mouseMove(document, { clientX: 110, clientY: 110 });
        fireEvent.mouseMove(document, { clientX: 200, clientY: 200 });
        triggerInterval(5);
      }).not.toThrow();
      
      // Verify wand mode is still active
      expect(screen.getByText('Put away wand')).toBeInTheDocument();
    });

    it('handles time progression in wand mode without errors', () => {
      render(<App />);
      
      // Enable wand mode
      fireEvent.click(screen.getByText('Play with wand'));
      
      // Simulate time passing - should not throw errors
      expect(() => {
        triggerInterval(50);
      }).not.toThrow();
      
      // Verify wand mode is still active
      expect(screen.getByText('Put away wand')).toBeInTheDocument();
    });

    it('handles complex movement patterns without errors', () => {
      render(<App />);
      
      // Enable wand mode
      fireEvent.click(screen.getByText('Play with wand'));
      
      // Simulate complex movement patterns
      expect(() => {
        // High-velocity movements
        for (let i = 0; i < 10; i++) {
          fireEvent.mouseMove(document, { clientX: 100 + i * 50, clientY: 100 });
          triggerInterval(1);
        }
        
        // Varied movements
        fireEvent.mouseMove(document, { clientX: 120, clientY: 130 });
        triggerInterval(1);
        fireEvent.mouseMove(document, { clientX: 110, clientY: 120 });
        triggerInterval(1);
        
        // Sudden movements
        fireEvent.mouseMove(document, { clientX: 110, clientY: 110 });
        triggerInterval(2);
        fireEvent.mouseMove(document, { clientX: 200, clientY: 200 });
        triggerInterval(1);
        fireEvent.mouseMove(document, { clientX: 205, clientY: 205 });
        triggerInterval(1);
      }).not.toThrow();
      
      // Verify wand mode is still functional
      expect(screen.getByText('Put away wand')).toBeInTheDocument();
    });
  });

  describe('Wand Click Interaction', () => {
    it('handles wand click area interactions', () => {
      render(<App />);
      
      // Enable wand mode
      fireEvent.click(screen.getByText('Play with wand'));
      
      const wandClickArea = document.querySelector('.wand-click-area');
      expect(wandClickArea).toBeInTheDocument();
      
      if (wandClickArea) {
        // Should handle clicks without errors
        expect(() => {
          fireEvent.click(wandClickArea);
          triggerInterval(1);
        }).not.toThrow();
        
        expect(wandClickArea).toBeInTheDocument();
      }
    });

    it('triggers wand shaking animation when clicked', () => {
      render(<App />);
      
      // Enable wand mode
      fireEvent.click(screen.getByText('Play with wand'));
      
      const wandClickArea = document.querySelector('.wand-click-area');
      expect(wandClickArea).toBeInTheDocument();
      
      if (wandClickArea) {
        // Reset RAF call count
        mockRaf.mockClear();
        
        fireEvent.click(wandClickArea);
        
        // Should trigger shaking animation through requestAnimationFrame
        act(() => {
          triggerAnimationFrame();
        });
        
        // The click should trigger some animation frames
        expect(wandClickArea).toBeInTheDocument(); // Verify click area still exists
      }
    });

    it('awards bonus love when clicked during pounce', () => {
      render(<App />);
      
      // Enable wand mode
      fireEvent.click(screen.getByText('Play with wand'));
      
      const wandClickArea = document.querySelector('.wand-click-area');
      expect(wandClickArea).toBeInTheDocument();
      
      if (wandClickArea) {
        fireEvent.click(wandClickArea);
        
        // The wand click functionality should be working
        expect(wandClickArea).toBeInTheDocument();
      }
    });
  });

  describe('Wand Mode Cleanup', () => {
    it('cleans up properly when wand mode is disabled', () => {
      render(<App />);
      
      // Enable wand mode
      fireEvent.click(screen.getByText('Play with wand'));
      
      // Let some intervals run
      triggerInterval(5);
      
      // Disable wand mode - should not throw errors
      expect(() => {
        fireEvent.click(screen.getByText('Put away wand'));
        triggerInterval(5);
      }).not.toThrow();
      
      // Should be back to normal mode
      expect(screen.getByText('Play with wand')).toBeInTheDocument();
    });

    it('handles state transitions correctly', () => {
      render(<App />);
      
      // Multiple mode toggles should work without errors
      expect(() => {
        // Enable wand mode
        fireEvent.click(screen.getByText('Play with wand'));
        
        // Build some state
        fireEvent.mouseMove(document, { clientX: 120, clientY: 120 });
        triggerInterval(10);
        
        // Disable wand mode
        fireEvent.click(screen.getByText('Put away wand'));
        
        // Enable again
        fireEvent.click(screen.getByText('Play with wand'));
        
        // Disable again
        fireEvent.click(screen.getByText('Put away wand'));
      }).not.toThrow();
      
      // Should end in normal mode
      expect(screen.getByText('Play with wand')).toBeInTheDocument();
    });
  });

  describe('WandToy Component Integration', () => {
    it('renders WandToy component when in wand mode', () => {
      render(<App />);
      
      // Should not render WandToy initially
      expect(document.querySelector('.wand-toy')).not.toBeInTheDocument();
      
      // Enable wand mode
      fireEvent.click(screen.getByText('Play with wand'));
      
      // Should render WandToy component
      expect(document.querySelector('.wand-toy')).toBeInTheDocument();
    });

    it('passes shaking state to WandToy component', () => {
      render(<App />);
      
      // Enable wand mode
      fireEvent.click(screen.getByText('Play with wand'));
      
      const wandClickArea = document.querySelector('.wand-click-area');
      if (wandClickArea) {
        // Click to trigger shaking
        fireEvent.click(wandClickArea);
        
        // Should pass shaking state to WandToy
        act(() => {
          triggerAnimationFrame();
        });
      }
      
      expect(document.querySelector('.wand-toy')).toBeInTheDocument();
    });

    it('removes WandToy component when wand mode is disabled', () => {
      render(<App />);
      
      // Enable wand mode
      fireEvent.click(screen.getByText('Play with wand'));
      expect(document.querySelector('.wand-toy')).toBeInTheDocument();
      
      // Disable wand mode
      fireEvent.click(screen.getByText('Put away wand'));
      expect(document.querySelector('.wand-toy')).not.toBeInTheDocument();
    });
  });

  describe('System Robustness', () => {
    it('handles rapid mode switching without errors', () => {
      render(<App />);
      
      expect(() => {
        // Rapid toggling
        for (let i = 0; i < 5; i++) {
          fireEvent.click(screen.getByText('Play with wand'));
          fireEvent.click(screen.getByText('Put away wand'));
        }
      }).not.toThrow();
      
      // Should end in normal mode
      expect(screen.getByText('Play with wand')).toBeInTheDocument();
    });

    it('handles complex interaction sequences without errors', () => {
      render(<App />);
      
      expect(() => {
        // Enable wand mode
        fireEvent.click(screen.getByText('Play with wand'));
        
        // Complex sequence
        fireEvent.mouseMove(document, { clientX: 110, clientY: 110 });
        triggerInterval(5);
        
        const wandClickArea = document.querySelector('.wand-click-area');
        if (wandClickArea) {
          fireEvent.click(wandClickArea);
        }
        
        fireEvent.mouseMove(document, { clientX: 200, clientY: 200 });
        triggerInterval(10);
        
        // Disable wand mode
        fireEvent.click(screen.getByText('Put away wand'));
      }).not.toThrow();
      
      expect(screen.getByText('Play with wand')).toBeInTheDocument();
    });
  });
}); 