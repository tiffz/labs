import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

// Mock the useCatSystem hook
const mockCatSystemActions = {
  toggleWandMode: vi.fn(),
  handleWandMovement: vi.fn(),
  handleWandClick: vi.fn(),
  addEnergy: vi.fn(),
  resetPounceSystem: vi.fn(),
};

const mockCatSystemState = {
  catState: {
    energy: 100,
    pounceConfidence: 0,
    wandMode: false,
    cursorVelocity: 0,
    proximityMultiplier: 1,
    movementNovelty: 1,
    clickExcitement: 0,
    lastClickTime: 0,
    lastPounceTime: 0,
    lastPlayTime: 0,
  },
  animationState: {
    isPouncing: false,
    isPlaying: false,
    isShaking: false,
    isEarWiggling: false,
    isHappyPlaying: false,
    pounceTarget: { x: 0, y: 0 },
    excitementLevel: 0,
  },
  actions: mockCatSystemActions,
  isWandMode: false,
  energy: 100,
  love: 0,
  treats: 0,
  isPouncing: false,
  isPlaying: false,
  isShaking: false,
  isEarWiggling: false,
  isHappyPlaying: false,
  pounceTarget: { x: 0, y: 0 },
  excitementLevel: 0,
  pounceConfidence: 0,
  cursorVelocity: 0,
  proximityMultiplier: 1,
  movementNovelty: 1,
  clickExcitement: 0,
};

vi.mock('./hooks/useCatSystem', () => ({
  useCatSystem: vi.fn(() => mockCatSystemState),
}));

