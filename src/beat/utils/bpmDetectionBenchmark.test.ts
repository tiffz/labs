/**
 * BPM Detection Benchmark Tests
 * 
 * Comprehensive testing of BPM detection algorithms against
 * synthetic audio with known ground-truth BPM values.
 * 
 * These tests are SLOW (~2.5 minutes) and are EXCLUDED by default:
 *   - Excluded from normal `npm test` runs via vite.config.ts
 *   - Automatically included when beat files change (INCLUDE_BEAT_BENCHMARK=true)
 *   - Can be run manually with: INCLUDE_BEAT_BENCHMARK=true npm test
 *   - Or directly: npm test -- --run src/beat/utils/bpmDetectionBenchmark.test.ts
 * 
 * Supports multiple algorithms via the TEMPO_ALGORITHM env variable:
 *   - essentia (default): Essentia.js ensemble with multiple algorithms
 *   - autocorrelation: Pure JS autocorrelation-based detection
 *   - ioi-histogram: Simple IOI histogram analysis
 * 
 * Run with specific algorithm:
 *   TEMPO_ALGORITHM=autocorrelation npm test -- --run src/beat/utils/bpmDetectionBenchmark.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { 
  generateSyntheticAudio, 
  STANDARD_BPM_TEST_CASES,
  OCTAVE_AMBIGUITY_TEST_CASES,
  type BpmTestCase,
} from './syntheticAudioGenerator';
import { 
  getTempoDetector, 
  listTempoDetectors,
  type TempoDetector,
} from './tempoDetectorInterface';

// Import to register all detectors
import './tempoDetectors';

// Get algorithm from environment or use default
const ALGORITHM = process.env.TEMPO_ALGORITHM || 'essentia';

function seedFromBpm(bpm: number): number {
  return Math.round(bpm * 1000);
}

// Get the detector
let detector: TempoDetector;

beforeAll(() => {
  const d = getTempoDetector(ALGORITHM);
  if (!d) {
    const available = listTempoDetectors().map(d => d.id).join(', ');
    throw new Error(`Unknown algorithm: ${ALGORITHM}. Available: ${available}`);
  }
  detector = d;
  console.log(`\n🎯 Testing with algorithm: ${detector.name}`);
  console.log(`   ${detector.description}\n`);
});

// Increase timeout for audio processing
const TEST_TIMEOUT = 30000;

/**
 * Helper to check if detected BPM is within tolerance
 */
function bpmWithinTolerance(detected: number, expected: number, tolerance: number): boolean {
  return Math.abs(detected - expected) <= tolerance;
}

/**
 * Helper to check if BPM is at an octave (half or double)
 */
function isOctaveOf(detected: number, expected: number, tolerance: number = 2): 'exact' | 'half' | 'double' | 'wrong' {
  if (bpmWithinTolerance(detected, expected, tolerance)) return 'exact';
  if (bpmWithinTolerance(detected, expected / 2, tolerance)) return 'half';
  if (bpmWithinTolerance(detected, expected * 2, tolerance)) return 'double';
  return 'wrong';
}

/**
 * Run a single BPM detection test
 */
async function runBpmTest(testCase: BpmTestCase): Promise<{
  detected: number;
  expected: number;
  error: number;
  passed: boolean;
  octaveStatus: 'exact' | 'half' | 'double' | 'wrong';
  confidence: number;
}> {
  const mockBuffer = generateSyntheticAudio(testCase.config);
  const result = await detector.detect(mockBuffer);
  
  const tolerance = testCase.tolerance ?? 1;
  const detected = result.bpm;
  const error = Math.abs(detected - testCase.expectedBpm);
  const octaveStatus = isOctaveOf(detected, testCase.expectedBpm, tolerance);
  const passed = octaveStatus === 'exact' || 
    (testCase.octaveError === 'half' && octaveStatus === 'half') ||
    (testCase.octaveError === 'double' && octaveStatus === 'double');
  
  return {
    detected,
    expected: testCase.expectedBpm,
    error,
    passed,
    octaveStatus,
    confidence: result.confidence,
  };
}

