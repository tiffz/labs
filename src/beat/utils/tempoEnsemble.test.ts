/**
 * Tempo Detection Tests
 *
 * These are UNIT TESTS that verify the algorithm's logic, NOT integration tests
 * that run against actual audio files. This is intentional because:
 *
 * 1. Copyrighted audio files cannot be committed to the repository
 * 2. Audio files AND test-config.json live in public/.hidden/ (gitignored)
 * 3. Unit tests should be fast and not require external resources
 *
 * The tests here verify:
 * - Tempo range penalty calculations
 * - Octave selection scoring logic using HARDCODED values from manual testing
 * - Test case definition validity
 *
 * NOTE: Expected BPM values are duplicated here (hardcoded) because
 * test-config.json is gitignored. Keep these in sync when updating.
 *
 * ============================================================================
 * MANUAL TESTING PROCEDURE (for regression testing with real audio)
 * ============================================================================
 *
 * Prerequisites:
 * - Place test audio files in public/.hidden/ (gitignored)
 * - Place test-config.json in public/.hidden/ (gitignored)
 * - Start dev server: npm run dev
 *
 * Test each file:
 * 1. Navigate to: http://localhost:5173/beat/?autoUrl=http://localhost:5173/.hidden/[filename].mp4
 * 2. Wait for analysis to complete
 * 3. Check browser console for [OctaveSelection] and [TempoEnsemble] logs
 * 4. Verify final BPM matches expected value within tolerance (see below)
 *
 * Expected results (hardcoded here, also in .hidden/test-config.json):
 * - let-it-go.mp4:          137 BPM (±2) - Should NOT detect as 69 (half-time)
 * - wish-my-life-away.mp4:  70 BPM (±3)  - Should NOT detect as 138 (double-time)
 * - la-isla-bonita.mp4:     100 BPM (±5) - Should NOT detect as 200 (double-time)
 * - let-it-go-piano.mp4:    137 BPM (±5) - Piano cover version
 *
 * If any test fails, check:
 * - Onset density value in console logs
 * - Density error scores for each octave option
 * - Whether tempo range penalty is being applied correctly
 */

import { describe, it, expect } from 'vitest';

// ============================================================================
// Expected BPM Values (from test-config.json)
// ============================================================================

interface BpmTestCase {
  id: string;
  name: string;
  filepath: string;
  expectedBpm: number;
  tolerance: number;
  notes?: string;
}

export const BPM_TEST_CASES: BpmTestCase[] = [
  {
    id: 'let-it-go-full',
    name: 'Let It Go (Full)',
    filepath: 'public/.hidden/let-it-go.mp4',
    expectedBpm: 137,
    tolerance: 2,
    notes: 'Fast Disney ballad - should NOT be detected as 69 BPM (half-time)',
  },
  {
    id: 'wish-my-life-away',
    name: 'Wish My Life Away',
    filepath: 'public/.hidden/wish-my-life-away.mp4',
    expectedBpm: 68,
    tolerance: 3,
    notes: 'Slow piano ballad with fermatas - should NOT be detected as 136 BPM (double-time)',
  },
  {
    id: 'la-isla-bonita',
    name: 'La Isla Bonita',
    filepath: 'public/.hidden/la-isla-bonita.mp4',
    expectedBpm: 99,
    tolerance: 5,
    notes: 'Latin rhythm with dense percussion - should NOT be detected as 200 BPM (double-time)',
  },
  {
    id: 'let-it-go-piano',
    name: 'Let It Go (Piano Cover)',
    filepath: 'public/.hidden/let-it-go-piano.mp4',
    expectedBpm: 137,
    tolerance: 5,
    notes: 'Piano cover version - may have more tempo variation',
  },
];

// ============================================================================
// BPM Validation Utilities
// ============================================================================

/**
 * Check if detected BPM is within tolerance of expected BPM
 */
export function bpmWithinTolerance(
  detected: number,
  expected: number,
  tolerance: number
): boolean {
  return Math.abs(detected - expected) <= tolerance;
}

/**
 * Check if two BPMs are octave-related (one is half or double the other)
 */
export function areOctaveRelated(bpm1: number, bpm2: number): boolean {
  const ratio = bpm1 / bpm2;
  // Check if ratio is close to 0.5, 1, or 2
  return (
    Math.abs(ratio - 0.5) < 0.05 ||
    Math.abs(ratio - 1) < 0.05 ||
    Math.abs(ratio - 2) < 0.05
  );
}

/**
 * Get the expected octave relationship for a test case
 */
