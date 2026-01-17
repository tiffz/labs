/**
 * Sectional Tempo Analyzer
 * 
 * Analyzes tempo variations across different sections of a song.
 * This helps diagnose whether:
 * 1. The song has a constant tempo (and we're detecting wrong BPM)
 * 2. The song has variable tempo (musicians speed up/slow down)
 * 3. The song has distinct tempo changes at specific points
 */

import { analyzeSectionTempoWindows } from './analysis/sectionalTempo';

export interface SectionTempo {
  startTime: number;
  endTime: number;
  estimatedBpm: number;
  confidence: number;
  meanIoi: number; // Mean inter-onset interval
  ioiStdDev: number; // Standard deviation of IOIs
  onsetCount: number;
}

export interface TempoVariationReport {
  globalBpm: number;
  sections: SectionTempo[];
  hasVariableTempo: boolean;
  tempoRange: { min: number; max: number };
  variationPercent: number; // How much the tempo varies
  recommendation: string;
  detailedAnalysis: string;
}

/**
 * Analyze tempo variations across sections of the song.
 * 
 * @param onsets - Detected onset times in seconds
 * @param duration - Total audio duration
 * @param globalBpm - The initially detected global BPM
 * @param sectionDuration - How long each section should be (default 15s)
 */
export function analyzeTempoVariation(
  onsets: number[],
  duration: number,
  globalBpm: number,
  sectionDuration: number = 15
): TempoVariationReport {
  const sections = analyzeSectionTempoWindows(onsets, duration, globalBpm, sectionDuration);
  
  // Analyze tempo variation across sections
  if (sections.length === 0) {
    return {
      globalBpm,
      sections: [],
      hasVariableTempo: false,
      tempoRange: { min: globalBpm, max: globalBpm },
      variationPercent: 0,
      recommendation: 'Not enough data for sectional analysis.',
      detailedAnalysis: 'Insufficient onsets detected for meaningful tempo analysis.',
    };
  }
  
  // Calculate tempo statistics using robust measures (exclude outliers)
  const bpms = sections.map(s => s.estimatedBpm);
  const sortedBpms = [...bpms].sort((a, b) => a - b);
  
  // Use interquartile range to exclude outliers
  const q1Idx = Math.floor(sortedBpms.length * 0.25);
  const q3Idx = Math.floor(sortedBpms.length * 0.75);
  const filteredBpms = sortedBpms.slice(q1Idx, q3Idx + 1);
  
  // If we filtered too much, use all values
  const analysisData = filteredBpms.length >= 3 ? filteredBpms : sortedBpms;
  
  const minBpm = Math.min(...analysisData);
  const maxBpm = Math.max(...analysisData);
  const avgBpm = analysisData.reduce((a, b) => a + b, 0) / analysisData.length;
  const variationPercent = ((maxBpm - minBpm) / avgBpm) * 100;
  
  // Determine if tempo is variable
  // More than 2% variation is likely intentional tempo changes
  // 1-2% could be measurement noise
  const hasVariableTempo = variationPercent > 2;
  
  // Build detailed analysis
  const detailedAnalysis = buildDetailedAnalysis(sections, globalBpm, variationPercent);
  
  // Build recommendation
  let recommendation: string;
  if (variationPercent < 1) {
    recommendation = `Tempo is stable (±${variationPercent.toFixed(1)}%). The detected BPM of ${globalBpm.toFixed(2)} should work well. If drift occurs, the BPM might need fine-tuning by ±0.5.`;
  } else if (variationPercent < 2) {
    recommendation = `Tempo has minor variation (±${variationPercent.toFixed(1)}%). This is typical for human performances. A single BPM should still work reasonably well.`;
  } else if (variationPercent < 4) {
    recommendation = `Tempo has moderate variation (±${variationPercent.toFixed(1)}%). The song may intentionally speed up/slow down in different sections. Consider using section-specific BPMs or enabling tempo tracking.`;
  } else {
    recommendation = `Tempo varies significantly (±${variationPercent.toFixed(1)}%). This song likely has intentional tempo changes. A single BPM will not work - tempo mapping is recommended.`;
  }
  
  return {
    globalBpm,
    sections,
    hasVariableTempo,
    tempoRange: { min: Math.round(minBpm * 100) / 100, max: Math.round(maxBpm * 100) / 100 },
    variationPercent: Math.round(variationPercent * 100) / 100,
    recommendation,
    detailedAnalysis,
  };
}

// Sectional tempo windowing lives in utils/analysis/sectionalTempo.ts

/**
 * Build a detailed human-readable analysis of tempo variation.
 */
function buildDetailedAnalysis(
  sections: SectionTempo[],
  globalBpm: number,
  variationPercent: number
): string {
  const lines: string[] = [];
  
  lines.push(`=== Sectional Tempo Analysis ===`);
  lines.push(`Global detected BPM: ${globalBpm.toFixed(2)}`);
  lines.push(`Tempo variation: ±${variationPercent.toFixed(1)}%`);
  lines.push(``);
  lines.push(`Section-by-section breakdown:`);
  lines.push(`─────────────────────────────────────────────────────`);
  lines.push(`Time Range      Est. BPM    Diff      IOI StdDev`);
  lines.push(`─────────────────────────────────────────────────────`);
  
  for (const section of sections) {
    const timeRange = `${formatTime(section.startTime)}-${formatTime(section.endTime)}`;
    const diff = section.estimatedBpm - globalBpm;
    const diffStr = diff >= 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2);
    const stdDevMs = (section.ioiStdDev * 1000).toFixed(0);
    
    lines.push(
      `${timeRange.padEnd(16)}${section.estimatedBpm.toFixed(2).padStart(8)}  ${diffStr.padStart(8)}    ${stdDevMs.padStart(6)}ms`
    );
  }
  
  lines.push(`─────────────────────────────────────────────────────`);
  
  // Identify trends
  if (sections.length >= 4) {
    const firstHalf = sections.slice(0, Math.floor(sections.length / 2));
    const secondHalf = sections.slice(Math.floor(sections.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b.estimatedBpm, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b.estimatedBpm, 0) / secondHalf.length;
    
    const trend = secondAvg - firstAvg;
    if (Math.abs(trend) > 0.5) {
      if (trend > 0) {
        lines.push(`\nTrend: Song SPEEDS UP over time (~${trend.toFixed(2)} BPM from start to end)`);
      } else {
        lines.push(`\nTrend: Song SLOWS DOWN over time (~${Math.abs(trend).toFixed(2)} BPM from start to end)`);
      }
    } else {
      lines.push(`\nTrend: Tempo remains relatively stable throughout`);
    }
  }
  
  return lines.join('\n');
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Export the onset detection function for use in analysis
 */
export { analyzeTempoVariation as default };
