import { colorsFromHarmony, mutedBridgePalette } from './harmony';
import { hexToColorState } from './convert';
import { clampColorState } from './formatOklch';
import { fitPaletteToGamut } from './paletteGamut';
import {
  clampToProfile,
  type PaletteGenerationProfile,
  type PaletteRandomTemplate,
  PALETTE_MOOD_PRESETS,
  PALETTE_RANDOM_TEMPLATES,
  pickMixedMoodProfile,
  resolvePaletteProfile,
} from './paletteProfile';
import type { ColorState, HarmonySystem, PaletteProposal } from './types';
import { hueDistance } from './lerpOklch';
import { polishPaletteColors } from './palettePolish';

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInRange(rand: () => number, min: number, max: number): number {
  return min + rand() * (max - min);
}

function varyLightness(base: ColorState, index: number, count: number, profile: PaletteGenerationProfile): ColorState {
  const t = count <= 1 ? 0.5 : index / (count - 1);
  const l = profile.lightnessMin + (profile.lightnessMax - profile.lightnessMin) * (0.1 + t * 0.8);
  const c = Math.min(profile.chromaMax, base.c * (0.96 + (index % 2) * 0.06));
  return clampToProfile({ ...base, l, c }, profile);
}

/** Spread harmony swatches around a seed anchor instead of the full profile lightness span. */
function varyLightnessAroundSeed(
  base: ColorState,
  index: number,
  count: number,
  profile: PaletteGenerationProfile,
  anchor: ColorState,
): ColorState {
  const t = count <= 1 ? 0.5 : index / (count - 1);
  const spread = Math.min(0.28, (profile.lightnessMax - profile.lightnessMin) * 0.38);
  const l = anchor.l + (t - 0.5) * spread * 2;
  const c = Math.min(profile.chromaMax, Math.max(base.c, anchor.c * 0.88, profile.chromaMin));
  return clampToProfile({ ...base, l, c }, profile);
}

function proposal(
  id: string,
  label: string,
  rule: PaletteProposal['rule'],
  colors: ColorState[],
  profile: PaletteGenerationProfile,
  method: PaletteProposal['method'] = rule,
  options?: {
    rand?: () => number;
    polishFidelity?: 'creative' | 'source' | 'seed' | 'seed-varied';
    anchor?: ColorState;
    anchorIndex?: number;
    seedDrift?: { h: number; c: number; l: number };
  },
): PaletteProposal {
  const polished = polishPaletteColors(colors.map(clampColorState), profile, {
    fidelity: options?.polishFidelity,
    anchor: options?.anchor,
    anchorIndex: options?.anchorIndex,
    seedDrift: options?.seedDrift,
  });
  const finalized = injectContrastAnchors(polished, profile, options?.rand);
  return {
    id,
    label,
    rule,
    method,
    colors: fitPaletteToGamut(finalized, profile.gamut),
  };
}

function usesContrastAnchors(profile: PaletteGenerationProfile): boolean {
  return profile.id === 'contrast' || profile.id === 'neonInk';
}

/** Chroma-weighted circular mean hue for a palette family. */
function paletteFamilyHue(colors: ColorState[]): number {
  let sin = 0;
  let cos = 0;
  let weight = 0;
  for (const color of colors) {
    const w = Math.max(0.02, color.c);
    const rad = (color.h * Math.PI) / 180;
    sin += Math.sin(rad) * w;
    cos += Math.cos(rad) * w;
    weight += w;
  }
  if (weight <= 0) return colors[0]?.h ?? 0;
  return ((Math.atan2(sin / weight, cos / weight) * 180) / Math.PI + 360) % 360;
}

function pickInteriorIndex(length: number, exclude: Set<number>, rand: () => number): number {
  const candidates = Array.from({ length }, (_, index) => index).filter((index) => !exclude.has(index));
  if (candidates.length === 0) return Math.min(1, length - 1);
  return candidates[Math.floor(rand() * candidates.length)]!;
}

