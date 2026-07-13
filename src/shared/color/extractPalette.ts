import { converter } from 'culori';

import { colorsFromHarmony, mutedBridgePalette } from './harmony';
import { hueDistance } from './lerpOklch';
import { fitPaletteToGamut } from './paletteGamut';
import { polishPaletteColors } from './palettePolish';
import { clampToProfile, type PaletteGenerationProfile, DEFAULT_PALETTE_PROFILE } from './paletteProfile';
import { clampColorState } from './formatOklch';
import type { ColorState, HarmonySystem, PaletteExtractionMethod, PaletteProposal } from './types';

const toOklch = converter('oklch');

const HARMONY_RULES: Array<{ rule: HarmonySystem | 'dominant' | 'muted'; label: string }> = [
  { rule: 'dominant', label: 'Dominant hues' },
  { rule: 'complementary', label: 'Complementary' },
  { rule: 'triadic', label: 'Triadic' },
  { rule: 'analogous', label: 'Analogous' },
  { rule: 'muted', label: 'Muted bridge' },
];

const EXTRACTION_METHODS: Array<{ method: PaletteExtractionMethod; label: string }> = [
  { method: 'vivid', label: 'Vivid accents' },
  { method: 'accent', label: 'Accent mix' },
  { method: 'extremes', label: 'Light & shadow' },
  { method: 'spread', label: 'Max spread' },
  { method: 'centroid', label: 'Averaged hues' },
];

function pixelToColorState(r: number, g: number, b: number, a: number): ColorState | null {
  if (a < 0.12) return null;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min < 0.015 && (max > 0.97 || max < 0.04)) return null;
  const oklch = toOklch({ mode: 'rgb', r, g, b });
  if (!oklch || oklch.h == null) return null;
  return clampColorState({ h: oklch.h, c: oklch.c ?? 0, l: oklch.l ?? 0.5 });
}

export function sampleImageDataToPixels(imageData: ImageData, sampleStride = 3): ColorState[] {
  const { data, width, height } = imageData;
  const pixels: ColorState[] = [];
  for (let y = 0; y < height; y += sampleStride) {
    for (let x = 0; x < width; x += sampleStride) {
      const i = (y * width + x) * 4;
      const state = pixelToColorState(data[i]! / 255, data[i + 1]! / 255, data[i + 2]! / 255, data[i + 3]! / 255);
      if (state) pixels.push(state);
    }
  }
  return pixels;
}

function filterPixelsForImage(pixels: ColorState[]): ColorState[] {
  const filtered = pixels.filter((p) => {
    if (p.c < 0.02 && p.l > 0.96) return false;
    if (p.l < 0.04 || p.l > 0.99) return false;
    return true;
  });
  return filtered.length >= 8 ? filtered : pixels;
}

function kMeansOklch(points: ColorState[], k: number, iterations = 14): ColorState[] {
  if (points.length <= k) return [...points];
  const centroids: ColorState[] = [];
  for (let i = 0; i < k; i++) {
    centroids.push({ ...points[Math.floor((i * points.length) / k)]! });
  }
  const buckets: ColorState[][] = Array.from({ length: k }, () => []);
  for (let iter = 0; iter < iterations; iter++) {
    for (const bucket of buckets) bucket.length = 0;
    for (const p of points) {
      let best = 0;
      let bestDist = Infinity;
      for (let c = 0; c < k; c++) {
        const d = oklchDist(p, centroids[c]!);
        if (d < bestDist) {
          bestDist = d;
          best = c;
        }
      }
      buckets[best]!.push(p);
    }
    for (let c = 0; c < k; c++) {
      const bucket = buckets[c]!;
      if (bucket.length === 0) continue;
      centroids[c] = {
        h: circularMean(bucket.map((p) => p.h)),
        c: bucket.reduce((s, p) => s + p.c, 0) / bucket.length,
        l: bucket.reduce((s, p) => s + p.l, 0) / bucket.length,
      };
    }
  }
  return centroids.map(clampColorState);
}

