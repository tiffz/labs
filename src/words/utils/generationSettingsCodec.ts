import type {
  AlignmentStrength,
  LandingNote,
  MutationId,
  PhrasingMode,
  WordRhythmGenerationSettings,
} from './prosodyEngine';
import {
  ALL_MUTATION_IDS,
  DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS,
} from './prosodyEngine';

/** Legacy slider-based settings (pre template-first / mutations). */
export interface LegacyWordRhythmAdvancedSettings {
  adventurousness?: number;
  dottedBias?: number;
  sixteenthBias?: number;
  tieCrossingBias?: number;
  midMeasureRestBias?: number;
  motifVariation?: number;
  alignWordStartsToBeats?: number;
  alignStressToMajorBeats?: number;
  avoidIntraWordRests?: number;
  lineBreakGapBias?: number;
  templateBias?: number;
  templateNotation?: string;
}

const ALIGN_OFF = 0;
const ALIGN_LIGHT = 1;
const ALIGN_STRONG = 2;

function strengthFromLegacySlider(value: number | undefined): AlignmentStrength {
  if (value === undefined) return 'strong';
  if (value < 28) return 'off';
  if (value < 62) return 'light';
  return 'strong';
}

function legacySliderToBool(value: number | undefined, threshold: number): boolean {
  if (value === undefined) return false;
  return value >= threshold;
}

function isNewGenerationShape(
  parsed: unknown
): parsed is Partial<WordRhythmGenerationSettings> & {
  mutations: Record<string, boolean>;
} {
  return (
    typeof parsed === 'object' &&
    parsed !== null &&
    'mutations' in parsed &&
    typeof (parsed as { mutations?: unknown }).mutations === 'object' &&
    (parsed as { mutations?: unknown }).mutations !== null
  );
}

/**
 * Maps old URL / saved JSON into the v3 model via v2 migration.
 */
export function migrateLegacyGenerationSettings(
  raw: LegacyWordRhythmAdvancedSettings | Record<string, unknown>
): WordRhythmGenerationSettings {
  if (isNewGenerationShape(raw)) {
    const mutations: Record<MutationId, boolean> = {
      ...DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS.mutations,
      ...ALL_MUTATION_IDS.reduce(
        (acc, id) => {
          const v = raw.mutations?.[id];
          if (typeof v === 'boolean') acc[id] = v;
          return acc;
        },
        {} as Record<MutationId, boolean>
      ),
    };
    return migrateV2ToV3({
      mutations,
      stressAlignment: raw.stressAlignment as AlignmentStrength | undefined,
      wordStartAlignment: raw.wordStartAlignment as AlignmentStrength | undefined,
      templateNotation: raw.templateNotation as string | undefined,
    });
  }

  const legacy = raw as LegacyWordRhythmAdvancedSettings;
  const hasLegacyKeys =
    'adventurousness' in raw ||
    'dottedBias' in raw ||
    'templateBias' in raw ||
    'alignWordStartsToBeats' in raw;

  if (!hasLegacyKeys) {
    return { ...DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS };
  }

  const mutations: Record<MutationId, boolean> = {
    ...DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS.mutations,
  };

  mutations.adventurousRhythm = legacySliderToBool(legacy.adventurousness, 38);
  mutations.dottedFeel = legacySliderToBool(legacy.dottedBias, 32);
  mutations.sixteenthMotion = legacySliderToBool(legacy.sixteenthBias, 28);
  mutations.crossBarTies = legacySliderToBool(legacy.tieCrossingBias, 42);
  mutations.midMeasureRests = legacySliderToBool(legacy.midMeasureRestBias, 22);
  mutations.motifOrnament = legacySliderToBool(legacy.motifVariation, 22);
  mutations.lineBreakGaps = legacySliderToBool(legacy.lineBreakGapBias, 38);
  mutations.avoidIntraWordRests = legacySliderToBool(legacy.avoidIntraWordRests, 42);

  const tb = legacy.templateBias;
  if (tb !== undefined && tb < 55) {
    mutations.dottedFeel = true;
    mutations.sixteenthMotion = true;
    mutations.motifOrnament = true;
  }

  return migrateV2ToV3({
    mutations,
    stressAlignment: strengthFromLegacySlider(legacy.alignStressToMajorBeats),
    wordStartAlignment: strengthFromLegacySlider(legacy.alignWordStartsToBeats),
    templateNotation: legacy.templateNotation,
  });
}

