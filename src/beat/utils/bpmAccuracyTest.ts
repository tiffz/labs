/**
 * BPM Accuracy Test
 * 
 * Tests our BPM detection accuracy by comparing detected BPM against
 * onset alignment scores. This is a self-contained test that doesn't
 * require ground-truth BPM values.
 * 
 * Usage:
 *   - Import and call testBpmAccuracy with an AudioBuffer
 *   - Or run via browser console for interactive testing
 *   
 * The test detects onsets from the audio, then scores how well
 * different BPM values align with those onsets. If a significantly
 * different BPM scores better than our detected BPM, it suggests
 * our detection could be improved.
 */

import { detectTempoEnsemble } from './tempoEnsemble';
import { 
  analyzeAlignment, 
  formatAlignmentReport, 
  type AlignmentAnalysis,
  calculateAlignmentScore,
  type AlignmentScore,
  detectAlignmentOnsets
} from './onsetAlignmentScorer';

export interface BpmAccuracyResult {
  /** The BPM detected by our algorithm */
  detectedBpm: number;
  /** Detection confidence */
  confidence: number;
  /** Onset alignment analysis */
  alignment: AlignmentAnalysis;
  /** Is our detected BPM optimal according to onset alignment? */
  isOptimal: boolean;
  /** Suggested BPM if different from detected */
  suggestedBpm: number;
  /** Human-readable summary */
  summary: string;
}

// Onset detection is shared via utils/analysis/onsets.ts through detectAlignmentOnsets

/**
 * Test BPM detection accuracy for an audio buffer
 * 
 * @param audioBuffer - The audio to analyze
 * @param skipFermatas - Time ranges to skip (fermatas/gaps) as [start, end] pairs
 * @param preDetectedOnsets - Optional pre-detected onsets to use instead of re-detecting
 */
export async function testBpmAccuracy(
  audioBuffer: AudioBuffer,
  skipFermatas?: Array<[number, number]>,
  preDetectedOnsets?: number[]
): Promise<BpmAccuracyResult> {
  // Step 1: Run our BPM detection
  const tempoResult = await detectTempoEnsemble(audioBuffer);
  const detectedBpm = tempoResult.consensusBpm;
  const confidence = tempoResult.confidence;
  
  // Step 2: Use pre-detected onsets or detect our own
  const allOnsets = preDetectedOnsets ?? detectAlignmentOnsets(audioBuffer, {
    preset: 'accuracy',
    skipRanges: skipFermatas,
  });
  
  // Onsets are already filtered via detectAlignmentOnsets when skip ranges are provided
  const onsets = allOnsets;
  
  // Step 3: Determine analysis region
  // Skip first 2 seconds (often has intro noise) and analyze until near end
  const analysisStart = 2;
  const analysisEnd = Math.min(audioBuffer.duration - 2, 120); // Max 2 minutes for efficiency
  
  // Filter onsets to analysis region
  const analysisOnsets = onsets.filter(o => o >= analysisStart && o <= analysisEnd);
  
  if (analysisOnsets.length < 20) {
    return {
      detectedBpm,
      confidence,
      alignment: {
        onsets: analysisOnsets,
        duration: analysisEnd - analysisStart,
        detectedBpm,
        scores: [],
        bestBpm: detectedBpm,
        recommendation: 'Not enough onsets for reliable alignment analysis',
      },
      isOptimal: true,
      suggestedBpm: detectedBpm,
      summary: `Detected ${detectedBpm} BPM (insufficient onsets for verification)`,
    };
  }
  
  // Step 4: Run alignment analysis
  // Test BPMs in range around detected value
  const alignment = analyzeAlignment(
    analysisOnsets,
    detectedBpm,
    analysisStart,
    analysisEnd,
    5,    // ±5 BPM range
    0.2   // 0.2 BPM step for fine resolution
  );
  
  // Step 5: Determine if our detection is optimal
  const bpmDiff = Math.abs(alignment.bestBpm - detectedBpm);
  const isOptimal = bpmDiff < 0.5;
  const suggestedBpm = alignment.bestBpm;
  
  // Step 6: Generate summary
  let summary: string;
  const detectedScore = alignment.scores.find(s => Math.abs(s.bpm - detectedBpm) < 0.15);
  const bestScore = alignment.scores[0];
  
  if (isOptimal) {
    summary = `✓ Detected BPM (${detectedBpm}) is optimal. ` +
      `Hit rate: ${(bestScore.hitRate * 100).toFixed(1)}%, ` +
      `Mean error: ${(bestScore.meanError * 1000).toFixed(1)}ms`;
  } else {
    const improvement = detectedScore 
      ? ((detectedScore.hitRate - bestScore.hitRate) / bestScore.hitRate * -100).toFixed(1)
      : 'N/A';
    summary = `⚠ Better BPM found: ${suggestedBpm.toFixed(1)} (vs detected ${detectedBpm}). ` +
      `Hit rate improvement: ${improvement}%`;
  }
  
  return {
    detectedBpm,
    confidence,
    alignment,
    isOptimal,
    suggestedBpm,
    summary,
  };
}

/**
 * Test multiple BPM values and return detailed comparison
 * Useful for debugging which BPM best matches the audio
 */
