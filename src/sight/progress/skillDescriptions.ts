import type { SkillVector } from './types';

/** One line per skill for the home skills modal. */
export const SKILL_VECTOR_DESCRIPTIONS: Record<SkillVector, string> = {
  valueSensation: 'Match lightness on neutral gray.',
  chromaIsolation: 'Nudge saturation without shifting hue.',
  temperatureIntuition: 'Read warm vs. cool undertones.',
  relationalDecoding: 'Judge a swatch beside its neighbors.',
  gamutMapping: 'Cover scene colors with a wheel mask.',
  harmonicAlignment: 'Balance hues around an anchor.',
};