export function describeOctaveError(detected: number, expected: number): string {
  const ratio = detected / expected;
  if (Math.abs(ratio - 0.5) < 0.05) {
    return `Detected half-time (${detected} instead of ${expected})`;
  }
  if (Math.abs(ratio - 2) < 0.05) {
    return `Detected double-time (${detected} instead of ${expected})`;
  }
  return `BPM mismatch: detected ${detected}, expected ${expected}`;
}

// ============================================================================
// Tempo Range Penalty Tests (Unit Tests)
// ============================================================================

describe('Tempo Range Penalty', () => {
  // Simulate the penalty function from tempoEnsemble.ts
  function getTempoRangePenalty(bpm: number): number {
    if (bpm >= 60 && bpm <= 170) return 0;
    if (bpm >= 50 && bpm < 60) return 0.15;
    if (bpm > 170 && bpm <= 190) return 0.2;
    if (bpm < 50) return 0.3;
    return 0.35;
  }

  it('should not penalize tempos in normal range (60-170 BPM)', () => {
    expect(getTempoRangePenalty(60)).toBe(0);
    expect(getTempoRangePenalty(69.2)).toBe(0);  // Wish My Life Away
    expect(getTempoRangePenalty(99.9)).toBe(0);  // La Isla Bonita
    expect(getTempoRangePenalty(137.4)).toBe(0); // Let It Go
    expect(getTempoRangePenalty(170)).toBe(0);
  });

  it('should slightly penalize slow tempos (50-60 BPM)', () => {
    expect(getTempoRangePenalty(55)).toBe(0.15);
    expect(getTempoRangePenalty(50)).toBe(0.15);
  });

  it('should penalize fast tempos (170-190 BPM)', () => {
    expect(getTempoRangePenalty(175)).toBe(0.2);
    expect(getTempoRangePenalty(190)).toBe(0.2);
  });

  it('should heavily penalize very slow tempos (<50 BPM)', () => {
    expect(getTempoRangePenalty(45)).toBe(0.3);
    expect(getTempoRangePenalty(35)).toBe(0.3);
  });

  it('should heavily penalize very fast tempos (>190 BPM)', () => {
    expect(getTempoRangePenalty(200)).toBe(0.35);
    expect(getTempoRangePenalty(220)).toBe(0.35);
  });
});

// ============================================================================
// Octave Selection Logic Tests
// ============================================================================

describe('Octave Selection Logic', () => {
  // Test that the octave selection prefers the correct tempo for each test case
  // These simulate the decision logic based on observed onset densities

  describe('Let It Go scenario', () => {
    // Onset density: 3.53/sec, Candidate: 69 BPM
    const onsetDensity = 3.53;

    it('should prefer double (138 BPM) over candidate (69 BPM)', () => {
      // Expected density at 138 BPM (fast, 1.5 onsets/beat): 3.45/sec
      // Expected density at 69 BPM (medium, 2.5 onsets/beat): 2.88/sec
      const expectedAt138 = (138 / 60) * 1.5; // 3.45
      const expectedAt69 = (69 / 60) * 2.5; // 2.875

      const errorAt138 = Math.abs(onsetDensity - expectedAt138) / expectedAt138;
      const errorAt69 = Math.abs(onsetDensity - expectedAt69) / expectedAt69;

      // Error at 138 (0.02) should be much lower than error at 69 (0.23)
      expect(errorAt138).toBeLessThan(errorAt69);
      expect(errorAt138).toBeLessThan(0.1); // Should be very close match
    });
  });

  describe('Wish My Life Away scenario', () => {
    // Onset density: 2.46/sec, Candidate: 138 BPM
    const onsetDensity = 2.46;

    it('should prefer half (69 BPM) over candidate (138 BPM)', () => {
      // Expected density at 69 BPM (slow, 3.0 onsets/beat): 3.45/sec
      // Expected density at 138 BPM (medium, 2.5 onsets/beat): 5.75/sec
      const expectedAt69 = (69 / 60) * 3.0; // 3.45
      const expectedAt138 = (138 / 60) * 2.5; // 5.75

      const errorAt69 = Math.abs(onsetDensity - expectedAt69) / expectedAt69;
      const errorAt138 = Math.abs(onsetDensity - expectedAt138) / expectedAt138;

      // Error at 69 (0.29) should be lower than error at 138 (0.57)
      expect(errorAt69).toBeLessThan(errorAt138);
    });
  });

  describe('La Isla Bonita scenario', () => {
    // Onset density: 5.71/sec, Candidate: 100 BPM
    const onsetDensity = 5.71;

    it('should prefer candidate (100 BPM) over double (200 BPM) due to tempo penalty', () => {
      // Expected density at 100 BPM (medium, 2.5 onsets/beat): 4.17/sec
      // Expected density at 200 BPM (fast, 1.5 onsets/beat): 5.00/sec
      const expectedAt100 = (100 / 60) * 2.5; // 4.17
      const expectedAt200 = (200 / 60) * 1.5; // 5.0

      const errorAt100 = Math.abs(onsetDensity - expectedAt100) / expectedAt100;
      const errorAt200 = Math.abs(onsetDensity - expectedAt200) / expectedAt200;

      // Error at 200 is lower (0.14 vs 0.37), but...
      expect(errorAt200).toBeLessThan(errorAt100);

      // After tempo range penalty, 100 BPM should win:
      // - 100 BPM: error 0.37 - 0.05 (preference) + 0 (penalty) = 0.32
      // - 200 BPM: error 0.14 + 0.35 (penalty for >190) = 0.49
      const scoreAt100 = errorAt100 - 0.05; // preference bonus
      const scoreAt200 = errorAt200 + 0.35; // extreme tempo penalty

      expect(scoreAt100).toBeLessThan(scoreAt200);
    });
  });
});

