import type { PianoScore, ScorePart } from '../scoreTypes';

export function pickMelodyPart(score: PianoScore): ScorePart {
  const voice = score.parts.find((p) => p.hand === 'voice');
  if (voice) return voice;
  return score.parts[0];
}