function alignmentToCode(strength: AlignmentStrength): number {
  if (strength === 'off') return ALIGN_OFF;
  if (strength === 'light') return ALIGN_LIGHT;
  return ALIGN_STRONG;
}

function alignmentFromCode(code: number): AlignmentStrength {
  if (code === ALIGN_LIGHT) return 'light';
  if (code === ALIGN_STRONG) return 'strong';
  return 'off';
}

function mutationsFromMask(mask: number): Record<MutationId, boolean> {
  const mutations = { ...DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS.mutations };
  ALL_MUTATION_IDS.forEach((id, index) => {
    mutations[id] = Boolean(mask & (1 << index));
  });
  return mutations;
}

/** Compact URL payload (short keys). v=2 */
interface CompactGsV2 {
  v: 2;
  m: number;
  sa: number;
  wa: number;
  tn?: string;
}

function isCompactV2(value: unknown): value is CompactGsV2 {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as CompactGsV2).v === 2 &&
    typeof (value as CompactGsV2).m === 'number'
  );
}

function parseCompactV2(parsed: CompactGsV2): WordRhythmGenerationSettings {
  return migrateV2ToV3({
    mutations: mutationsFromMask(parsed.m),
    stressAlignment: alignmentFromCode(parsed.sa),
    wordStartAlignment: alignmentFromCode(parsed.wa),
    templateNotation: parsed.tn,
  });
}

// ---------------------------------------------------------------------------
// v3 compact codec
// ---------------------------------------------------------------------------

const PHRASING_CODES: Record<PhrasingMode, number> = {
  repeat: 0,
  halfMeasureVariations: 1,
};

const PHRASING_FROM_CODE: PhrasingMode[] = ['repeat', 'halfMeasureVariations'];

const LANDING_CODES: Record<LandingNote, number> = {
  off: 0,
  quarter: 1,
  half: 2,
  whole: 3,
};

const LANDING_FROM_CODE: LandingNote[] = ['off', 'quarter', 'half', 'whole'];

/**
 * v3 bitmask layout (6 bits):
 *   bit 0 – fillRests
 *   bit 1 – subdivideNotes
 *   bit 2 – stretchSyllables (legacy, kept for backward compat)
 *   bit 3 – freestyle
 *   bit 4 – naturalWordRhythm
 *   bit 5 – mergeNotes
 */
function rulesMask(s: WordRhythmGenerationSettings): number {
  let mask = 0;
  if (s.fillRests) mask |= 1;
  if (s.subdivideNotes) mask |= 2;
  if (s.stretchSyllables) mask |= 4;
  if (s.freestyle) mask |= 8;
  if (s.naturalWordRhythm) mask |= 16;
  if (s.mergeNotes) mask |= 32;
  return mask;
}

function rulesFromMask(mask: number): Pick<
  WordRhythmGenerationSettings,
  'fillRests' | 'subdivideNotes' | 'stretchSyllables' | 'freestyle' | 'naturalWordRhythm' | 'mergeNotes'
> {
  return {
    fillRests: Boolean(mask & 1),
    subdivideNotes: Boolean(mask & 2),
    stretchSyllables: Boolean(mask & 4),
    freestyle: Boolean(mask & 8),
    naturalWordRhythm: Boolean(mask & 16),
    mergeNotes: Boolean(mask & 32),
  };
}

/** Compact URL payload (short keys). v=3 */
interface CompactGsV3 {
  v: 3;
  r: number; // rules bitmask
  nv: [number, number, number, number]; // noteValueBias: [sixteenth, eighth, dotted, quarter]
  fs: number; // freestyleStrength
  sa: number; // stress alignment
  wa: number; // word-start alignment
  ph: number; // phrasing mode
  ln: number; // landing note
  tn?: string; // template notation
}

function isCompactV3(value: unknown): value is CompactGsV3 {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as CompactGsV3).v === 3 &&
    typeof (value as CompactGsV3).r === 'number'
  );
}