export function compareBpms(
  onsets: number[],
  bpmCandidates: number[],
  startTime: number,
  endTime: number
): AlignmentScore[] {
  return bpmCandidates
    .map(bpm => calculateAlignmentScore(bpm, onsets, startTime, endTime))
    .sort((a, b) => a.score - b.score);
}

/**
 * Quick test for "Wish My Life Away" style analysis
 * Tests specific BPMs: 68, 68.5, 69, 69.2, 69.5, 70, 70.5, 71
 */
export function testWishMyLifeAwayBpms(
  onsets: number[],
  startTime: number = 17, // After first fermata
  endTime: number = 100   // Before middle fermatas
): AlignmentScore[] {
  const candidates = [68, 68.5, 69, 69.2, 69.5, 70, 70.5, 71];
  return compareBpms(onsets, candidates, startTime, endTime);
}

/**
 * Quick BPM accuracy test that skips redundant tempo detection
 * 
 * This is faster than testBpmAccuracy because it uses pre-computed
 * BPM and confidence values instead of re-running tempo detection.
 * 
 * @param audioBuffer - The audio to analyze
 * @param detectedBpm - Pre-computed BPM from main analysis
 * @param confidence - Pre-computed confidence from main analysis
 * @param skipFermatas - Time ranges to skip (fermatas/gaps)
 */
export async function runQuickBpmAccuracyTest(
  audioBuffer: AudioBuffer,
  detectedBpm: number,
  confidence: number,
  skipFermatas?: Array<[number, number]>
): Promise<BpmAccuracyResult> {
  // Detect onsets (this is the main work)
  const allOnsets = detectAlignmentOnsets(audioBuffer, {
    preset: 'accuracy',
    skipRanges: skipFermatas,
  });
  
  // Onsets are already filtered via detectAlignmentOnsets when skip ranges are provided
  const onsets = allOnsets;
  
  // Analysis region
  const analysisStart = 2;
  const analysisEnd = Math.min(audioBuffer.duration - 2, 120);
  const analysisOnsets = onsets.filter(o => o >= analysisStart && o <= analysisEnd);
  
  if (analysisOnsets.length < 20) {
    return {
      detectedBpm,
      confidence,
      alignment: {
        onsets: analysisOnsets,
        duration: analysisEnd - analysisStart,
        detectedBpm,
        scores: [],
        bestBpm: detectedBpm,
        recommendation: 'Not enough onsets for reliable alignment analysis',
      },
      isOptimal: true,
      suggestedBpm: detectedBpm,
      summary: `Detected ${detectedBpm} BPM (insufficient onsets for verification)`,
    };
  }
  
  // Run alignment analysis with narrower range for speed
  const alignment = analyzeAlignment(
    analysisOnsets,
    detectedBpm,
    analysisStart,
    analysisEnd,
    3,    // ±3 BPM range (narrower for speed)
    0.2   // 0.2 BPM step
  );
  
  const bpmDiff = Math.abs(alignment.bestBpm - detectedBpm);
  const isOptimal = bpmDiff < 0.5;
  const suggestedBpm = alignment.bestBpm;
  
  // Generate summary
  let summary: string;
  const detectedScore = alignment.scores.find(s => Math.abs(s.bpm - detectedBpm) < 0.15);
  const bestScore = alignment.scores[0];
  
  if (isOptimal) {
    summary = `✓ Detected BPM (${detectedBpm}) is optimal. ` +
      `Hit rate: ${(bestScore.hitRate * 100).toFixed(1)}%`;
  } else {
    const improvement = detectedScore 
      ? ((bestScore.hitRate - detectedScore.hitRate) * 100).toFixed(1)
      : 'N/A';
    summary = `⚠ Better BPM: ${suggestedBpm.toFixed(1)} (+${improvement}% hits)`;
  }
  
  return {
    detectedBpm,
    confidence,
    alignment,
    isOptimal,
    suggestedBpm,
    summary,
  };
}

/**
 * Format test results for console output
 */
export function formatBpmAccuracyReport(result: BpmAccuracyResult): string {
  const lines: string[] = [
    '╔════════════════════════════════════════════════════════════╗',
    '║               BPM ACCURACY TEST RESULTS                    ║',
    '╠════════════════════════════════════════════════════════════╣',
    `║ Detected BPM:     ${result.detectedBpm.toFixed(1).padStart(6)}                                ║`,
    `║ Confidence:       ${(result.confidence * 100).toFixed(0).padStart(5)}%                                ║`,
    `║ Best Aligned BPM: ${result.suggestedBpm.toFixed(1).padStart(6)}                                ║`,
    `║ Status:           ${result.isOptimal ? '✓ OPTIMAL' : '⚠ IMPROVABLE'}                        ║`,
    '╠════════════════════════════════════════════════════════════╣',
    `║ ${result.summary.substring(0, 58).padEnd(58)} ║`,
    '╚════════════════════════════════════════════════════════════╝',
    '',
    formatAlignmentReport(result.alignment),
  ];
  
  return lines.join('\n');
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).testBpmAccuracy = testBpmAccuracy;
  (window as unknown as Record<string, unknown>).formatBpmAccuracyReport = formatBpmAccuracyReport;
}
