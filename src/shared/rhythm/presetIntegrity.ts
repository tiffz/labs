import type { DrumSound, TimeSignature } from './types';
import { getSixteenthsPerMeasure } from './timeSignatureUtils';
import { parseRhythm } from './rhythmParser';
import type { RhythmDefinition } from './presetDatabase';

/**
 * Guardrails for hand-authored rhythm presets (`RHYTHM_DATABASE`).
 *
 * Heuristics (see `collectRhythmPresetIntegrityIssues`):
 * - Every pattern must parse cleanly for its time signature.
 * - Related rhythms with different bases must not copy/paste the same labeled variation
 *   (same `note` + time signature + notation) — catches Malfuf/Kahleegi-style mistakes.
 * - Variations whose `note` signals 8/8 ornamentation/anchors must match every **attack
 *   onset** in the reference pattern (dum/tak/ka/slap); extra ornamental attacks between
 *   those onsets are allowed.
 */

function timeSignaturesEqual(a: TimeSignature, b: TimeSignature): boolean {
  return a.numerator === b.numerator && a.denominator === b.denominator;
}

function effectiveVariationTimeSignature(
  rhythm: RhythmDefinition,
  variation: { timeSignature?: TimeSignature }
): TimeSignature {
  return variation.timeSignature ?? rhythm.timeSignature;
}

/**
 * Reference skeleton for a variation: native base, 2/4 mapping, doubled 4/4 mapping, or 6/8 pattern.
 */
export function getPresetReferenceNotation(
  rhythm: RhythmDefinition,
  variationTs: TimeSignature
): string | null {
  if (timeSignaturesEqual(variationTs, rhythm.timeSignature)) {
    return rhythm.basePattern;
  }
  if (
    variationTs.numerator === 2 &&
    variationTs.denominator === 4 &&
    typeof rhythm.fourFourMappingPattern === 'string'
  ) {
    return rhythm.fourFourMappingPattern;
  }
  if (
    variationTs.numerator === 4 &&
    variationTs.denominator === 4 &&
    typeof rhythm.fourFourMappingPattern === 'string'
  ) {
    return `${rhythm.fourFourMappingPattern}${rhythm.fourFourMappingPattern}`;
  }
  if (
    variationTs.numerator === 6 &&
    variationTs.denominator === 8 &&
    typeof rhythm.sixEightPattern === 'string'
  ) {
    return rhythm.sixEightPattern;
  }
  return null;
}

function collectAttackOnsets(
  notation: string,
  timeSignature: TimeSignature
): { onsets: { tick: number; sound: DrumSound }[]; error?: string } {
  const parsed = parseRhythm(notation, timeSignature);
  if (!parsed.isValid) {
    return { onsets: [], error: parsed.error ?? 'Invalid rhythm' };
  }
  if (parsed.measures.length !== 1) {
    return {
      onsets: [],
      error: `Expected exactly one measure, got ${parsed.measures.length}`,
    };
  }
  const spm = getSixteenthsPerMeasure(timeSignature);
  const onsets: { tick: number; sound: DrumSound }[] = [];
  let tick = 0;
  for (const note of parsed.measures[0].notes) {
    const d = note.durationInSixteenths;
    if (tick + d > spm) {
      return { onsets: [], error: `Note overflow: tick ${tick} + ${d} > ${spm}` };
    }
    if (note.sound !== 'rest' && note.sound !== 'simile') {
      onsets.push({ tick, sound: note.sound });
    }
    tick += d;
  }
  if (tick !== spm) {
    return { onsets: [], error: `Measure duration ${tick} !== ${spm}` };
  }
  return { onsets };
}

/**
 * True if every reference stroke onset (dum/tak/ka/slap) lines up with the same stroke
 * at that tick in the variant. Extra ornamental attacks between reference onsets are allowed
 * (e.g. ka inside a long dum in the ASCII notation).
 */
export function referenceAttackSkeletonMatches(
  refNotation: string,
  refTs: TimeSignature,
  variantNotation: string,
  variantTs: TimeSignature
): { ok: boolean; error?: string } {
  if (!timeSignaturesEqual(refTs, variantTs)) {
    return { ok: false, error: 'Time signatures differ' };
  }
  const refOn = collectAttackOnsets(refNotation, refTs);
  if (refOn.error) return { ok: false, error: `Reference: ${refOn.error}` };
  const varOn = collectAttackOnsets(variantNotation, variantTs);
  if (varOn.error) return { ok: false, error: `Variant: ${varOn.error}` };

  const varByTick = new Map<number, DrumSound>();
  for (const { tick, sound } of varOn.onsets) {
    varByTick.set(tick, sound);
  }

  for (const { tick, sound } of refOn.onsets) {
    const v = varByTick.get(tick);
    if (v === undefined) {
      return {
        ok: false,
        error: `Tick ${tick}: reference has attack ${sound}, variant has no attack there`,
      };
    }
    if (v !== sound) {
      return {
        ok: false,
        error: `Tick ${tick}: reference has ${sound}, variant has ${v}`,
      };
    }
  }
  return { ok: true };
}

