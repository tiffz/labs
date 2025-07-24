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
    expect(openEyes.className).not.toContain('hidden');
  });

  it('shows sleepy eyes when isSleeping is true', () => {
    const props = getDefaultProps({ isSleeping: true });
    render(<Cat {...props} />);
    const sleepyEyes = screen.getByTestId('eye-sleepy');
    expect(sleepyEyes.className).not.toContain('hidden');
    const openEyes = screen.getByTestId('eye-open');
    expect(openEyes.className).toContain('hidden');
  });

  it('shows happy eyes when isJumping is true', () => {
    const props = getDefaultProps({ isJumping: true });
    render(<Cat {...props} />);
    const happyEyes = screen.getByTestId('eye-happy');
    expect(happyEyes.className).not.toContain('hidden');
    const openEyes = screen.getByTestId('eye-open');
    expect(openEyes.className).toContain('hidden');
  });

  it('shows happy eyes when isSmiling is true', () => {
    const props = getDefaultProps({ isSmiling: true });
    render(<Cat {...props} />);
    const happyEyes = screen.getByTestId('eye-happy');
    expect(happyEyes.className).not.toContain('hidden');
  });

  it('shows startled eyes when isStartled is true', () => {
    const props = getDefaultProps({ isStartled: true });
    render(<Cat {...props} />);
    const startledEyes = screen.getByTestId('eye-startled');
    expect(startledEyes.className).not.toContain('hidden');
    const openEyes = screen.getByTestId('eye-open');
    expect(openEyes.className).toContain('hidden');
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
      expect(openEyes.className).not.toContain('hidden');
      expect(sleepyEyes.className).toContain('hidden');

      // Advance time to the point of the first blink
      act(() => {
        vi.advanceTimersByTime(4001); // Drowsiness leads to a blink
      });

      // Now the eyes should be sleepy (blinking)
      expect(sleepyEyes.className).not.toContain('hidden');
      expect(openEyes.className).toContain('hidden');

      // Advance time to the end of the blink
      act(() => {
        vi.advanceTimersByTime(201); // Blink duration
      });

      // Eyes should be open again
      expect(openEyes.className).not.toContain('hidden');
      expect(sleepyEyes.className).toContain('hidden');
    });
  });
  
  it('startled eyes have priority over happy eyes', () => {
    const props = getDefaultProps({ isStartled: true, isSmiling: true });
    render(<Cat {...props} />);
    const startledEyes = screen.getByTestId('eye-startled');
    const happyEyes = screen.getByTestId('eye-happy');
    
    expect(startledEyes.className).not.toContain('hidden');
    expect(happyEyes.className).toContain('hidden');
  });
}); 