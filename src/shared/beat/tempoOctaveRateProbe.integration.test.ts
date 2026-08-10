import { describe, expect, it } from 'vitest';
import {
  generateSyntheticAudio,
  OCTAVE_AND_RATE_PROBE_CASES,
} from './regression/syntheticAudioGenerator';
import { getTempoDetector } from './regression/tempoDetectorInterface';
// Side-effect import: registers the detectors into the registry.
import './regression/tempoDetectors';
import { summarizeTempoEval, type TempoEvalCase } from './tempoEvalMetrics';

/**
 * Probe, not gate.
 *
 * The committed tempo fixtures span 70-102 BPM — a 1.46:1 range, narrower than one octave — and
 * every one is generated at 44100 Hz. Both facts were verified. The consequence is that the suite
 * is structurally blind to the two failure modes that actually matter in production:
 *
 *   - octave (half/double) errors, which need fixtures on both sides of a folding boundary
 *   - sample-rate handling, where 44100 is the exact rate at which a real 8%-flat decode bug cancels
 *
 * Measured against the owner's own hand-tapped tempos, real-world Accuracy1 is 16.7% while the
 * synthetic suite demands >= 85% and passes. That gap is the whole problem.
 *
 * This file reports the numbers rather than asserting a threshold, because a threshold picked
 * before any measurement exists is a guess, and a failing new gate would just get muted. Its
 * assertions cover only what must be TRUE regardless of detector quality: the probe runs, produces
 * finite tempos, and does not regress into returning the 120 BPM fallback. Once two clean runs
 * exist, the per-category numbers here become the ratchet baseline.
 */

const TIMEOUT_MS = 30_000;
const RUN = process.env.RUN_INTEGRATION_TESTS === 'true';

describe.runIf(RUN)('tempo probe: octave range and sample rate', () => {
  it(
    'reports accuracy across octave-spanning and non-44.1kHz fixtures',
    async () => {
      // Same seam the benchmark uses, so the probe measures the shipped detector.
      const detector = getTempoDetector(process.env.TEMPO_ALGORITHM || 'essentia');
      expect(detector, 'tempo detector not registered').toBeTruthy();

      const cases: TempoEvalCase[] = [];

      // 44.1 kHz cases only. Non-44.1 buffers are asserted separately below: production routes
      // them through `toBeatAnalysisBuffer` first, and handing a raw 48 kHz buffer to the detector
      // SHOULD throw. That guard is the fix for the 8%-flat bug, so exercising it is real coverage.
      const rateNative = OCTAVE_AND_RATE_PROBE_CASES.filter(
        (c) => (c.config.sampleRate ?? 44100) === 44100,
      );

      for (const testCase of rateNative) {
        const mockBuffer = generateSyntheticAudio(testCase.config);
        const result = await detector!.detect(mockBuffer);
        cases.push({
          label: `${testCase.id} (${testCase.config.sampleRate ?? 44100}Hz)`,
          detectedBpm: result.bpm,
          groundTruthBpm: testCase.expectedBpm,
        });
      }

      const summary = summarizeTempoEval(cases);

      // Printed so a detector change shows its effect immediately, and so the per-case rows are
      // available when one of these becomes a real regression.
      console.log(
        [
          '',
          '=== tempo probe: octave range + sample rate ===',
          `Accuracy1 ${summary.accuracy1Count}/${summary.total}  Accuracy2 ${summary.accuracy2Count}/${summary.total}  octave-only ${summary.octaveOnlyCount}`,
          ...summary.rows.map(
            (r) =>
              `  ${r.accuracy1 ? 'OK  ' : r.accuracy2 ? `OCT×${r.matchedMultiple}` : 'MISS'}  ` +
              `${r.detectedBpm.toFixed(1)} vs ${r.groundTruthBpm} (${(r.relativeError * 100).toFixed(1)}%)  ${r.label}`,
          ),
          '',
        ].join('\n'),
      );

      // Invariants that hold whatever the accuracy is.
      expect(summary.total).toBe(rateNative.length);
      for (const row of summary.rows) {
        expect(Number.isFinite(row.detectedBpm), `${row.label} produced a non-finite BPM`).toBe(
          true,
        );
        expect(row.detectedBpm, `${row.label} produced a non-positive BPM`).toBeGreaterThan(0);
      }

      // 120 is `detectTempoEnsemble`'s "everything failed" fallback. Returning it for EVERY probe
      // would mean the detector silently stopped working — distinct from being inaccurate.
      const allFallback = summary.rows.every((r) => Math.abs(r.detectedBpm - 120) < 0.01);
      expect(allFallback, 'every probe returned the 120 BPM failure fallback').toBe(false);
    },
    TIMEOUT_MS * OCTAVE_AND_RATE_PROBE_CASES.length,
  );

  it(
    'refuses to analyse audio that is not at the rate Essentia assumes',
    async () => {
      // Essentia's rhythm algorithms have no sampleRate parameter — 44100 is baked in. Handing
      // them 48 kHz audio silently yields every tempo ~8% flat (48000/44100 = 1.0884), which
      // shipped and made detection wrong on every 48 kHz source while the suite stayed green.
      // Fail-closed is the fix; this proves the guard is still armed at each off-nominal rate.
      const detector = getTempoDetector(process.env.TEMPO_ALGORITHM || 'essentia');
      const offRate = OCTAVE_AND_RATE_PROBE_CASES.filter(
        (c) => (c.config.sampleRate ?? 44100) !== 44100,
      );
      expect(offRate.length, 'no off-rate fixtures to probe').toBeGreaterThan(0);

      for (const testCase of offRate) {
        const mockBuffer = generateSyntheticAudio(testCase.config);
        await expect(
          detector!.detect(mockBuffer),
          `${testCase.id} at ${testCase.config.sampleRate}Hz was analysed instead of rejected`,
        ).rejects.toThrow(/44100 Hz/);
      }
    },
    TIMEOUT_MS,
  );
});