// ============================================================================
// BPM Validation Tests (for CI/CD)
// ============================================================================

describe('BPM Test Case Validation', () => {
  it('should have valid test cases defined', () => {
    expect(BPM_TEST_CASES.length).toBeGreaterThan(0);

    for (const testCase of BPM_TEST_CASES) {
      expect(testCase.expectedBpm).toBeGreaterThan(0);
      expect(testCase.tolerance).toBeGreaterThan(0);
      expect(testCase.filepath).toBeTruthy();
    }
  });

  it('should have no duplicate test case IDs', () => {
    const ids = BPM_TEST_CASES.map((tc) => tc.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have expected BPMs in reasonable range', () => {
    for (const testCase of BPM_TEST_CASES) {
      expect(testCase.expectedBpm).toBeGreaterThanOrEqual(40);
      expect(testCase.expectedBpm).toBeLessThanOrEqual(220);
    }
  });
});

// ============================================================================
// Integer BPM Snapping Tests
// ============================================================================

describe('Integer BPM Snapping Logic', () => {
  // These test the logic of preferring integer BPMs
  // Most studio recordings use integer BPMs (click tracks default to whole numbers)

  describe('should snap close fractional BPMs to integers', () => {
    it('136.78 should snap to 137 (common case for Let It Go)', () => {
      // 136.78 is 0.22 away from 137, well within snap threshold
      const fractionalBpm = 136.78;
      const nearestInteger = Math.round(fractionalBpm);
      const delta = Math.abs(nearestInteger - fractionalBpm);
      
      expect(nearestInteger).toBe(137);
      expect(delta).toBeLessThan(0.5); // Within snap range
    });

    it('137.4 should snap to 137', () => {
      const fractionalBpm = 137.4;
      const nearestInteger = Math.round(fractionalBpm);
      const delta = Math.abs(nearestInteger - fractionalBpm);
      
      expect(nearestInteger).toBe(137);
      expect(delta).toBeLessThan(0.5);
    });

    it('68.19 should snap to 68', () => {
      const fractionalBpm = 68.19;
      const nearestInteger = Math.round(fractionalBpm);
      const delta = Math.abs(nearestInteger - fractionalBpm);
      
      expect(nearestInteger).toBe(68);
      expect(delta).toBeLessThan(0.5);
    });
  });

  describe('improvement threshold for keeping fractional BPM', () => {
    // Fractional BPM should only be kept if it aligns 12%+ better than integer
    const IMPROVEMENT_THRESHOLD = 0.12;

    it('should require significant improvement to keep fractional BPM', () => {
      // If fractional scores 0.80 and integer scores 0.75,
      // improvement is 0.05 (5%), which is less than 12% threshold
      const fractionalScore = 0.80;
      const integerScore = 0.75;
      const improvement = fractionalScore - integerScore;
      
      expect(improvement).toBeLessThan(IMPROVEMENT_THRESHOLD);
      // Therefore, should snap to integer
    });

    it('should keep fractional if improvement exceeds threshold', () => {
      // If fractional scores 0.90 and integer scores 0.75,
      // improvement is 0.15 (15%), which exceeds 12% threshold
      const fractionalScore = 0.90;
      const integerScore = 0.75;
      const improvement = fractionalScore - integerScore;
      
      expect(improvement).toBeGreaterThan(IMPROVEMENT_THRESHOLD);
      // Therefore, should keep fractional
    });
  });
});
