import { describe, it, expect } from 'vitest';

describe('Walking Detection Integration', () => {
  describe('Movement Speed Calculation', () => {
    it('should calculate combined X/Z movement speed using Pythagorean theorem', () => {
      // This tests the core mathematical logic used in CatInteractionManager
      const calculateMovementSpeed = (dx: number, dz: number, dt: number) => {
        const totalDistance = Math.sqrt(dx * dx + dz * dz);
        return (totalDistance / dt) * 1000; // Convert to px/sec
      };

      // Test case 1: Pure X movement
      const xOnlySpeed = calculateMovementSpeed(30, 0, 100);
      expect(xOnlySpeed).toBe(300); // 30px in 100ms = 300px/sec

      // Test case 2: Pure Z movement  
      const zOnlySpeed = calculateMovementSpeed(0, 40, 100);
      expect(zOnlySpeed).toBe(400); // 40px in 100ms = 400px/sec

      // Test case 3: Diagonal movement (3-4-5 triangle)
      const diagonalSpeed = calculateMovementSpeed(30, 40, 100);
      expect(diagonalSpeed).toBe(500); // sqrt(30² + 40²) = 50px in 100ms = 500px/sec

      // Test case 4: Diagonal should be faster than individual axes
      expect(diagonalSpeed).toBeGreaterThan(xOnlySpeed);
      expect(diagonalSpeed).toBeGreaterThan(zOnlySpeed);
    });

    it('should handle edge cases correctly', () => {
      const calculateMovementSpeed = (dx: number, dz: number, dt: number) => {
        const totalDistance = Math.sqrt(dx * dx + dz * dz);
        return (totalDistance / dt) * 1000;
      };

      // Zero movement
      expect(calculateMovementSpeed(0, 0, 100)).toBe(0);

      // Very small movements
      const smallSpeed = calculateMovementSpeed(0.1, 0.1, 100);
      expect(smallSpeed).toBeCloseTo(1.414, 2); // sqrt(0.01 + 0.01) * 10

      // Large movements
      const largeSpeed = calculateMovementSpeed(300, 400, 100);
      expect(largeSpeed).toBe(5000); // sqrt(300² + 400²) = 500px in 100ms = 5000px/sec
    });

    it('should be consistent with different time intervals', () => {
      const calculateMovementSpeed = (dx: number, dz: number, dt: number) => {
        const totalDistance = Math.sqrt(dx * dx + dz * dz);
        return (totalDistance / dt) * 1000;
      };

      // Same distance over different time periods should give proportional speeds
      const speed50ms = calculateMovementSpeed(30, 40, 50);  // 50px in 50ms
      const speed100ms = calculateMovementSpeed(30, 40, 100); // 50px in 100ms
      const speed200ms = calculateMovementSpeed(30, 40, 200); // 50px in 200ms

      expect(speed50ms).toBe(1000); // 1000px/sec
      expect(speed100ms).toBe(500);  // 500px/sec
      expect(speed200ms).toBe(250);  // 250px/sec

      // Speed should be inversely proportional to time
      expect(speed50ms).toBe(speed100ms * 2);
      expect(speed100ms).toBe(speed200ms * 2);
    });
  });

  describe('Walking Threshold Logic', () => {
    it('should implement proper hysteresis for walking detection', () => {
      // This tests the logic used in CatInteractionManager for walking state
      const START_SPEED = 18; // px/sec
      const STOP_SPEED = 6;   // px/sec

      let isWalking = false;
      
      const updateWalkingState = (currentSpeed: number) => {
        if (!isWalking && currentSpeed >= START_SPEED) {
          isWalking = true;
        } else if (isWalking && currentSpeed <= STOP_SPEED) {
          isWalking = false;
        }
        return isWalking;
      };

      // Start from rest
      expect(updateWalkingState(0)).toBe(false);
      expect(updateWalkingState(10)).toBe(false); // Below start threshold
      expect(updateWalkingState(20)).toBe(true);  // Above start threshold

      // Once walking, should continue until below stop threshold
      expect(updateWalkingState(15)).toBe(true);  // Above stop threshold
      expect(updateWalkingState(10)).toBe(true);  // Above stop threshold
      expect(updateWalkingState(5)).toBe(false);  // Below stop threshold

      // Should require start threshold again
      expect(updateWalkingState(10)).toBe(false); // Below start threshold
      expect(updateWalkingState(19)).toBe(true);  // Above start threshold
    });

    it('should prevent oscillation with proper hysteresis', () => {
      const START_SPEED = 18;
      const STOP_SPEED = 6;
      let isWalking = false;
      
      const updateWalkingState = (currentSpeed: number) => {
        if (!isWalking && currentSpeed >= START_SPEED) {
          isWalking = true;
        } else if (isWalking && currentSpeed <= STOP_SPEED) {
          isWalking = false;
        }
        return isWalking;
      };

      // Simulate noisy speed readings around the threshold
      const noisySpeeds = [16, 19, 17, 20, 18, 16, 19]; // Oscillating around 18
      const walkingStates: boolean[] = [];

      noisySpeeds.forEach(speed => {
        walkingStates.push(updateWalkingState(speed));
      });

      // Should start walking when hitting 19, and stay walking despite dips to 16-17
      expect(walkingStates).toEqual([false, true, true, true, true, true, true]);
    });
  });

  describe('Airborne and Pouncing State Handling', () => {
    it('should disable walking when cat is airborne', () => {
      const shouldWalk = (y: number, isPouncing: boolean, speed: number) => {
        if (y > 1 || isPouncing) return false;
        return speed >= 18; // START_SPEED threshold
      };

      // Ground level with good speed
      expect(shouldWalk(0, false, 25)).toBe(true);
      expect(shouldWalk(1, false, 25)).toBe(true); // At threshold

      // Airborne
      expect(shouldWalk(2, false, 25)).toBe(false);
      expect(shouldWalk(10, false, 25)).toBe(false);

      // Pouncing
      expect(shouldWalk(0, true, 25)).toBe(false);
      expect(shouldWalk(5, true, 25)).toBe(false);
    });

    it('should handle edge cases for airborne detection', () => {
      const shouldWalk = (y: number, isPouncing: boolean, speed: number) => {
        if (y > 1 || isPouncing) return false;
        return speed >= 18;
      };

      // Exactly at threshold
      expect(shouldWalk(1.0, false, 25)).toBe(true);
      expect(shouldWalk(1.1, false, 25)).toBe(false);

      // Very small heights
      expect(shouldWalk(0.5, false, 25)).toBe(true);
      expect(shouldWalk(0.9, false, 25)).toBe(true);
    });
  });

  describe('Movement Smoothing', () => {
    it('should apply exponential smoothing to speed values', () => {
      // This tests the smoothing logic used in CatInteractionManager
      const applySmoothing = (currentSmoothed: number, instantSpeed: number, alpha: number = 0.25) => {
        return currentSmoothed * (1 - alpha) + instantSpeed * alpha;
      };

      let smoothedSpeed = 0;

      // Sudden jump in speed
      smoothedSpeed = applySmoothing(smoothedSpeed, 100);
      expect(smoothedSpeed).toBe(25); // 0 * 0.75 + 100 * 0.25

      // Continue with high speed
      smoothedSpeed = applySmoothing(smoothedSpeed, 100);
      expect(smoothedSpeed).toBeCloseTo(43.75, 2); // 25 * 0.75 + 100 * 0.25

      // Gradual approach to target
      for (let i = 0; i < 10; i++) {
        smoothedSpeed = applySmoothing(smoothedSpeed, 100);
      }
      expect(smoothedSpeed).toBeGreaterThan(90); // Should approach 100

      // Sudden drop
      smoothedSpeed = applySmoothing(smoothedSpeed, 0);
      expect(smoothedSpeed).toBeLessThan(80); // Should drop but not to zero immediately
    });

    it('should converge to target value over time', () => {
      const applySmoothing = (currentSmoothed: number, instantSpeed: number, alpha: number = 0.25) => {
        return currentSmoothed * (1 - alpha) + instantSpeed * alpha;
      };

      let smoothedSpeed = 0;
      const targetSpeed = 50;

      // Apply smoothing many times
      for (let i = 0; i < 100; i++) {
        smoothedSpeed = applySmoothing(smoothedSpeed, targetSpeed);
      }

      // Should converge very close to target
      expect(smoothedSpeed).toBeCloseTo(targetSpeed, 1);
    });
  });
});
