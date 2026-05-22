import { getLevelConfig } from '../levels';
import { clampColorState } from '../scoring/perceptualScore';
import type { ColorState, YotCastChallenge, YotFlat, YotLightPrompt } from '../types';
import { createRng } from './rng';

const LIGHT_SHIFTS: Record<YotLightPrompt, { dl: number; dc: number; dh: number }> = {
  goldenHour: { dl: 0.06, dc: 0.04, dh: 25 },
  blueCave: { dl: -0.08, dc: 0.05, dh: -35 },
  overcast: { dl: 0.02, dc: -0.06, dh: 5 },
  neonAlley: { dl: -0.04, dc: 0.12, dh: -80 },
};

const PROMPTS: YotLightPrompt[] = ['goldenHour', 'blueCave', 'overcast', 'neonAlley'];

function applyCast(local: ColorState, prompt: YotLightPrompt): ColorState {
  const s = LIGHT_SHIFTS[prompt];
  return clampColorState({
    h: local.h + s.dh,
    c: local.c + s.dc,
    l: local.l + s.dl,
  });
}

function wrongCast(local: ColorState, prompt: YotLightPrompt, variant: number): ColorState {
  const alt = PROMPTS[(PROMPTS.indexOf(prompt) + 1 + variant) % PROMPTS.length]!;
  const base = applyCast(local, prompt);
  if (variant === 0) return clampColorState({ ...base, h: base.h + 40 });
  if (variant === 1) return clampColorState({ ...base, l: base.l + 0.15 });
  return applyCast(local, alt);
}

export function generateYotCastChallenge(seed: number, level: number): YotCastChallenge {
  const rng = createRng(seed);
  const lightPrompt = PROMPTS[Math.floor(rng() * PROMPTS.length)]!;
  const flats: YotFlat[] = [
    { id: 'sky', local: clampColorState({ h: 210, c: 0.08, l: 0.7 }) },
    { id: 'ground', local: clampColorState({ h: 35, c: 0.1, l: 0.35 }) },
    { id: 'figure', local: clampColorState({ h: 280, c: 0.12, l: 0.45 }) },
  ];

  const correctScene = flats.map((f) => applyCast(f.local, lightPrompt));
  const distractorA = flats.map((f, i) => wrongCast(f.local, lightPrompt, 0 + (i % 2)));
  const distractorB = flats.map((f) => wrongCast(f.local, lightPrompt, 1));
  const distractorC = flats.map((f) => wrongCast(f.local, lightPrompt, 2));

  const options = [correctScene, distractorA, distractorB, distractorC];
  const indices = [0, 1, 2, 3];
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j]!, indices[i]!];
  }
  const shuffled = indices.map((i) => options[i]!);
  const correctIndex = indices.indexOf(0);

  void getLevelConfig(level);
  return {
    kind: 'yot-cast',
    seed,
    lightPrompt,
    flats,
    options: shuffled,
    correctIndex,
  };
}
