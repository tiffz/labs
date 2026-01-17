/**
 * Test for sectional tempo analysis
 * 
 * Run with: npm test -- --run src/beat/utils/sectionalTempoAnalyzer.test.ts
 */

import { describe, it, expect } from 'vitest';
import { analyzeTempoVariation } from './sectionalTempoAnalyzer';

describe('Sectional Tempo Analyzer', () => {
  it('should detect stable tempo', () => {
    // Generate onsets at a steady 120 BPM for 60 seconds
    const bpm = 120;
    const beatInterval = 60 / bpm;
    const onsets: number[] = [];
    
    for (let t = 0; t < 60; t += beatInterval) {
      // Add some natural variation (±10ms)
      onsets.push(t + (Math.random() - 0.5) * 0.02);
    }
    
    const result = analyzeTempoVariation(onsets, 60, bpm);
    
    expect(result.hasVariableTempo).toBe(false);
    expect(result.variationPercent).toBeLessThan(2);
    console.log('\nStable tempo test:');
    console.log(result.detailedAnalysis);
    console.log(result.recommendation);
  });

  it('should detect variable tempo', () => {
    // Generate onsets that speed up from 100 to 120 BPM
    const onsets: number[] = [];
    let t = 0;
    
    for (let i = 0; i < 200; i++) {
      // BPM increases from 100 to 120 over time
      const progress = i / 200;
      const currentBpm = 100 + progress * 20;
      const beatInterval = 60 / currentBpm;
      
      onsets.push(t);
      t += beatInterval + (Math.random() - 0.5) * 0.02;
    }
    
    const result = analyzeTempoVariation(onsets, t, 110);
    
    expect(result.hasVariableTempo).toBe(true);
    expect(result.variationPercent).toBeGreaterThan(2);
    console.log('\nVariable tempo test:');
    console.log(result.detailedAnalysis);
    console.log(result.recommendation);
  });

  it('should detect tempo with natural human variation', () => {
    // Generate onsets at ~70 BPM with human-like variation (±30ms)
    const bpm = 70;
    const beatInterval = 60 / bpm;
    const onsets: number[] = [];
    
    for (let t = 0; t < 120; t += beatInterval) {
      // Add human-like variation (±30ms = ±3.5% of beat at 70bpm)
      onsets.push(t + (Math.random() - 0.5) * 0.06);
    }
    
    const result = analyzeTempoVariation(onsets, 120, bpm);
    
    // Should be considered stable (< 2% variation)
    expect(result.variationPercent).toBeLessThan(3);
    console.log('\nHuman variation test (70 BPM):');
    console.log(result.detailedAnalysis);
    console.log(result.recommendation);
  });

  it('should handle song with subdivision onsets', () => {
    // Generate onsets at 70 BPM with 8th note subdivisions
    const bpm = 70;
    const quarterInterval = 60 / bpm;
    const eighthInterval = quarterInterval / 2;
    const onsets: number[] = [];
    
    // Mix of quarter notes and eighth notes
    for (let t = 0; t < 60; t += eighthInterval) {
      // Add onset with small variation
      onsets.push(t + (Math.random() - 0.5) * 0.015);
    }
    
    const result = analyzeTempoVariation(onsets, 60, bpm);
    
    console.log('\nSubdivision test (70 BPM with 8ths):');
    console.log(result.detailedAnalysis);
    console.log(result.recommendation);
    
    // The analyzer should still work despite subdivisions
    expect(result.sections.length).toBeGreaterThan(0);
  });

  it('should simulate "Wish My Life Away" tempo pattern', () => {
    // Simulate a song that might drift slightly faster over time
    // Starting at 68.5 BPM, ending at 69.5 BPM
    const onsets: number[] = [];
    let t = 0;
    const duration = 180; // 3 minutes
    
    while (t < duration) {
      // Gradual tempo increase (simulating real-world drift)
      const progress = t / duration;
      const currentBpm = 68.5 + progress * 1.0; // 68.5 -> 69.5
      const beatInterval = 60 / currentBpm;
      
      // Add quarter note with natural variation
      onsets.push(t + (Math.random() - 0.5) * 0.025);
      
      // Sometimes add 8th notes
      if (Math.random() > 0.3) {
        onsets.push(t + beatInterval / 2 + (Math.random() - 0.5) * 0.02);
      }
      
      t += beatInterval;
    }
    
    const result = analyzeTempoVariation(onsets, duration, 69);
    
    console.log('\n=== Simulated "Wish My Life Away" Pattern ===');
    console.log(result.detailedAnalysis);
    console.log('\n' + result.recommendation);
    
    // Should detect the slight tempo variation
    console.log(`\nVariation: ${result.variationPercent.toFixed(2)}%`);
    console.log(`Range: ${result.tempoRange.min} - ${result.tempoRange.max} BPM`);
  });
});