/** Only 8/8 (or explicit anchor) notes: avoids false positives on unrelated "ornamented" 2/4 lines. */
const ORNAMENT_NOTE_PATTERN =
  /(^8\/8.*(ornament|anchor))|quarter-note anchor|ka ornaments/i;

function variationRequiresOrnamentBackboneCheck(note: string | undefined): boolean {
  if (!note) return false;
  return ORNAMENT_NOTE_PATTERN.test(note);
}

function normalizeNotationForComparison(notation: string): string {
  return notation.toUpperCase().replace(/[\s\n]/g, '');
}

/**
 * Returns human-readable issues (empty when the database passes all checks).
 */
export function collectRhythmPresetIntegrityIssues(
  database: Record<string, RhythmDefinition>
): string[] {
  const issues: string[] = [];
  const rhythms = Object.values(database);

  for (const rhythm of rhythms) {
    const patterns: { label: string; notation: string; ts: TimeSignature }[] = [
      { label: 'basePattern', notation: rhythm.basePattern, ts: rhythm.timeSignature },
    ];
    if (typeof rhythm.fourFourMappingPattern === 'string') {
      patterns.push({
        label: 'fourFourMappingPattern',
        notation: rhythm.fourFourMappingPattern,
        ts: { numerator: 2, denominator: 4 },
      });
      patterns.push({
        label: 'fourFourMappingPattern (4/4 doubled)',
        notation: `${rhythm.fourFourMappingPattern}${rhythm.fourFourMappingPattern}`,
        ts: { numerator: 4, denominator: 4 },
      });
    }
    if (typeof rhythm.sixEightPattern === 'string') {
      patterns.push({
        label: 'sixEightPattern',
        notation: rhythm.sixEightPattern,
        ts: { numerator: 6, denominator: 8 },
      });
    }

    for (const { label, notation, ts } of patterns) {
      const parsed = parseRhythm(notation, ts);
      if (!parsed.isValid) {
        issues.push(
          `${rhythm.id}: ${label} fails parseRhythm (${ts.numerator}/${ts.denominator}): ${parsed.error ?? 'unknown'}`
        );
      }
    }

    rhythm.variations.forEach((variation, index) => {
      const vts = effectiveVariationTimeSignature(rhythm, variation);
      const parsed = parseRhythm(variation.notation, vts);
      if (!parsed.isValid) {
        issues.push(
          `${rhythm.id}: variations[${index}] fails parseRhythm (${vts.numerator}/${vts.denominator}): ${parsed.error ?? 'unknown'}`
        );
        return;
      }
      if (parsed.measures.length !== 1) {
        issues.push(
          `${rhythm.id}: variations[${index}] must be exactly one measure (got ${parsed.measures.length})`
        );
      }

      if (variationRequiresOrnamentBackboneCheck(variation.note)) {
        const refNotation = getPresetReferenceNotation(rhythm, vts);
        if (!refNotation) {
          issues.push(
            `${rhythm.id}: variations[${index}] has ornament/anchor note but no reference pattern for ${vts.numerator}/${vts.denominator}`
          );
          return;
        }
        const skeleton = referenceAttackSkeletonMatches(refNotation, vts, variation.notation, vts);
        if (!skeleton.ok) {
          issues.push(
            `${rhythm.id}: variations[${index}] "${variation.note}" must match reference attack skeleton: ${skeleton.error}`
          );
        }
      }
    });
  }

  const seenPairs = new Set<string>();
  for (const rhythm of rhythms) {
    for (const relatedId of rhythm.relatedRhythmIds ?? []) {
      const pairKey = [rhythm.id, relatedId].sort().join('::');
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);

      const other = database[relatedId];
      if (!other) {
        issues.push(`${rhythm.id}: relatedRhythmIds references missing id "${relatedId}"`);
        continue;
      }
      if (rhythm.basePattern === other.basePattern) continue;

      for (const v1 of rhythm.variations) {
        for (const v2 of other.variations) {
          if (!v1.note || v1.note !== v2.note) continue;
          const ts1 = effectiveVariationTimeSignature(rhythm, v1);
          const ts2 = effectiveVariationTimeSignature(other, v2);
          if (!timeSignaturesEqual(ts1, ts2)) continue;
          if (normalizeNotationForComparison(v1.notation) !== normalizeNotationForComparison(v2.notation)) {
            continue;
          }
          issues.push(
            `Related rhythms "${rhythm.id}" and "${other.id}" share the same variation ` +
              `(note "${v1.note}", ${ts1.numerator}/${ts1.denominator}, notation) but different basePattern — likely a copy/paste mistake.`
          );
        }
      }
    }
  }

  return issues;
}
