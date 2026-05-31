/**
 * Onset Alignment Scorer Tests
 * 
 * This test suite verifies BPM detection accuracy by measuring how well
 * detected BPM aligns with audio onsets. It serves as a self-contained
 * accuracy verification that doesn't require ground-truth BPM values.
 * 
 * The principle: A correctly detected BPM should have beats that align
 * well with note onsets in the audio. If a different BPM aligns better,
 * our detection may be off.
 */

import { describe, it, expect } from 'vitest';
import { 
  calculateAlignmentScore, 
  analyzeAlignment, 
  formatAlignmentReport
} from './onsetAlignmentScorer';
import { createSeededRandom } from '../../shared/test/deterministicRandom';
import { logVerboseAudit } from '../../shared/test/auditLogging';

describe('Onset Alignment Scorer', () => {
  describe('calculateAlignmentScore', () => {
    it('should score perfectly aligned beats as excellent', () => {
      // Create onsets that perfectly match a 60 BPM grid (1 beat per second)
      const onsets = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const score = calculateAlignmentScore(60, onsets, 0, 10);
      
      expect(score.meanError).toBe(0);
      expect(score.hitRate).toBe(1);
      expect(score.score).toBeLessThan(0.1);
    });
    
    it('should score misaligned BPM poorly', () => {
      // Onsets at 60 BPM, but testing with 65 BPM
      const onsets = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const score60 = calculateAlignmentScore(60, onsets, 0, 10);
      const score65 = calculateAlignmentScore(65, onsets, 0, 10);
      
      // 60 BPM should score much better than 65 BPM
      expect(score60.score).toBeLessThan(score65.score);
      expect(score60.hitRate).toBeGreaterThan(score65.hitRate);
    });
    
    it('should handle sparse onsets gracefully', () => {
      // Only a few onsets
      const onsets = [0, 2, 4, 6, 8, 10];
      const score = calculateAlignmentScore(60, onsets, 0, 10);
      
      // Score should still be computable
      expect(score.score).toBeGreaterThan(0);
      expect(score.hitRate).toBeLessThan(1); // Some beats won't hit
    });
    
    it('should prefer exact BPM over close approximations', () => {
      // Create onsets at exactly 70 BPM
      const beatInterval = 60 / 70;
      const onsets: number[] = [];
      for (let i = 0; i < 50; i++) {
        onsets.push(i * beatInterval);
      }
      
      const score69 = calculateAlignmentScore(69, onsets, 0, 40);
      const score70 = calculateAlignmentScore(70, onsets, 0, 40);
      const score71 = calculateAlignmentScore(71, onsets, 0, 40);
      
      expect(score70.score).toBeLessThan(score69.score);
      expect(score70.score).toBeLessThan(score71.score);
      expect(score70.hitRate).toBe(1);
    });
  });
  
  describe('analyzeAlignment', () => {
    it('should find the correct BPM from onset data', () => {
      // Create onsets at exactly 72 BPM
      const beatInterval = 60 / 72;
      const onsets: number[] = [];
      for (let i = 0; i < 100; i++) {
        onsets.push(i * beatInterval);
      }
      
      // Start with a slightly wrong BPM
      const analysis = analyzeAlignment(onsets, 70, 0, 60, 5, 0.5);
      
      // Should find 72 BPM as best
      expect(analysis.bestBpm).toBeCloseTo(72, 0);
    });
    
    it('should identify when detected BPM is optimal', () => {
      // Create onsets at exactly 100 BPM
      const beatInterval = 60 / 100;
      const onsets: number[] = [];
      for (let i = 0; i < 80; i++) {
        onsets.push(i * beatInterval);
      }
      
      const analysis = analyzeAlignment(onsets, 100, 0, 40, 5, 0.5);
      
      expect(analysis.bestBpm).toBeCloseTo(100, 0);
      expect(analysis.recommendation).toContain('optimal');
    });
  });
  
  describe('formatAlignmentReport', () => {
    it('should produce readable output', () => {
      const beatInterval = 60 / 120;
      const onsets: number[] = [];
      for (let i = 0; i < 60; i++) {
        onsets.push(i * beatInterval);
      }
      
      const analysis = analyzeAlignment(onsets, 120, 0, 30, 3, 1);
      const report = formatAlignmentReport(analysis);
      
      expect(report).toContain('Onset Alignment Analysis');
      expect(report).toContain('BPM');
      expect(report).toContain('Hit Rate');
      expect(report).toContain('Recommendation');
    });
  });
});