describe('BPM Detection Benchmark', () => {
  describe('Standard BPM Test Cases', () => {
    for (const testCase of STANDARD_BPM_TEST_CASES) {
      it(`should detect ${testCase.name}`, async () => {
        const result = await runBpmTest(testCase);
        
        expect(
          result.passed,
          `Expected ${testCase.expectedBpm} BPM, got ${result.detected} BPM (error: ${result.error.toFixed(2)}, status: ${result.octaveStatus})`
        ).toBe(true);
      }, TEST_TIMEOUT);
    }
  });

  describe('Octave Ambiguity Test Cases', () => {
    for (const testCase of OCTAVE_AMBIGUITY_TEST_CASES) {
      it(`should correctly resolve octave for ${testCase.name}`, async () => {
        const result = await runBpmTest(testCase);
        
        expect(
          result.octaveStatus,
          `Expected exact match for ${testCase.expectedBpm} BPM, got ${result.detected} BPM (${result.octaveStatus})`
        ).toBe('exact');
      }, TEST_TIMEOUT);
    }
  });

  describe('BPM Range Coverage', () => {
    const ranges = [
      { min: 70, max: 80, name: 'Slow (70-80)' },
      { min: 80, max: 90, name: 'Medium (80-90)' },
      { min: 90, max: 100, name: 'Medium-Fast (90-100)' },
    ];

    for (const range of ranges) {
      it(`should accurately detect BPMs in ${range.name} range`, async () => {
        const testBpms = [
          range.min,
          Math.floor((range.min + range.max) / 2),
          range.max,
        ];
        
        let passCount = 0;
        const errors: string[] = [];
        
        for (const bpm of testBpms) {
          const config: SyntheticAudioConfig = {
            bpm,
            duration: 25,
            type: 'mixed',
            seed: seedFromBpm(bpm),
          };
          
          const mockBuffer = generateSyntheticAudio(config);
          const result = await detector.detect(mockBuffer);
          
          const tolerance = 3;
          const status = isOctaveOf(result.bpm, bpm, tolerance);
          
          if (status === 'exact') {
            passCount++;
          } else {
            errors.push(`${bpm} BPM: detected ${result.bpm.toFixed(1)} (${status})`);
          }
        }
        
        expect(
          passCount >= 2,
          `Only ${passCount}/3 passed in ${range.name} range. Errors: ${errors.join(', ')}`
        ).toBe(true);
      }, TEST_TIMEOUT * 2);
    }
  });

  describe('Precision Tests (Fractional BPMs)', () => {
    const fractionalBpms = [74.3, 82.7, 89.5, 96.8];
    
    for (const bpm of fractionalBpms) {
      it(`should detect ${bpm} BPM with reasonable precision`, async () => {
        const config: SyntheticAudioConfig = {
          bpm,
          duration: 30,
          type: 'mixed',
          seed: seedFromBpm(bpm),
        };
        
        const mockBuffer = generateSyntheticAudio(config);
        const result = await detector.detect(mockBuffer);
        
        const error = Math.abs(result.bpm - bpm);
        expect(
          error <= 2,
          `Expected ${bpm} BPM, got ${result.bpm.toFixed(1)} (error: ${error.toFixed(2)})`
        ).toBe(true);
      }, TEST_TIMEOUT);
    }
  });
});

/**
 * Benchmark suite that runs all tests and produces a summary report
 */
const ALL_TEST_CASES = [...STANDARD_BPM_TEST_CASES, ...OCTAVE_AMBIGUITY_TEST_CASES];

