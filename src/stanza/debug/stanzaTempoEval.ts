import { stanzaDb, type StanzaSong } from '../db/stanzaDb';
import { toBeatAnalysisBuffer } from '../../shared/beat/decodeMediaForBeat';
import { detectTempoEnsemble } from '../../shared/beat/tempoEnsemble';
import {
  formatTempoEvalReport,
  summarizeTempoEval,
  type TempoEvalCase,
  type TempoEvalSummary,
} from '../../shared/beat/tempoEvalMetrics';

/**
 * Score tempo detection against the owner's OWN tapped tempos.
 *
 * The repo's tempo fixtures are synthetic and every one is generated at exactly 44100 Hz — the one
 * sample rate at which the decode bug that made every reading ~8% flat cancels out. So the suite
 * stayed green while detection was visibly wrong on real songs. Synthetic click tracks also lack
 * the things that actually break beat trackers: syncopation, swing, rubato, dense mixes, quiet
 * intros.
 *
 * The library already holds better ground truth than anything we could commit: songs where the
 * user TAPPED the tempo by hand. Real audio, human-labelled, already on the device — and no
 * copyrighted audio has to enter the repo.
 *
 * Only `source: 'tap'` counts. A calibration with `source: 'analysis'` was written by the detector
 * itself, so scoring against it would be circular — the exact defect that made the old
 * `bpmAccuracyTest.ts` unable to fail.
 */

/**
 * Decode raw bytes to PCM. One AudioContext per call, closed in `finally` — browsers cap contexts
 * per document and then throw, and this loop runs once per song in the library.
 */
async function decodeBlob(blob: Blob): Promise<AudioBuffer> {
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) throw new Error('Web Audio is unavailable in this browser.');
  const ctx = new Ctor();
  try {
    return await ctx.decodeAudioData(await blob.arrayBuffer());
  } finally {
    void ctx.close();
  }
}

export type StanzaTempoEvalOptions = {
  /** Called per song so a long run can report progress. */
  onProgress?: (done: number, total: number, title: string) => void;
  /** Cap the run; decoding + analysis is seconds per song. */
  limit?: number;
};

export type StanzaTempoEvalResult = {
  summary: TempoEvalSummary;
  report: string;
  /** Songs with a tapped tempo but no local bytes to analyze. */
  skippedNoAudio: string[];
  errors: { title: string; message: string }[];
};

/** Tapped whole-song tempo, or null when this row cannot serve as ground truth. */
export function tappedGroundTruthBpm(song: StanzaSong): number | null {
  const cal = song.metronomeSongCalibration;
  if (!cal || cal.source !== 'tap') return null;
  if (!Number.isFinite(cal.bpm) || cal.bpm <= 0) return null;
  return cal.bpm;
}

export function collectStanzaTempoGroundTruth(rows: readonly StanzaSong[]): StanzaSong[] {
  return rows.filter((row) => tappedGroundTruthBpm(row) != null);
}

export async function runStanzaTempoEval(
  options: StanzaTempoEvalOptions = {},
): Promise<StanzaTempoEvalResult> {
  const all = await stanzaDb.songs.toArray();
  const groundTruth = collectStanzaTempoGroundTruth(all);
  const candidates =
    options.limit != null ? groundTruth.slice(0, options.limit) : groundTruth;

  const cases: TempoEvalCase[] = [];
  const skippedNoAudio: string[] = [];
  const errors: { title: string; message: string }[] = [];

  let done = 0;
  for (const song of candidates) {
    done += 1;
    options.onProgress?.(done, candidates.length, song.title);

    const blob = song.localAudioBlob;
    if (!blob?.size) {
      skippedNoAudio.push(song.title);
      continue;
    }

    try {
      // `toBeatAnalysisBuffer` re-renders to mono at the rate Essentia assumes. Skipping it is the
      // bug that made every reading ~8% flat on 48 kHz sources, since Essentia's rhythm algorithms
      // have no sample-rate parameter.
      const buffer = await toBeatAnalysisBuffer(await decodeBlob(blob));
      const result = await detectTempoEnsemble(buffer);
      cases.push({
        label: song.title,
        detectedBpm: result.consensusBpm,
        groundTruthBpm: tappedGroundTruthBpm(song)!,
      });
    } catch (err) {
      errors.push({ title: song.title, message: err instanceof Error ? err.message : String(err) });
    }
  }

  const summary = summarizeTempoEval(cases);
  return { summary, report: formatTempoEvalReport(summary), skippedNoAudio, errors };
}