function oklchDist(a: ColorState, b: ColorState): number {
  const dh = hueDistance(a.h, b.h) / 180;
  const dc = a.c - b.c;
  const dl = a.l - b.l;
  return dh * dh + dc * dc * 4 + dl * dl * 4;
}

function circularMean(hues: number[]): number {
  let sin = 0;
  let cos = 0;
  for (const h of hues) {
    const rad = (h * Math.PI) / 180;
    sin += Math.sin(rad);
    cos += Math.cos(rad);
  }
  const angle = (Math.atan2(sin, cos) * 180) / Math.PI;
  return angle < 0 ? angle + 360 : angle;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fresh subsample so image regenerate explores the same photo differently. */
function subsamplePixelsForVariation(pixels: ColorState[], seed: number): ColorState[] {
  if (pixels.length <= 48) return pixels;
  const rand = mulberry32(seed);
  const shuffled = [...pixels];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  const keep = Math.max(48, Math.floor(shuffled.length * (0.78 + rand() * 0.16)));
  return shuffled.slice(0, keep);
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function perturbPixelsForVariation(pixels: ColorState[], seed: number): ColorState[] {
  const rand = mulberry32(seed ^ 0x9e3779b9);
  return pixels.map((pixel) =>
    clampColorState({
      h: (pixel.h + (rand() - 0.5) * 10 + 360) % 360,
      c: Math.max(0, pixel.c + (rand() - 0.5) * 0.04),
      l: Math.min(1, Math.max(0, pixel.l + (rand() - 0.5) * 0.05)),
    }),
  );
}

function cropImageData(imageData: ImageData, seed: number): ImageData {
  const rand = mulberry32(seed ^ 0x85ebca6b);
  const { width, height, data } = imageData;
  const cropW = Math.max(1, Math.round(width * (0.68 + rand() * 0.28)));
  const cropH = Math.max(1, Math.round(height * (0.68 + rand() * 0.28)));
  const x0 = Math.floor(rand() * Math.max(1, width - cropW));
  const y0 = Math.floor(rand() * Math.max(1, height - cropH));
  const out = new ImageData(cropW, cropH);
  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const src = ((y0 + y) * width + (x0 + x)) * 4;
      const dst = (y * cropW + x) * 4;
      out.data[dst] = data[src]!;
      out.data[dst + 1] = data[src + 1]!;
      out.data[dst + 2] = data[src + 2]!;
      out.data[dst + 3] = data[src + 3]!;
    }
  }
  return out;
}

function dedupeColors(colors: ColorState[]): ColorState[] {
  const out: ColorState[] = [];
  for (const c of colors) {
    if (out.some((o) => hueDistance(o.h, c.h) < 10 && Math.abs(o.l - c.l) < 0.07 && Math.abs(o.c - c.c) < 0.05)) continue;
    out.push(c);
  }
  return out;
}

function extractCentroidColors(pixels: ColorState[], count: number, rand?: () => number): ColorState[] {
  if (pixels.length <= count) return [...pixels];
  const centroids: ColorState[] = [];
  for (let i = 0; i < count; i++) {
    if (rand) {
      centroids.push({ ...pixels[Math.floor(rand() * pixels.length)]! });
    } else {
      centroids.push({ ...pixels[Math.floor((i * pixels.length) / count)]! });
    }
  }
  const buckets: ColorState[][] = Array.from({ length: count }, () => []);
  for (let iter = 0; iter < 14; iter++) {
    for (const bucket of buckets) bucket.length = 0;
    for (const p of pixels) {
      let best = 0;
      let bestDist = Infinity;
      for (let c = 0; c < count; c++) {
        const d = oklchDist(p, centroids[c]!);
        if (d < bestDist) {
          bestDist = d;
          best = c;
        }
      }
      buckets[best]!.push(p);
    }
    for (let c = 0; c < count; c++) {
      const bucket = buckets[c]!;
      if (bucket.length === 0) continue;
      centroids[c] = {
        h: circularMean(bucket.map((p) => p.h)),
        c: bucket.reduce((s, p) => s + p.c, 0) / bucket.length,
        l: bucket.reduce((s, p) => s + p.l, 0) / bucket.length,
      };
    }
  }
  return centroids.map(clampColorState).sort((a, b) => b.c - a.c);
}

