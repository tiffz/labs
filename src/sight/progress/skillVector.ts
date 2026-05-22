import { getLevelConfig } from '../levels';
import type { SightChallenge } from '../types';
import type { SkillVector } from './types';

export function skillVectorForChallenge(challenge: SightChallenge, level: number): SkillVector {
  if (challenge.kind === 'flashcard-isolated') {
    const p = challenge.profile;
    if (p === 'chromaEasy' || p === 'chromaHard') return 'chromaIsolation';
    if (p === 'temperatureUndertone' || p === 'temperatureHueBoundary') return 'temperatureIntuition';
    return 'valueSensation';
  }
  if (challenge.kind === 'flashcard-albers') return 'relationalDecoding';
  if (challenge.kind === 'munsell-slice') {
    return challenge.axis === 'chroma' ? 'chromaIsolation' : 'valueSensation';
  }
  if (challenge.kind === 'albers-equalizer') return 'relationalDecoding';
  if (challenge.kind === 'anchor-pivot') return 'harmonicAlignment';
  if (challenge.kind === 'yot-cast') return 'temperatureIntuition';
  if (challenge.kind === 'gamut') return 'gamutMapping';
  if (challenge.kind === 'bridge') return 'valueSensation';
  if (challenge.kind === 'contextual') {
    const profile = getLevelConfig(level).contextualProfile ?? challenge.display;
    if (profile === 'hueLocked') return 'chromaIsolation';
    return 'valueSensation';
  }
  return 'valueSensation';
}
