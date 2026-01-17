/**
 * Shared sectional tempo analysis utilities.
 */

export interface SectionTempoWindow {
  startTime: number;
  endTime: number;
  estimatedBpm: number;
  confidence: number;
  meanIoi: number;
  ioiStdDev: number;
  onsetCount: number;
}

/**
 * Analyze tempo variations across overlapping windows.
 */
export function analyzeSectionTempoWindows(
  onsets: number[],
  duration: number,
  globalBpm: number,
  sectionDuration: number = 15
): SectionTempoWindow[] {
  const sortedOnsets = [...onsets].sort((a, b) => a - b);
  const sections: SectionTempoWindow[] = [];

  const windowSize = sectionDuration;
  const hopSize = windowSize / 2;

  for (let startTime = 0; startTime < duration - windowSize / 2; startTime += hopSize) {
    const endTime = Math.min(startTime + windowSize, duration);
    const sectionOnsets = sortedOnsets.filter(t => t >= startTime && t < endTime);

    if (sectionOnsets.length < 8) {
      continue;
    }

    const iois: number[] = [];
    for (let i = 1; i < sectionOnsets.length; i++) {
      const ioi = sectionOnsets[i] - sectionOnsets[i - 1];
      if (ioi >= 0.3 && ioi <= 1.5) {
        iois.push(ioi);
      }
    }

    if (iois.length < 4) continue;

    const { dominantIoi, confidence } = findDominantIoi(iois, globalBpm);

    const meanIoi = iois.reduce((a, b) => a + b, 0) / iois.length;
    const variance = iois.reduce((sum, ioi) => sum + Math.pow(ioi - meanIoi, 2), 0) / iois.length;
    const ioiStdDev = Math.sqrt(variance);

    const estimatedBpm = dominantIoi > 0 ? 60 / dominantIoi : globalBpm;

    sections.push({
      startTime,
      endTime,
      estimatedBpm: Math.round(estimatedBpm * 100) / 100,
      confidence,
      meanIoi: Math.round(meanIoi * 1000) / 1000,
      ioiStdDev: Math.round(ioiStdDev * 1000) / 1000,
      onsetCount: sectionOnsets.length,
    });
  }

  return sections;
}

/**
 * Find the dominant inter-onset interval using histogram binning.
 * Prefers quarter-note intervals over subdivisions.
 */
function findDominantIoi(
  iois: number[],
  globalBpm: number
): { dominantIoi: number; confidence: number } {
  const expectedIoi = 60 / globalBpm;

  const candidates = [
    { ioi: expectedIoi / 2, label: 'eighth', weight: 0.3 },
    { ioi: expectedIoi, label: 'quarter', weight: 1.0 },
    { ioi: expectedIoi * 2, label: 'half', weight: 0.7 },
  ];

  const results = candidates.map(candidate => {
    const tolerance = candidate.ioi * 0.2;
    const matches = iois.filter(ioi => Math.abs(ioi - candidate.ioi) < tolerance);

    const weightedScore = matches.length * candidate.weight;
    const refinedIoi = matches.length > 0
      ? matches.reduce((a, b) => a + b, 0) / matches.length
      : candidate.ioi;

    return {
      ioi: candidate.ioi,
      label: candidate.label,
      count: matches.length,
      weightedScore,
      refinedIoi,
    };
  });

  const best = results.reduce((a, b) => a.weightedScore > b.weightedScore ? a : b);

  let finalIoi = best.refinedIoi;
  if (best.label === 'eighth') {
    finalIoi = best.refinedIoi * 2;
  } else if (best.label === 'half') {
    finalIoi = best.refinedIoi / 2;
  }

  const quarterResult = results.find(r => r.label === 'quarter');
  const quarterRatio = quarterResult ? quarterResult.count / iois.length : 0;

  return {
    dominantIoi: finalIoi,
    confidence: Math.min(1, quarterRatio * 2),
  };
}
