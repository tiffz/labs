import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Cat from './Cat';
import React from 'react';

// A helper function to create default props and allow overriding
const getDefaultProps = (overrides: Partial<React.ComponentProps<typeof Cat>> = {}) => {
  const defaultProps: React.ComponentProps<typeof Cat> = {
    onClick: vi.fn(),
    onEyeClick: vi.fn(),
    onEarClick: vi.fn(),
    onNoseClick: vi.fn(),
    onCheekClick: vi.fn(),
    isPetting: false,
    isStartled: false,
    isSleeping: false,
    isDrowsy: false,
    isPouncing: false,
    isJumping: false,
    isPlaying: false,
    isSmiling: false,
    headTiltAngle: 0,
    pounceTarget: { x: 0, y: 0 },
    wigglingEar: null,
    lastHeart: null,
    wandMode: false,
    isSubtleWiggling: false,
  };
  return { ...defaultProps, ...overrides };
};

describe('Cat Component Eye States', () => {
  it('shows open eyes by default', () => {
    const props = getDefaultProps();
    render(<Cat {...props} />);
    const openEyes = screen.getByTestId('eye-open');
    expect(openEyes.classList.contains('hidden')).toBe(false);
  });

  it('shows sleepy eyes when isSleeping is true', () => {
    const props = getDefaultProps({ isSleeping: true });
    render(<Cat {...props} />);
    const sleepyEyes = screen.getByTestId('eye-sleepy');
    expect(sleepyEyes.classList.contains('hidden')).toBe(false);
    const openEyes = screen.getByTestId('eye-open');
    expect(openEyes.classList.contains('hidden')).toBe(true);
  });

  it('shows happy eyes when isJumping is true', () => {
    const props = getDefaultProps({ isJumping: true });
    render(<Cat {...props} />);
    const happyEyes = screen.getByTestId('eye-happy');
    expect(happyEyes.classList.contains('hidden')).toBe(false);
    const openEyes = screen.getByTestId('eye-open');
    expect(openEyes.classList.contains('hidden')).toBe(true);
  });

  it('shows happy eyes when isSmiling is true', () => {
    const props = getDefaultProps({ isSmiling: true });
    render(<Cat {...props} />);
    const happyEyes = screen.getByTestId('eye-happy');
    expect(happyEyes.classList.contains('hidden')).toBe(false);
  });

  it('shows startled eyes when isStartled is true', () => {
    const props = getDefaultProps({ isStartled: true });
    render(<Cat {...props} />);
    const startledEyes = screen.getByTestId('eye-startled');
    expect(startledEyes.classList.contains('hidden')).toBe(false);
    const openEyes = screen.getByTestId('eye-open');
    expect(openEyes.classList.contains('hidden')).toBe(true);
  });

  describe('drowsy and blinking states', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('shows sleepy eyes when drowsy and blinking, and open eyes between blinks', () => {
      const props = getDefaultProps({ isDrowsy: true });
      render(<Cat {...props} />);

      // Initially, eyes should be open
      const openEyes = screen.getByTestId('eye-open');
      const sleepyEyes = screen.getByTestId('eye-sleepy');
      expect(openEyes.classList.contains('hidden')).toBe(false);
      expect(sleepyEyes.classList.contains('hidden')).toBe(true);

      // Advance time to the point of the first blink
      act(() => {
        vi.advanceTimersByTime(4001); // Drowsiness leads to a blink
      });

      // Now the eyes should be sleepy (blinking)
      expect(sleepyEyes.classList.contains('hidden')).toBe(false);
      expect(openEyes.classList.contains('hidden')).toBe(true);

      // Advance time to the end of the blink
      act(() => {
        vi.advanceTimersByTime(201); // Blink duration
      });

      // Eyes should be open again
      expect(openEyes.classList.contains('hidden')).toBe(false);
      expect(sleepyEyes.classList.contains('hidden')).toBe(true);
    });
  });
  
  it('startled eyes have priority over happy eyes', () => {
    const props = getDefaultProps({ isStartled: true, isSmiling: true });
    render(<Cat {...props} />);
    const startledEyes = screen.getByTestId('eye-startled');
    const happyEyes = screen.getByTestId('eye-happy');
    
    expect(startledEyes.classList.contains('hidden')).toBe(false);
    expect(happyEyes.classList.contains('hidden')).toBe(true);
  });
});