function parseCompactV3(parsed: CompactGsV3): WordRhythmGenerationSettings {
  const rules = rulesFromMask(parsed.r);
  const [s16, s8, dot, s4] = parsed.nv;
  return {
    ...rules,
    noteValueBias: {
      sixteenth: clampBias(s16),
      eighth: clampBias(s8),
      dotted: clampBias(dot),
      quarter: clampBias(s4),
    },
    freestyleStrength: Math.max(0, Math.min(100, parsed.fs)),
    stressAlignment: alignmentFromCode(parsed.sa),
    wordStartAlignment: alignmentFromCode(parsed.wa),
    phrasing: PHRASING_FROM_CODE[parsed.ph] ?? 'repeat',
    landingNote: LANDING_FROM_CODE[parsed.ln] ?? 'off',
    mergeNotes: rules.mergeNotes ?? false,
    templateNotation: parsed.tn,
    mutations: { ...DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS.mutations },
  };
}

function clampBias(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

interface V2Shape {
  mutations?: Partial<Record<MutationId, boolean>>;
  stressAlignment?: AlignmentStrength;
  wordStartAlignment?: AlignmentStrength;
  templateNotation?: string;
}

/**
 * Migrate a v2 settings object to the v3 shape. Old mutation flags are mapped
 * to the closest new rules so existing shared URLs produce a reasonable result.
 */
function migrateV2ToV3(v2: V2Shape): WordRhythmGenerationSettings {
  const mut = v2.mutations ?? {};
  const hasGrooveMutations =
    Boolean(mut.adventurousRhythm) ||
    Boolean(mut.dottedFeel) ||
    Boolean(mut.sixteenthMotion);

  const fullMutations: Record<MutationId, boolean> = {
    ...DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS.mutations,
  };
  for (const id of ALL_MUTATION_IDS) {
    if (mut[id] !== undefined) fullMutations[id] = Boolean(mut[id]);
  }

  return {
    fillRests: Boolean(mut.midMeasureRests),
    subdivideNotes: hasGrooveMutations,
    stretchSyllables: Boolean(mut.crossBarTies),
    mergeNotes: false,
    noteValueBias: {
      sixteenth: mut.sixteenthMotion ? 75 : 50,
      eighth: 50,
      dotted: mut.dottedFeel ? 75 : 50,
      quarter: 50,
    },
    freestyle: Boolean(mut.adventurousRhythm) && Boolean(mut.motifOrnament),
    freestyleStrength: mut.adventurousRhythm ? 35 : 25,
    naturalWordRhythm: mut.avoidIntraWordRests !== false,
    stressAlignment: v2.stressAlignment ?? 'strong',
    wordStartAlignment: v2.wordStartAlignment ?? 'strong',
    phrasing: 'repeat',
    landingNote: 'off',
    templateNotation: v2.templateNotation,
    mutations: fullMutations,
  };
}

// ---------------------------------------------------------------------------
// Public encode / decode / merge
// ---------------------------------------------------------------------------

/**
 * Encode generation settings for URL `gs` param (v3 compact JSON).
 */
export function encodeGenerationSettingsJson(
  settings: WordRhythmGenerationSettings
): string {
  const payload: CompactGsV3 = {
    v: 3,
    r: rulesMask(settings),
    nv: [
      settings.noteValueBias.sixteenth,
      settings.noteValueBias.eighth,
      settings.noteValueBias.dotted,
      settings.noteValueBias.quarter,
    ],
    fs: settings.freestyleStrength,
    sa: alignmentToCode(settings.stressAlignment),
    wa: alignmentToCode(settings.wordStartAlignment),
    ph: PHRASING_CODES[settings.phrasing] ?? 0,
    ln: LANDING_CODES[settings.landingNote] ?? 0,
  };
  if (settings.templateNotation?.trim()) {
    payload.tn = settings.templateNotation;
  }
  return JSON.stringify(payload);
}

/**
 * Decode from JSON string (after base64url decode). Supports v3, compact v2, and legacy verbose JSON.
 */
export function decodeGenerationSettingsJson(
  json: string
): WordRhythmGenerationSettings | null {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (isCompactV3(parsed)) {
      return parseCompactV3(parsed);
    }
    if (isCompactV2(parsed)) {
      return parseCompactV2(parsed);
    }
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return migrateLegacyGenerationSettings(
        parsed as LegacyWordRhythmAdvancedSettings
      );
    }
  } catch {
    return null;
  }
  return null;
}

export function mergePartialGenerationSettings(
  base: WordRhythmGenerationSettings,
  partial: Partial<WordRhythmGenerationSettings>
): WordRhythmGenerationSettings {
  return {
    ...base,
    ...partial,
    noteValueBias: {
      ...base.noteValueBias,
      ...partial.noteValueBias,
    },
    mutations: {
      ...base.mutations,
      ...partial.mutations,
    },
  };
}