/** Highest-chroma representatives per hue bucket — avoids muddy averages. */
function extractVividColors(pixels: ColorState[], count: number): ColorState[] {
  const sorted = [...pixels].sort((a, b) => b.c - a.c);
  const out: ColorState[] = [];
  for (const pixel of sorted) {
    if (out.length >= count) break;
    if (out.some((picked) => hueDistance(picked.h, pixel.h) < 22)) continue;
    out.push(pixel);
  }
  return out.length > 0 ? out : extractCentroidColors(pixels, count);
}

/** Per cluster: centroid plus the most chromatic outlier. */
function extractAccentColors(pixels: ColorState[], count: number): ColorState[] {
  const k = Math.max(2, Math.min(count, 4));
  const centroids = kMeansOklch(pixels, k);
  const buckets: ColorState[][] = Array.from({ length: k }, () => []);
  for (const p of pixels) {
    let best = 0;
    let bestDist = Infinity;
    for (let c = 0; c < k; c++) {
      const d = oklchDist(p, centroids[c]!);
      if (d < bestDist) {
        bestDist = d;
        best = c;
      }
    }
    buckets[best]!.push(p);
  }
  const out: ColorState[] = [];
  for (let i = 0; i < k; i++) {
    const bucket = buckets[i]!;
    const centroid = centroids[i]!;
    if (bucket.length === 0) {
      out.push(centroid);
      continue;
    }
    const accent = [...bucket].sort((a, b) => b.c * (1 - Math.abs(a.l - 0.5)) - a.c * (1 - Math.abs(b.l - 0.5)))[0]!;
    out.push(centroid, accent);
  }
  return dedupeColors(out).slice(0, count);
}

/** Lightest, darkest, and most saturated anchors from the dominant cluster. */
function extractExtremeColors(pixels: ColorState[], count: number): ColorState[] {
  const dominantHue = extractCentroidColors(pixels, 1)[0]?.h ?? 0;
  const near = pixels.filter((p) => hueDistance(p.h, dominantHue) < 35);
  const pool = near.length >= 8 ? near : pixels;
  const lightest = [...pool].sort((a, b) => b.l - a.l)[0]!;
  const darkest = [...pool].sort((a, b) => a.l - b.l)[0]!;
  const saturated = [...pool].sort((a, b) => b.c - a.c)[0]!;
  const mid = [...pool].sort((a, b) => Math.abs(a.l - 0.5) - Math.abs(b.l - 0.5))[0]!;
  return dedupeColors([saturated, mid, lightest, darkest, ...extractVividColors(pool, count)]).slice(0, count);
}

/** Farthest-point sampling in OKLCH for diverse sets. */
function extractSpreadColors(pixels: ColorState[], count: number): ColorState[] {
  if (pixels.length === 0) return [];
  const sorted = [...pixels].sort((a, b) => b.c - a.c);
  const out: ColorState[] = [sorted[0]!];
  while (out.length < count && out.length < sorted.length) {
    let best: ColorState | null = null;
    let bestScore = -1;
    for (const candidate of sorted) {
      if (out.some((picked) => oklchDist(picked, candidate) < 0.001)) continue;
      const minDist = Math.min(...out.map((picked) => oklchDist(picked, candidate)));
      const score = minDist + candidate.c * 0.35;
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }
    if (!best) break;
    out.push(best);
  }
  return out;
}

export function extractColorsByMethod(
  pixels: ColorState[],
  method: PaletteExtractionMethod,
  count: number,
  rand?: () => number,
): ColorState[] {
  const pool = pixels;
  switch (method) {
    case 'vivid':
      return extractVividColors(pool, count);
    case 'accent':
      return extractAccentColors(pool, count);
    case 'extremes':
      return extractExtremeColors(pool, count);
    case 'spread':
      return extractSpreadColors(pool, count);
    default:
      return extractCentroidColors(pool, count, rand);
  }
}

