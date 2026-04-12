import { describe, expect, it } from 'vitest';
import type { TemplateSegment } from './prosodyEngine';
import { DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS } from './prosodyEngine';
import {
  mutateTemplate,
  buildPhraseStructure,
  applyFreestyle,
} from './generationPipeline';
import { getWordShape, fitWordShapeToSlot } from './wordShapeTemplates';
import { pickSubdivision, resolveSubdivisionStrokes } from './subdivisionPatterns';

const timeSignature = { numerator: 4, denominator: 4 } as const;

function maqsumTimeline(): TemplateSegment[] {
  return [
    { kind: 'hit', sixteenths: 2, stroke: 'D' },
    { kind: 'hit', sixteenths: 2, stroke: 'T' },
    { kind: 'rest', sixteenths: 2 },
    { kind: 'hit', sixteenths: 2, stroke: 'T' },
    { kind: 'hit', sixteenths: 4, stroke: 'D' },
    { kind: 'hit', sixteenths: 4, stroke: 'T' },
  ];
}

function totalSixteenths(segments: TemplateSegment[]): number {
  return segments.reduce((sum, s) => sum + s.sixteenths, 0);
}

describe('mutateTemplate', () => {
  it('returns the original timeline when both rules are off', () => {
    const timeline = maqsumTimeline();
    const result = mutateTemplate(
      timeline,
      DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS,
      timeSignature,
      0
    );
    expect(result).toEqual(timeline);
  });

  it('preserves total measure length when filling rests', () => {
    const timeline = maqsumTimeline();
    const settings = {
      ...DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS,
      fillRests: true,
    };
    const result = mutateTemplate(timeline, settings, timeSignature, 42);
    expect(totalSixteenths(result)).toBe(totalSixteenths(timeline));
  });

  it('preserves total measure length when subdividing', () => {
    const timeline = maqsumTimeline();
    const settings = {
      ...DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS,
      subdivideNotes: true,
    };
    const result = mutateTemplate(timeline, settings, timeSignature, 42);
    expect(totalSixteenths(result)).toBe(totalSixteenths(timeline));
  });

  it('can create more segments when subdividing', () => {
    const timeline: TemplateSegment[] = [
      { kind: 'hit', sixteenths: 4, stroke: 'D' },
      { kind: 'hit', sixteenths: 4, stroke: 'T' },
      { kind: 'hit', sixteenths: 4, stroke: 'D' },
      { kind: 'hit', sixteenths: 4, stroke: 'T' },
    ];
    const settings = {
      ...DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS,
      subdivideNotes: true,
      noteValueBias: { sixteenth: 100, eighth: 100, dotted: 0, quarter: 0 },
    };

    let hadMoreSegments = false;
    for (let seed = 0; seed < 20; seed++) {
      const result = mutateTemplate(timeline, settings, timeSignature, seed);
      if (result.length > timeline.length) {
        hadMoreSegments = true;
        break;
      }
    }
    expect(hadMoreSegments).toBe(true);
  });
});

describe('buildPhraseStructure', () => {
  it('repeats template for each measure in repeat mode', () => {
    const template = maqsumTimeline();
    const plans = buildPhraseStructure(
      template,
      { ...DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS, phrasing: 'repeat' as const },
      timeSignature,
      4,
      0
    );
    expect(plans.length).toBe(4);
    plans.forEach((plan) => {
      expect(totalSixteenths(plan.segments)).toBe(16);
    });
  });

  it('uses A/B variations for middle measures', () => {
    const template = maqsumTimeline();
    const settings = {
      ...DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS,
      phrasing: 'halfMeasureVariations' as const,
    };
    const plans = buildPhraseStructure(template, settings, timeSignature, 6, 42);
    expect(plans.length).toBe(6);
    expect(plans[0].segments).toEqual(plans[5].segments);
    plans.forEach((plan) => {
      expect(totalSixteenths(plan.segments)).toBe(16);
    });
  });

  it('applies landing note on last measure', () => {
    const template = maqsumTimeline();
    const settings = {
      ...DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS,
      freestyle: false,
      phrasing: 'repeat' as const,
      landingNote: 'half' as const,
    };
    const plans = buildPhraseStructure(template, settings, timeSignature, 3, 0);
    expect(plans.length).toBe(3);
    const lastSegments = plans[2].segments;
    const lastSeg = lastSegments[lastSegments.length - 1];
    expect(lastSeg.kind).toBe('hit');
    if (lastSeg.kind === 'hit') {
      expect(lastSeg.stroke).toBe('D');
      expect(lastSeg.sixteenths).toBe(8);
    }
  });
});

describe('applyFreestyle', () => {
  it('returns original when strength is 0', () => {
    const timeline = maqsumTimeline();
    const result = applyFreestyle(
      timeline,
      0,
      DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS.noteValueBias,
      42
    );
    expect(result).toEqual(timeline);
  });

  it('preserves total duration', () => {
    const timeline = maqsumTimeline();
    const result = applyFreestyle(
      timeline,
      80,
      DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS.noteValueBias,
      42
    );
    expect(totalSixteenths(result)).toBe(totalSixteenths(timeline));
  });

  it('keeps beat 1 as dum', () => {
    const timeline = maqsumTimeline();
    for (let seed = 0; seed < 30; seed++) {
      const result = applyFreestyle(
        timeline,
        100,
        DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS.noteValueBias,
        seed
      );
      const first = result[0];
      if (first.kind === 'hit') {
        expect(first.stroke).toBe('D');
      }
    }
  });
});

describe('wordShapeTemplates', () => {
  it('returns trochee for apple-like stress [1,0]', () => {
    const shape = getWordShape([1, 0]);
    expect(shape.durations.length).toBe(2);
    expect(shape.totalSixteenths).toBe(4);
  });

  it('returns four fast sixteenths for watermelon-like [1,0,0,0]', () => {
    const shape = getWordShape([1, 0, 0, 0]);
    expect(shape.durations).toEqual([1, 1, 1, 1]);
  });

  it('returns dactyl for coconut-like [1,0,0]', () => {
    const shape = getWordShape([1, 0, 0]);
    expect(shape.durations.length).toBe(3);
    expect(shape.totalSixteenths).toBe(6);
  });

  it('fitWordShapeToSlot preserves syllable count and hits target', () => {
    const shape = getWordShape([1, 0, 0, 0]);
    const fitted = fitWordShapeToSlot(shape, 8);
    expect(fitted.length).toBe(4);
    expect(fitted.reduce((a, b) => a + b, 0)).toBe(8);
  });
});

describe('subdivisionPatterns', () => {
  it('picks a valid subdivision for a quarter note', () => {
    const pattern = pickSubdivision(4, 0.5);
    expect(pattern).not.toBeNull();
    if (pattern) {
      const totalDur = pattern.hits.reduce((sum, [, d]) => sum + d, 0);
      expect(totalDur).toBe(4);
      expect(pattern.hits[0][0]).toBe('X');
    }
  });

  it('resolves X to the original stroke', () => {
    const pattern = pickSubdivision(4, 0.5);
    expect(pattern).not.toBeNull();
    if (pattern) {
      const resolved = resolveSubdivisionStrokes(pattern, 'D');
      expect(resolved[0][0]).toBe('D');
      resolved.forEach(([s]) => expect(['D', 'T', 'K']).toContain(s));
    }
  });

  it('returns null for single sixteenth', () => {
    expect(pickSubdivision(1, 0.5)).toBeNull();
  });
});