/**
 * Integration test using synthetic audio-like data
 * 
 * This simulates what we'd see with real audio:
 * - Onsets don't perfectly align to beats (some are early/late)
 * - Some onsets are sub-beat (8th notes, 16th notes)
 * - Some beats have no onset (rests)
 */
describe('Realistic Onset Patterns', () => {
  it('should handle noisy onset data', () => {
    const rand = createSeededRandom(42);
    // 70 BPM with some timing variation
    const beatInterval = 60 / 70;
    const onsets: number[] = [];
    
    for (let i = 0; i < 50; i++) {
      const variation = (rand() - 0.5) * 0.05;
      onsets.push(i * beatInterval + variation);
      
      if (rand() > 0.5) {
        onsets.push(i * beatInterval + beatInterval / 2 + variation);
      }
    }
    
    onsets.sort((a, b) => a - b);
    
    const analysis = analyzeAlignment(onsets, 70, 0, 40, 3, 0.5);
    
    // Should still identify 70 BPM as best or very close
    expect(Math.abs(analysis.bestBpm - 70)).toBeLessThan(1);
  });
  
  it('should detect fractional BPM when appropriate', () => {
    // Create onsets at 69.5 BPM (fractional)
    const beatInterval = 60 / 69.5;
    const onsets: number[] = [];
    
    for (let i = 0; i < 100; i++) {
      onsets.push(i * beatInterval);
    }
    
    // Test with detected BPM of 70
    const analysis = analyzeAlignment(onsets, 70, 0, 80, 3, 0.1);
    
    // Should find 69.5 as better than 70
    expect(analysis.bestBpm).toBeCloseTo(69.5, 0.5);
  });
});

/**
 * Test case data that mirrors real songs
 * These use the onset patterns we'd expect from actual music analysis
 */
describe('Song-like Patterns', () => {
  it('should handle "Wish My Life Away" style pattern (slow ballad)', () => {
    const rand = createSeededRandom(69);
    const bpm = 69.8;
    const beatInterval = 60 / bpm;
    const onsets: number[] = [];
    
    for (let measure = 0; measure < 20; measure++) {
      const measureStart = measure * 4 * beatInterval;
      
      onsets.push(measureStart);
      
      if (rand() > 0.2) {
        onsets.push(measureStart + beatInterval);
      }
      
      if (rand() > 0.7) {
        onsets.push(measureStart + beatInterval * 1.5);
      }
      
      if (rand() > 0.2) {
        onsets.push(measureStart + beatInterval * 2);
      }
      
      if (rand() > 0.3) {
        onsets.push(measureStart + beatInterval * 3);
      }
    }
    
    onsets.sort((a, b) => a - b);
    
    const analysis = analyzeAlignment(onsets, 69.2, 0, 60, 3, 0.2);
    
    logVerboseAudit('\n--- Simulated "Wish My Life Away" Pattern ---');
    logVerboseAudit(formatAlignmentReport(analysis));
    
    expect(Math.abs(analysis.bestBpm - bpm)).toBeLessThan(0.5);
  });
  
  it('should handle "Let It Go" style pattern (upbeat)', () => {
    const rand = createSeededRandom(137);
    const bpm = 137;
    const beatInterval = 60 / bpm;
    const onsets: number[] = [];
    
    for (let measure = 0; measure < 30; measure++) {
      const measureStart = measure * 4 * beatInterval;
      
      for (let beat = 0; beat < 4; beat++) {
        onsets.push(measureStart + beat * beatInterval);
        
        if (rand() > 0.4) {
          onsets.push(measureStart + beat * beatInterval + beatInterval / 2);
        }
      }
    }
    
    onsets.sort((a, b) => a - b);
    
    const analysis = analyzeAlignment(onsets, 137, 0, 50, 5, 0.5);
    
    logVerboseAudit('\n--- Simulated "Let It Go" Pattern ---');
    logVerboseAudit(formatAlignmentReport(analysis));
    
    expect(Math.abs(analysis.bestBpm - 137)).toBeLessThan(1);
  });
});