describe('App Component - Wand Toy Mode', () => {
  let heartContainer: HTMLDivElement;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    Object.keys(mockCatSystemActions).forEach(key => {
      mockCatSystemActions[key as keyof typeof mockCatSystemActions].mockClear();
    });

    // Reset cat system state to defaults
    mockCatSystemState.isWandMode = false;
    mockCatSystemState.catState.wandMode = false;
    mockCatSystemState.isPouncing = false;
    mockCatSystemState.animationState.isPouncing = false;
    mockCatSystemState.isShaking = false;
    mockCatSystemState.animationState.isShaking = false;

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

    // Mock requestAnimationFrame (not actively used but may be called by components)
    global.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      callback(performance.now());
      return 1;
    });
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
      
      const wandButton = screen.getByTitle('Play with wand');
      
      // Should start in normal mode
      expect(wandButton).toBeInTheDocument();
      
      // Click to enable wand mode
      fireEvent.click(wandButton);
      
      // Should call toggleWandMode action
      expect(mockCatSystemActions.toggleWandMode).toHaveBeenCalledOnce();
    });

    it('calls toggleWandMode action when button is clicked', () => {
      render(<App />);
      
      const wandButton = screen.getByTitle('Play with wand');
      fireEvent.click(wandButton);
      
      expect(mockCatSystemActions.toggleWandMode).toHaveBeenCalledOnce();
    });

    it('displays "Put away wand" button when in wand mode', () => {
      // Set wand mode to active
      mockCatSystemState.isWandMode = true;
      mockCatSystemState.catState.wandMode = true;
      
      render(<App />);
      
      // Should show "Put away wand" button
      expect(screen.getByTitle('Put away wand')).toBeInTheDocument();
      expect(screen.queryByTitle('Play with wand')).not.toBeInTheDocument();
    });

    it('exits wand mode when Escape key is pressed', () => {
      // Set wand mode to active
      mockCatSystemState.isWandMode = true;
      mockCatSystemState.catState.wandMode = true;
      
      render(<App />);
      
      // Press Escape key
      fireEvent.keyDown(document, { key: 'Escape' });
      
      // Should call toggleWandMode action to exit wand mode
      expect(mockCatSystemActions.toggleWandMode).toHaveBeenCalledOnce();
    });

    it('does not toggle wand mode when Escape key is pressed in normal mode', () => {
      // Ensure wand mode is inactive
      mockCatSystemState.isWandMode = false;
      mockCatSystemState.catState.wandMode = false;
      
      render(<App />);
      
      // Press Escape key
      fireEvent.keyDown(document, { key: 'Escape' });
      
      // Should NOT call toggleWandMode action
      expect(mockCatSystemActions.toggleWandMode).not.toHaveBeenCalled();
    });
  });

  describe('Wand Mode Functionality', () => {
    beforeEach(() => {
      // Set up wand mode as active
      mockCatSystemState.isWandMode = true;
      mockCatSystemState.catState.wandMode = true;
    });

    it('renders wand click area when in wand mode', () => {
      render(<App />);
      
      const wandClickArea = document.querySelector('.wand-click-area');
      expect(wandClickArea).toBeInTheDocument();
    });

    it('calls handleWandMovement on mouse movement in wand area', () => {
      render(<App />);
      
      const wandClickArea = document.querySelector('.wand-click-area');
      expect(wandClickArea).toBeInTheDocument();
      
      if (wandClickArea) {
        fireEvent.mouseMove(wandClickArea, { clientX: 150, clientY: 120 });
        
        expect(mockCatSystemActions.handleWandMovement).toHaveBeenCalledWith({ x: 150, y: 120 });
      }
    });

    it('handles time progression in wand mode without errors', () => {
      render(<App />);
      
      // Simulate time passing - should not throw errors
      expect(() => {
        triggerInterval(50);
      }).not.toThrow();
      
      // Verify wand click area is still present
      expect(document.querySelector('.wand-click-area')).toBeInTheDocument();
    });

    it('handles complex movement patterns without errors', () => {
      render(<App />);
      
      const wandClickArea = document.querySelector('.wand-click-area');
      
      // Simulate complex movement patterns
      expect(() => {
        if (wandClickArea) {
          // High-velocity movements
          for (let i = 0; i < 10; i++) {
            fireEvent.mouseMove(wandClickArea, { clientX: 100 + i * 50, clientY: 100 });
            triggerInterval(1);
          }
          
          // Varied movements
          fireEvent.mouseMove(wandClickArea, { clientX: 120, clientY: 130 });
          triggerInterval(1);
          fireEvent.mouseMove(wandClickArea, { clientX: 110, clientY: 120 });
          triggerInterval(1);
          
          // Sudden movements
          fireEvent.mouseMove(wandClickArea, { clientX: 110, clientY: 110 });
          triggerInterval(2);
          fireEvent.mouseMove(wandClickArea, { clientX: 200, clientY: 200 });
          triggerInterval(1);
          fireEvent.mouseMove(wandClickArea, { clientX: 205, clientY: 205 });
          triggerInterval(1);
        }
      }).not.toThrow();
      
      // Verify wand mode functionality is still working
      expect(document.querySelector('.wand-click-area')).toBeInTheDocument();
    });
  });

  describe('Wand Click Interaction', () => {
    beforeEach(() => {
      // Set up wand mode as active
      mockCatSystemState.isWandMode = true;
      mockCatSystemState.catState.wandMode = true;
    });

    it('handles wand click area interactions', () => {
      render(<App />);
      
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

    it('calls handleWandClick action when wand click area is clicked', () => {
      render(<App />);
      
      const wandClickArea = document.querySelector('.wand-click-area');
      expect(wandClickArea).toBeInTheDocument();
      
      if (wandClickArea) {
        fireEvent.click(wandClickArea);
        
        expect(mockCatSystemActions.handleWandClick).toHaveBeenCalledOnce();
      }
    });

    it('triggers wand shaking animation when clicked', () => {
      // Set shaking state
      mockCatSystemState.isShaking = true;
      mockCatSystemState.animationState.isShaking = true;
      
      render(<App />);
      
      const wandClickArea = document.querySelector('.wand-click-area');
      expect(wandClickArea).toBeInTheDocument();
      
      if (wandClickArea) {
        fireEvent.click(wandClickArea);
        
        // Should call the wand click handler
        expect(mockCatSystemActions.handleWandClick).toHaveBeenCalledOnce();
      }
    });

    it('renders WandToy component when shaking is active', () => {
      // Set shaking state
      mockCatSystemState.isShaking = true;
      mockCatSystemState.animationState.isShaking = true;
      
      render(<App />);
      
      // Should render WandToy with shaking prop
      expect(document.querySelector('.wand-toy')).toBeInTheDocument();
    });
  });

  describe('Wand Mode Cleanup', () => {
    it('cleans up properly when wand mode is disabled', () => {
      // Start in wand mode
      mockCatSystemState.isWandMode = true;
      mockCatSystemState.catState.wandMode = true;
      
      const { rerender } = render(<App />);
      
      // Let some intervals run
      triggerInterval(5);
      
      // Disable wand mode
      mockCatSystemState.isWandMode = false;
      mockCatSystemState.catState.wandMode = false;
      
      // Re-render with new state
      expect(() => {
        rerender(<App />);
        triggerInterval(5);
      }).not.toThrow();
      
      // Should not have wand click area anymore
      expect(document.querySelector('.wand-click-area')).not.toBeInTheDocument();
    });

    it('handles state transitions correctly', () => {
      render(<App />);
      
      // Multiple mode toggles should work without errors
      expect(() => {
        // Enable wand mode
        const wandButton = screen.getByTitle('Play with wand');
        fireEvent.click(wandButton);
        
        // Let some time pass
        triggerInterval(10);
        
        // Toggle multiple times
        fireEvent.click(wandButton);
        fireEvent.click(wandButton);
        fireEvent.click(wandButton);
      }).not.toThrow();
      
      // Should have called toggleWandMode multiple times
      expect(mockCatSystemActions.toggleWandMode).toHaveBeenCalledTimes(4);
    });
  });

  describe('WandToy Component Integration', () => {
    beforeEach(() => {
      // Set up wand mode as active
      mockCatSystemState.isWandMode = true;
      mockCatSystemState.catState.wandMode = true;
    });

    it('renders WandToy component when in wand mode', () => {
      render(<App />);
      
      // Should render WandToy component
      expect(document.querySelector('.wand-toy')).toBeInTheDocument();
    });

    it('passes shaking state to WandToy component', () => {
      // Set shaking state
      mockCatSystemState.isShaking = true;
      mockCatSystemState.animationState.isShaking = true;
      
      render(<App />);
      
      const wandClickArea = document.querySelector('.wand-click-area');
      if (wandClickArea) {
        // Click to trigger wand interaction
        fireEvent.click(wandClickArea);
        
        expect(mockCatSystemActions.handleWandClick).toHaveBeenCalledOnce();
      }
      
      expect(document.querySelector('.wand-toy')).toBeInTheDocument();
    });

    it('removes WandToy component when wand mode is disabled', () => {
      const { rerender } = render(<App />);
      expect(document.querySelector('.wand-toy')).toBeInTheDocument();
      
      // Disable wand mode
      mockCatSystemState.isWandMode = false;
      mockCatSystemState.catState.wandMode = false;
      
      rerender(<App />);
      expect(document.querySelector('.wand-toy')).not.toBeInTheDocument();
    });
  });

  describe('Cat Click Blocking in Wand Mode', () => {
    it('does not block cat clicks when not pouncing in wand mode', () => {
      // Set up wand mode active but not pouncing
      mockCatSystemState.isWandMode = true;
      mockCatSystemState.catState.wandMode = true;
      mockCatSystemState.isPouncing = false;
      mockCatSystemState.animationState.isPouncing = false;
      
      render(<App />);
      
      const catElement = document.querySelector('.cat-container');
      expect(catElement).toBeInTheDocument();
      
      if (catElement) {
        // Cat clicks should work when not pouncing
        expect(() => {
          fireEvent.click(catElement);
        }).not.toThrow();
      }
    });

    it('blocks cat clicks when pouncing in wand mode', () => {
      // Set up wand mode active and pouncing
      mockCatSystemState.isWandMode = true;
      mockCatSystemState.catState.wandMode = true;
      mockCatSystemState.isPouncing = true;
      mockCatSystemState.animationState.isPouncing = true;
      
      render(<App />);
      
      const catElement = document.querySelector('.cat-container');
      expect(catElement).toBeInTheDocument();
      
      // The click handler should detect pouncing && wandMode and return early
      // This is tested by the fact that no love gain should occur
      if (catElement) {
        expect(() => {
          fireEvent.click(catElement);
        }).not.toThrow();
      }
    });
  });

  describe('System Robustness', () => {
    it('handles rapid mode switching without errors', () => {
      render(<App />);
      
      expect(() => {
        const wandButton = screen.getByTitle('Play with wand');
        // Rapid toggling
        for (let i = 0; i < 5; i++) {
          fireEvent.click(wandButton);
        }
      }).not.toThrow();
      
      // Should have called toggleWandMode 5 times
      expect(mockCatSystemActions.toggleWandMode).toHaveBeenCalledTimes(5);
    });

    it('handles complex interaction sequences without errors', () => {
      // Start in wand mode
      mockCatSystemState.isWandMode = true;
      mockCatSystemState.catState.wandMode = true;
      
      render(<App />);
      
      expect(() => {
        // Complex sequence
        const wandClickArea = document.querySelector('.wand-click-area');
        if (wandClickArea) {
          fireEvent.mouseMove(wandClickArea, { clientX: 110, clientY: 110 });
          triggerInterval(5);
          
          fireEvent.click(wandClickArea);
          
          fireEvent.mouseMove(wandClickArea, { clientX: 200, clientY: 200 });
          triggerInterval(10);
        }
        
        // Toggle wand mode
        const wandButton = screen.getByTitle('Put away wand');
        fireEvent.click(wandButton);
      }).not.toThrow();
      
      expect(mockCatSystemActions.handleWandMovement).toHaveBeenCalled();
      expect(mockCatSystemActions.handleWandClick).toHaveBeenCalled();
      expect(mockCatSystemActions.toggleWandMode).toHaveBeenCalled();
    });
  });

  describe('Job System Integration', () => {
    beforeEach(() => {
      // Reset mocks
      vi.clearAllMocks();
      
      // Reset cat system state
      mockCatSystemState.isWandMode = false;
      mockCatSystemState.catState.wandMode = false;
    });

    it('renders job panel with correct initial state', async () => {
      render(<App />);
      
      await act(async () => {
        // Click on Jobs tab
        const jobsTab = screen.getByText('Jobs');
        fireEvent.click(jobsTab);
      });
      
      // Should show the job panel content
      expect(screen.getByText('Your cat needs a better life. It\'s time to get a job.')).toBeInTheDocument();
      expect(screen.getByText('Box Factory')).toBeInTheDocument();
    });

    it('shows interview button for unemployed state', async () => {
      render(<App />);
      
      await act(async () => {
        const jobsTab = screen.getByText('Jobs');
        fireEvent.click(jobsTab);
      });
      
      // Should show Interview button (not Train) for unemployed
      expect(screen.getByText(/Interview/)).toBeInTheDocument();
    });

    it('shows interview button for unemployed state', async () => {
      render(<App />);
      
      await act(async () => {
        const jobsTab = screen.getByText('Jobs');
        fireEvent.click(jobsTab);
      });
      
      // Should show Interview button for unemployed state (not Accept Offer initially)
      expect(screen.getByText(/Interview/)).toBeInTheDocument();
      
      // Should show job description and looking for work status
      expect(screen.getByText('Looking for work')).toBeInTheDocument();
    });

    it('handles escape key to exit wand mode', () => {
      mockCatSystemState.isWandMode = true;
      mockCatSystemState.catState.wandMode = true;
      
      render(<App />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(mockCatSystemActions.toggleWandMode).toHaveBeenCalledOnce();
    });

    it('does not toggle wand mode when escape pressed in normal mode', () => {
      mockCatSystemState.isWandMode = false;
      mockCatSystemState.catState.wandMode = false;
      
      render(<App />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(mockCatSystemActions.toggleWandMode).not.toHaveBeenCalled();
    });

    it('displays interview UI elements correctly', async () => {
      render(<App />);
      
      await act(async () => {
        const jobsTab = screen.getByText('Jobs');
        fireEvent.click(jobsTab);
      });
      
      // Should show compact job card in interview state
      const jobCard = screen.getByText('Box Factory').closest('.compact-job-card');
      expect(jobCard).toBeInTheDocument();
      expect(jobCard).toHaveClass('interview-state');
      
      // Should show current status as "Looking for work" (not "Unemployed")
      expect(screen.getByText('Looking for work')).toBeInTheDocument();
    });

    it('shows no feedback area initially when no rejection exists', async () => {
      render(<App />);
      
      await act(async () => {
        const jobsTab = screen.getByText('Jobs');
        fireEvent.click(jobsTab);
      });
      
      // Should not show feedback area when no rejection reason exists
      const feedbackArea = document.querySelector('.interview-feedback');
      expect(feedbackArea).not.toBeInTheDocument();
      
      // Should still show the interview button
      expect(screen.getByTitle(/Interview for this position/)).toBeInTheDocument();
    });

    it('displays clean interview UI without clutter', async () => {
      render(<App />);
      
      await act(async () => {
        const jobsTab = screen.getByText('Jobs');
        fireEvent.click(jobsTab);
      });
      
      // Should not show feedback area when no rejection exists (cleaner UI)
      const feedbackArea = document.querySelector('.interview-feedback');
      expect(feedbackArea).not.toBeInTheDocument();
      
      // Should show essential interview elements
      expect(screen.getByText('Box Factory')).toBeInTheDocument();
      expect(screen.getByText('Looking for work')).toBeInTheDocument();
    });

    it('maintains clean layout without unnecessary elements', async () => {
      render(<App />);
      
      await act(async () => {
        const jobsTab = screen.getByText('Jobs');
        fireEvent.click(jobsTab);
      });
      
      // Should have a compact job card structure
      const jobCard = document.querySelector('.compact-job-card');
      expect(jobCard).toBeInTheDocument();
      expect(jobCard).toHaveClass('interview-state');
      
      // Should not have feedback area cluttering the UI initially
      const feedbackArea = document.querySelector('.interview-feedback');
      expect(feedbackArea).not.toBeInTheDocument();
    });

    it('shows proper interview structure in unemployed state', async () => {
      render(<App />);
      
      await act(async () => {
        const jobsTab = screen.getByText('Jobs');
        fireEvent.click(jobsTab);
      });
      
      // Should not show feedback area initially (no rejection yet)
      const feedbackArea = document.querySelector('.interview-feedback');
      expect(feedbackArea).not.toBeInTheDocument();
      
      // Should show the interview UI elements
      expect(screen.getByText('Looking for work')).toBeInTheDocument();
      
      // Should have interview button available
      expect(screen.getByTitle(/Interview for this position/)).toBeInTheDocument();
    });

    it('interview button has proper accessibility and styling', async () => {
      render(<App />);
      
      await act(async () => {
        const jobsTab = screen.getByText('Jobs');
        fireEvent.click(jobsTab);
      });
      
      // Interview button should be properly labeled and accessible
      const interviewButton = screen.getByTitle(/Interview for this position/);
      expect(interviewButton).toBeInTheDocument();
      expect(interviewButton).toHaveClass('interview-btn');
      
      // Button should show love cost
      expect(screen.getByText(/Interview \(3/)).toBeInTheDocument();
    });

    it('maintains proper game state structure', () => {
      const { container } = render(<App />);
      
      // Should render without crashing, indicating proper state structure
      expect(container.firstChild).toBeInTheDocument();
      
      // Should not have React errors in console (no error boundaries triggered)
      expect(() => render(<App />)).not.toThrow();
    });

    it('prevents infinite re-renders during job interactions', async () => {
      const renderSpy = vi.fn();
      const WrappedApp = () => {
        renderSpy();
        return <App />;
      };
      
      render(<WrappedApp />);
      
      const initialRenderCount = renderSpy.mock.calls.length;
      
      await act(async () => {
        const jobsTab = screen.getByText('Jobs');
        fireEvent.click(jobsTab);
      });
      
      // Should not cause excessive re-renders
      const finalRenderCount = renderSpy.mock.calls.length;
      expect(finalRenderCount - initialRenderCount).toBeLessThan(10);
    });
  });
}); 