/** Synthesize tinted ink/paper extremes and optional neon accent from the palette hue story. */
export function injectContrastAnchors(
  colors: ColorState[],
  profile: PaletteGenerationProfile,
  rand: () => number = Math.random,
): ColorState[] {
  if (!usesContrastAnchors(profile) || colors.length < 3) return colors;

  const out = colors.map((color) => ({ ...color }));
  const inkIndex = 0;
  const paperIndex = out.length - 1;
  const familyHue = paletteFamilyHue(out);
  const inkHue = (familyHue + (rand() - 0.5) * 22 + 360) % 360;
  const paperHue = (familyHue + randomInRange(rand, 24, 72) + 360) % 360;

  out[inkIndex] = clampColorState({
    h: inkHue,
    c:
      profile.id === 'neonInk'
        ? randomInRange(rand, 0.04, 0.11)
        : randomInRange(rand, 0.07, profile.chromaMax),
    l: randomInRange(rand, profile.lightnessMin, profile.lightnessMin + 0.05),
  });
  out[paperIndex] = clampColorState({
    h: paperHue,
    c: randomInRange(rand, 0.028, profile.id === 'neonInk' ? 0.085 : 0.11),
    l: randomInRange(rand, profile.lightnessMax - 0.045, profile.lightnessMax),
  });

  const reserved = new Set([inkIndex, paperIndex]);

  if (profile.id === 'neonInk') {
    const neonIndex = pickInteriorIndex(out.length, reserved, rand);
    const neonHue = (inkHue + randomInRange(rand, 95, 165) + 360) % 360;
    out[neonIndex] = clampColorState({
      h: neonHue,
      c: randomInRange(rand, 0.28, profile.chromaMax),
      l: randomInRange(rand, 0.54, 0.71),
    });
    reserved.add(neonIndex);
  } else {
    const accentIndex = pickInteriorIndex(out.length, reserved, rand);
    const accentHue = (inkHue + randomInRange(rand, 70, 140) + 360) % 360;
    out[accentIndex] = clampColorState({
      h: accentHue,
      c: randomInRange(rand, 0.14, profile.chromaMax),
      l: randomInRange(rand, 0.42, 0.62),
    });
  }

  return out;
}

function profileForPalette(
  profileInput: PaletteGenerationProfile,
  rand: () => number,
): PaletteGenerationProfile {
  if (profileInput.id === 'mixed') {
    return pickMixedMoodProfile(rand);
  }
  return resolvePaletteProfile(profileInput.id, profileInput);
}

function jitterPivot(
  base: ColorState,
  profile: PaletteGenerationProfile,
  rand: () => number,
  strength = 1,
): ColorState {
  const hueSpan = 52 * strength;
  const lightSpan = 0.2 * strength;
  const chromaScale = 0.22 * strength;
  return clampToProfile(
    {
      h: (base.h + (rand() - 0.5) * hueSpan + 360) % 360,
      c: Math.min(profile.chromaMax, Math.max(profile.chromaMin, base.c * (0.82 + rand() * chromaScale))),
      l: base.l + (rand() - 0.5) * lightSpan,
    },
    profile,
  );
}

function templateHueBias(
  hue: number,
  template: PaletteRandomTemplate,
  rand: () => number,
): number {
  switch (template) {
    case 'complementary':
      return (hue + 165 + rand() * 30) % 360;
    case 'triadic':
      return (hue + rand() * 110) % 360;
    case 'splitComplementary':
      return (hue + 75 + rand() * 70) % 360;
    case 'tetradic':
      return (hue + 35 + rand() * 125) % 360;
    case 'monochrome':
      return (hue + (rand() - 0.5) * 18 + 360) % 360;
    case 'analogous':
      return (hue + (rand() - 0.5) * 48 + 360) % 360;
    case 'balanced':
    default:
      return (hue + (rand() - 0.5) * 64 + 360) % 360;
  }
}

function paletteHueOrbit(index: number, count: number, rand: () => number): number {
  const tier = count <= 1 ? 0.5 : index / (count - 1);
  const base = 24 + tier * 78;
  return base * (0.72 + rand() * 0.56);
}

export function generatePaletteFromSeed(
  seed: ColorState,
  profile: PaletteGenerationProfile,
  maxSwatches = 5,
  options?: { variationSeed?: number },
): PaletteProposal[] {
  const anchor = clampColorState(seed);
  const basePivot = clampToProfile(anchor, profile);
  if (options?.variationSeed == null) {
    return proposeHarmonySet(basePivot, profile, maxSwatches, 'seed', { anchor });
  }
  const rand = mulberry32(options.variationSeed);
  return proposeHarmonySet(basePivot, profile, maxSwatches, `seed-${options.variationSeed}`, {
    anchor,
    variationRand: rand,
  });
}

export function generatePaletteFromSeedHex(
  hex: string,
  presetProfile: PaletteGenerationProfile,
  maxSwatches = 5,
  options?: { variationSeed?: number },
): PaletteProposal[] {
  const parsed = hexToColorState(hex);
  if (!parsed) return [];
  return generatePaletteFromSeed(parsed, presetProfile, maxSwatches, options);
}