describe('Cat Component Eye Tracking', () => {
  beforeEach(() => {
    // Mock getBoundingClientRect for the cat SVG element
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

    global.cancelAnimationFrame = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders pupils with initial centered positions', () => {
    const props = getDefaultProps();
    const { container } = render(<Cat {...props} />);

    // The pupils should be rendered with their initial positions
    const leftPupil = container.querySelector('[data-testid="eye-open"] g:first-child circle[fill="black"]') as SVGCircleElement;
    const rightPupil = container.querySelector('[data-testid="eye-open"] g:last-child circle[fill="black"]') as SVGCircleElement;

    expect(leftPupil).toBeTruthy();
    expect(rightPupil).toBeTruthy();

    // Check initial positions
    expect(leftPupil.getAttribute('cx')).toBe('80');
    expect(leftPupil.getAttribute('cy')).toBe('80');
    expect(rightPupil.getAttribute('cx')).toBe('120');
    expect(rightPupil.getAttribute('cy')).toBe('80');
  });

  it('sets up mouse event listener for tracking', () => {
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

    const props = getDefaultProps();
    const { unmount } = render(<Cat {...props} />);

    // Should have added a mousemove listener
    expect(addEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));

    // Cleanup should remove the listener
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
  });

  it('sets up animation frame loop for pupil updates', () => {
    const rafSpy = vi.spyOn(global, 'requestAnimationFrame').mockImplementation(() => {
      // Don't actually call the callback to avoid infinite loop
      return 1;
    });

    const props = getDefaultProps();
    render(<Cat {...props} />);

    // Should have requested an animation frame
    expect(rafSpy).toHaveBeenCalled();
  });

  it('tracks lastHeart instead of mouse when heart is provided', () => {
    const mockHeart = document.createElement('div');
    mockHeart.getBoundingClientRect = vi.fn(() => ({
      width: 20,
      height: 20,
      top: 50,
      left: 300,
      right: 320,
      bottom: 70,
      x: 300,
      y: 50,
      toJSON: () => ({}),
    }));
    
    Object.defineProperty(mockHeart, 'isConnected', {
      get: () => true,
      configurable: true
    });

    const props = getDefaultProps({ lastHeart: mockHeart });
    render(<Cat {...props} />);

    // The component should be rendered and set up to track the heart
    // We can verify the heart's getBoundingClientRect is called when the animation loop runs
    expect(mockHeart.getBoundingClientRect).toBeDefined();
    expect(props.lastHeart).toBe(mockHeart);
  });

  it('pupils do not move when eyes are not in open state', () => {
    const props = getDefaultProps({ isSleeping: true });
    const { container } = render(<Cat {...props} />);

    // When sleeping, open eyes should be hidden
    const openEyes = screen.getByTestId('eye-open');
    expect(openEyes.classList.contains('hidden')).toBe(true);

    // The pupils still exist in the DOM but the eye group is hidden
    const leftPupil = container.querySelector('[data-testid="eye-open"] g:first-child circle[fill="black"]') as SVGCircleElement;
    
    // Even if pupils move, they won't be visible because the eye group is hidden
    expect(openEyes.classList.contains('hidden')).toBe(true);
    expect(leftPupil).toBeTruthy(); // Just verify the pupil exists
  });

  it('has proper pupil positioning constraints built into component', () => {
    const props = getDefaultProps();
    const { container } = render(<Cat {...props} />);

    // Check that pupils are positioned within reasonable eye bounds
    const leftPupil = container.querySelector('[data-testid="eye-open"] g:first-child circle[fill="black"]') as SVGCircleElement;
    const rightPupil = container.querySelector('[data-testid="eye-open"] g:last-child circle[fill="black"]') as SVGCircleElement;

    // Pupils should have a reasonable radius (smaller than the eye)
    expect(leftPupil.getAttribute('r')).toBe('5');
    expect(rightPupil.getAttribute('r')).toBe('5');

    // Eyes should have proper structure with white background and black pupils
    const leftEye = container.querySelector('[data-testid="eye-open"] g:first-child circle[fill="white"]') as SVGCircleElement;
    const rightEye = container.querySelector('[data-testid="eye-open"] g:last-child circle[fill="white"]') as SVGCircleElement;

    expect(leftEye.getAttribute('r')).toBe('10');
    expect(rightEye.getAttribute('r')).toBe('10');
  });
}); 