export function extractDominantColors(pixels: ColorState[], maxColors = 5): ColorState[] {
  return extractCentroidColors(pixels, maxColors);
}

export function proposePalettesFromColors(
  dominant: ColorState[],
  maxSwatches = 5,
  profile: PaletteGenerationProfile = DEFAULT_PALETTE_PROFILE,
): PaletteProposal[] {
  if (dominant.length === 0) return [];
  const pivot = clampToProfile(dominant[0]!, profile);
  const proposals: PaletteProposal[] = [];

  for (const { rule, label } of HARMONY_RULES) {
    let colors: ColorState[];
    if (rule === 'dominant') {
      colors = dominant.slice(0, maxSwatches).map((c) => clampToProfile(c, profile));
    } else if (rule === 'muted') {
      colors = mutedBridgePalette(pivot, maxSwatches);
    } else {
      colors = colorsFromHarmony(pivot, rule, maxSwatches).map((c) => clampToProfile(c, profile));
    }
    proposals.push({
      id: rule,
      label,
      rule,
      method: rule,
      colors: fitPaletteToGamut(
        polishPaletteColors(dedupeColors(colors).slice(0, maxSwatches), profile),
        profile.gamut,
      ),
    });
  }
  return proposals;
}

export function proposePalettesFromPixels(
  pixels: ColorState[],
  options?: {
    maxSwatches?: number;
    profile?: PaletteGenerationProfile;
    methods?: PaletteExtractionMethod[];
    /** Subsample / rotate extractors for a fresh read of the same image. */
    variationSeed?: number;
  },
): PaletteProposal[] {
  const maxSwatches = options?.maxSwatches ?? 5;
  const profile = options?.profile ?? DEFAULT_PALETTE_PROFILE;
  const baseMethods = options?.methods ?? EXTRACTION_METHODS.map((m) => m.method);
  const variationRand = options?.variationSeed != null ? mulberry32(options.variationSeed) : undefined;
  const methods =
    options?.variationSeed != null
      ? seededShuffle(baseMethods, options.variationSeed).slice(0, 3 + (Math.abs(options.variationSeed) % 3))
      : baseMethods;
  let filtered = filterPixelsForImage(pixels);
  if (options?.variationSeed != null) {
    filtered = subsamplePixelsForVariation(filtered, options.variationSeed);
    filtered = perturbPixelsForVariation(filtered, options.variationSeed);
  }
  const proposals: PaletteProposal[] = [];

  for (const method of methods) {
    const extracted = extractColorsByMethod(filtered, method, maxSwatches, variationRand);
    if (extracted.length === 0) continue;
    const methodLabel = EXTRACTION_METHODS.find((m) => m.method === method)?.label ?? method;
    proposals.push({
      id: options?.variationSeed != null ? `${method}-${options.variationSeed}` : method,
      label: methodLabel,
      rule: 'dominant',
      method,
      colors: fitPaletteToGamut(
        polishPaletteColors(dedupeColors(extracted).slice(0, maxSwatches), profile, { fidelity: 'source' }),
        profile.gamut,
      ),
    });
  }
  return proposals;
}

export async function loadImageToImageData(file: Blob): Promise<ImageData> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 360 / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return ctx.getImageData(0, 0, w, h);
}

export async function proposePalettesFromImageFiles(
  files: Blob[],
  options?: {
    maxSwatches?: number;
    profile?: PaletteGenerationProfile;
    methods?: PaletteExtractionMethod[];
    variationSeed?: number;
  },
): Promise<PaletteProposal[]> {
  const sampleStride =
    options?.variationSeed != null ? 2 + (Math.abs(options.variationSeed) % 4) : 3;
  const allPixels: ColorState[] = [];
  for (const file of files) {
    let imageData = await loadImageToImageData(file);
    if (options?.variationSeed != null) {
      imageData = cropImageData(imageData, options.variationSeed);
    }
    allPixels.push(...sampleImageDataToPixels(imageData, sampleStride));
  }
  return proposePalettesFromPixels(allPixels, options);
}