function proposeHarmonySet(
  pivot: ColorState,
  profile: PaletteGenerationProfile,
  maxSwatches: number,
  idPrefix: string,
  options?: { anchor?: ColorState; variationRand?: () => number },
): PaletteProposal[] {
  const anchor = options?.anchor ?? pivot;
  const rand = options?.variationRand;
  const systems: Array<{ rule: HarmonySystem | 'muted'; label: string }> = [
    { rule: 'analogous', label: 'Analogous' },
    { rule: 'complementary', label: 'Complementary' },
    { rule: 'triadic', label: 'Triadic' },
    { rule: 'splitComplementary', label: 'Split complementary' },
    { rule: 'muted', label: 'Muted bridge' },
  ];
  if (rand) {
    for (let i = systems.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [systems[i], systems[j]] = [systems[j]!, systems[i]!];
    }
  }
  const seedDrift = rand
    ? {
        h: (rand() - 0.5) * 42,
        c: (rand() - 0.5) * 0.08,
        l: (rand() - 0.5) * 0.14,
      }
    : undefined;
  const anchorIndex = rand ? Math.floor(rand() * maxSwatches) : 0;
  const out: PaletteProposal[] = [];
  for (const { rule, label } of systems) {
    const strength = rand ? 1.15 + rand() * 1.35 : 0;
    const workingPivot = rand ? jitterPivot(pivot, profile, rand, strength) : pivot;
    let colors: ColorState[];
    if (rule === 'muted') {
      colors = mutedBridgePalette(workingPivot, maxSwatches);
    } else {
      colors = colorsFromHarmony(workingPivot, rule, maxSwatches).map((color, index) =>
        varyLightnessAroundSeed(color, index, maxSwatches, profile, anchor),
      );
    }
    if (rand && anchorIndex > 0) {
      const rotateBy = anchorIndex % colors.length;
      colors = [...colors.slice(rotateBy), ...colors.slice(0, rotateBy)];
    }
    out.push(
      proposal(`${idPrefix}-${rule}`, label, rule, colors, profile, 'seed', {
        rand,
        polishFidelity: rand ? 'seed-varied' : 'seed',
        anchor,
        anchorIndex: rand ? 0 : anchorIndex,
        seedDrift,
      }),
    );
  }
  return out;
}

export function generateRandomPalettes(
  profileInput: PaletteGenerationProfile,
  options?: {
    count?: number;
    swatches?: number;
    templates?: PaletteRandomTemplate[];
    seed?: number;
  },
): PaletteProposal[] {
  const rand = mulberry32(options?.seed ?? Date.now());
  const paletteCount = options?.count ?? 6;
  const swatches = options?.swatches ?? 5;
  const templates = options?.templates ?? PALETTE_RANDOM_TEMPLATES.map((t) => t.id);
  const out: PaletteProposal[] = [];

  const batchProfile = profileForPalette(profileInput, rand);
  const familyProfile = profileInput.id === 'mixed' ? PALETTE_MOOD_PRESETS.mixed : batchProfile;
  const familyHue =
    familyProfile.hueMin != null && familyProfile.hueMax != null
      ? randomInRange(rand, familyProfile.hueMin, familyProfile.hueMax)
      : rand() * 360;
  const familyPivot = clampToProfile(
    {
      h: familyHue,
      c: randomInRange(rand, familyProfile.chromaMin, familyProfile.chromaMax),
      l: randomInRange(rand, familyProfile.lightnessMin, familyProfile.lightnessMax),
    },
    familyProfile,
  );

  for (let i = 0; i < paletteCount; i++) {
    const profile =
      profileInput.id === 'mixed' ? pickMixedMoodProfile(rand) : profileForPalette(profileInput, rand);
    const template = templates[i % templates.length] ?? 'balanced';
    const templateMeta = PALETTE_RANDOM_TEMPLATES.find((t) => t.id === template);
    const orbit = paletteHueOrbit(i, paletteCount, rand);
    let pivotHue = (familyHue + (rand() - 0.5) * 2 * orbit + 360) % 360;
    pivotHue = templateHueBias(pivotHue, template, rand);
    const pivot = clampToProfile(
      {
        h: pivotHue,
        c: familyPivot.c * (0.72 + rand() * 0.48),
        l: familyPivot.l + (rand() - 0.5) * 0.22,
      },
      profile,
    );

    let colors: ColorState[];
    if (templateMeta?.harmony === 'monochrome') {
      colors = Array.from({ length: swatches }, (_, index) => varyLightness(pivot, index, swatches, profile));
    } else if (templateMeta?.harmony) {
      colors = colorsFromHarmony(pivot, templateMeta.harmony, swatches).map((color, index) =>
        varyLightness(color, index, swatches, profile),
      );
    } else {
      colors = colorsFromHarmony(pivot, 'analogous', swatches);
    }

    const moodSuffix = profileInput.id === 'mixed' ? ` · ${profile.label}` : '';
    out.push(
      proposal(
        `random-${template}-${profile.id}-${i}`,
        `${templateMeta?.label ?? 'Random'}${moodSuffix}`,
        templateMeta?.harmony === 'monochrome' ? 'dominant' : (templateMeta?.harmony ?? 'analogous'),
        colors,
        profile,
        'random',
        { rand },
      ),
    );
  }
  return out;
}

export function dedupePaletteProposals(proposals: PaletteProposal[], minHueDelta = 14): PaletteProposal[] {
  const out: PaletteProposal[] = [];
  for (const proposalRow of proposals) {
    const first = proposalRow.colors[0];
    if (!first) continue;
    if (out.some((existing) => hueDistance(existing.colors[0]?.h ?? 0, first.h) < minHueDelta)) continue;
    out.push(proposalRow);
  }
  return out;
}