describe('BPM Detection Accuracy Report', () => {
  it('should produce accuracy summary', async () => {
    const results: Array<{
      name: string;
      expected: number;
      detected: number;
      error: number;
      passed: boolean;
      octaveStatus: string;
    }> = [];
    
    for (const testCase of ALL_TEST_CASES) {
      const result = await runBpmTest(testCase);
      results.push({
        name: testCase.name,
        expected: testCase.expectedBpm,
        detected: result.detected,
        error: result.error,
        passed: result.passed,
        octaveStatus: result.octaveStatus,
      });
    }
    
    // Calculate statistics
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const exactMatches = results.filter(r => r.octaveStatus === 'exact').length;
    const octaveErrors = results.filter(r => r.octaveStatus === 'half' || r.octaveStatus === 'double').length;
    const wrongDetections = results.filter(r => r.octaveStatus === 'wrong').length;
    
    const avgError = results.reduce((sum, r) => sum + r.error, 0) / totalTests;
    const maxError = Math.max(...results.map(r => r.error));
    
    // Print report
    console.log('\n' + '='.repeat(60));
    console.log(`BPM DETECTION ACCURACY REPORT (${detector.name})`);
    console.log('='.repeat(60));
    console.log(`Total tests:     ${totalTests}`);
    console.log(`Passed:          ${passedTests} (${(passedTests / totalTests * 100).toFixed(1)}%)`);
    console.log(`Exact matches:   ${exactMatches} (${(exactMatches / totalTests * 100).toFixed(1)}%)`);
    console.log(`Octave errors:   ${octaveErrors} (${(octaveErrors / totalTests * 100).toFixed(1)}%)`);
    console.log(`Wrong:           ${wrongDetections} (${(wrongDetections / totalTests * 100).toFixed(1)}%)`);
    console.log(`Average error:   ${avgError.toFixed(2)} BPM`);
    console.log(`Max error:       ${maxError.toFixed(2)} BPM`);
    console.log('='.repeat(60));
    
    // List failures
    const failures = results.filter(r => !r.passed);
    if (failures.length > 0) {
      console.log('\nFailed tests:');
      for (const f of failures) {
        console.log(`  - ${f.name}: expected ${f.expected}, got ${f.detected} (${f.octaveStatus})`);
      }
    }
    
    console.log('='.repeat(60) + '\n');
    
    // Relaxed accuracy requirement for non-default algorithms
    const minAccuracy = ALGORITHM === 'essentia' ? 0.85 : 0.5;
    expect(passedTests / totalTests).toBeGreaterThanOrEqual(minAccuracy);
  }, TEST_TIMEOUT * ALL_TEST_CASES.length);
});

/**
 * Compare all algorithms (optional test)
 */
describe.skip('Algorithm Comparison', () => {
  it('should compare all algorithms', async () => {
    const detectors = listTempoDetectors();
    const testCases = STANDARD_BPM_TEST_CASES.slice(0, 5); // Quick comparison
    
    console.log('\n' + '='.repeat(70));
    console.log('ALGORITHM COMPARISON');
    console.log('='.repeat(70));
    
    const comparison: Record<string, { passed: number; avgError: number }> = {};
    
    for (const { id } of detectors) {
      const d = getTempoDetector(id)!;
      let passed = 0;
      let totalError = 0;
      
      for (const testCase of testCases) {
        const mockBuffer = generateSyntheticAudio(testCase.config);
        const result = await d.detect(mockBuffer);
        
        const error = Math.abs(result.bpm - testCase.expectedBpm);
        totalError += error;
        
        if (isOctaveOf(result.bpm, testCase.expectedBpm, testCase.tolerance ?? 1) === 'exact') {
          passed++;
        }
      }
      
      comparison[id] = {
        passed,
        avgError: totalError / testCases.length,
      };
    }
    
    // Print comparison
    console.log('\nResults:');
    for (const [id, stats] of Object.entries(comparison)) {
      const d = getTempoDetector(id)!;
      console.log(`  ${d.name}:`);
      console.log(`    Passed: ${stats.passed}/${testCases.length} (${(stats.passed / testCases.length * 100).toFixed(0)}%)`);
      console.log(`    Avg Error: ${stats.avgError.toFixed(2)} BPM`);
    }
    
    console.log('='.repeat(70) + '\n');
  }, TEST_TIMEOUT * 30);
});
