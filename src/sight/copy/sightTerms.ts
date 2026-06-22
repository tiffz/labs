import type { AlbersQuestionKind, CompareAxis, IsolatedAxis } from '../types';

export type SightTermId =
  | 'more-vivid'
  | 'less-vivid'
  | 'lighter'
  | 'darker'
  | 'warmer'
  | 'cooler'
  | 'inner-square'
  | 'swatch';

export interface SightTermDefinition {
  phrase: string;
  definition: string;
}

export const SIGHT_TERMS: Record<SightTermId, SightTermDefinition> = {
  'more-vivid': {
    phrase: 'more vivid',
    definition:
      'How strong or gray the color looks. Close to chroma (saturation), not how light or dark it is.',
  },
  'less-vivid': {
    phrase: 'less vivid',
    definition:
      'How muted or gray the color looks. Close to chroma (saturation), not how light or dark it is.',
  },
  lighter: {
    phrase: 'lighter',
    definition: 'How light the color appears. Lightness (L in Oklch), not vividness or saturation.',
  },
  darker: {
    phrase: 'darker',
    definition: 'How dark the color appears. Lightness (L in Oklch), not vividness or saturation.',
  },
  warmer: {
    phrase: 'warmer',
    definition: 'Reads slightly red, orange, or yellow. Color temperature in Oklab, not mood.',
  },
  cooler: {
    phrase: 'cooler',
    definition: 'Reads slightly blue or green. Color temperature in Oklab, not mood.',
  },
  'inner-square': {
    phrase: 'inner square',
    definition:
      'The small square inside the larger colored field. Judge how it looks in each field, not the field color itself.',
  },
  swatch: {
    phrase: 'swatch',
    definition: 'A flat color patch on neutral gray. Compare the patch itself, without a surrounding field.',
  },
};

/** Longest phrases first so "more vivid" wins over "vivid". */
export const SIGHT_PHRASE_LOOKUP: { phrase: string; id: SightTermId }[] = (
  Object.entries(SIGHT_TERMS) as [SightTermId, SightTermDefinition][]
)
  .map(([id, { phrase }]) => ({ phrase, id }))
  .sort((a, b) => b.phrase.length - a.phrase.length);

const CHROMA_ON_GRAY_HELP =
  'Both patches sit on the same neutral gray. Vivid means how saturated or gray the color looks, not lighter or darker.';

const ALBERS_PERCEIVED_HELP =
  'Each side shows an inner square on a different colored field. The background shifts how that square appears, even when both squares are the same color. Trust what you see.';

const ALBERS_PERCEIVED_VIVID_HELP =
  'The inner squares may match physically, but the warm or cool field changes how vivid or gray each one looks. Compare apparent richness, not the field around it.';

const ALBERS_IDENTITY_HELP =
  'Decide if the inner squares are the same color. Ignore the surrounding field. After you answer, feedback shows each chip on gray for a fair comparison.';

export function questionHelpForCompare(axis: CompareAxis): string | null {
  if (axis === 'moreSaturated' || axis === 'lessSaturated') return CHROMA_ON_GRAY_HELP;
  return null;
}

export function questionHelpForIsolated(axis: IsolatedAxis): string | null {
  if (axis === 'moreSaturated' || axis === 'lessSaturated') return CHROMA_ON_GRAY_HELP;
  return null;
}

export function questionHelpForAlbers(question: AlbersQuestionKind): string | null {
  if (question === 'identity') return ALBERS_IDENTITY_HELP;
  if (question === 'perceivedMoreSaturated' || question === 'perceivedLessSaturated') {
    return ALBERS_PERCEIVED_VIVID_HELP;
  }
  if (question.startsWith('perceived')) return ALBERS_PERCEIVED_HELP;
  return null;
}
