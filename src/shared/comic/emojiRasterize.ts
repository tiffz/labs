/**
 * Rasterize [Noto Color Emoji](https://fonts.google.com/noto/specimen/Noto+Color+Emoji)
 * (or system color emoji) to a PNG data URL so SVG filters can wash the bitmap.
 * Live color-font `<text>` nodes ignore feColorMatrix.
 *
 * Prefer Noto when it paints ink; fall back to Apple/Segoe when the loaded Noto face
 * draws blank (common with some CBDT/@fontsource builds). Never cache blank frames.
 *
 * Optional solid white outline is baked into the bitmap (dilated alpha) — crisp on photos,
 * not a blurry SVG glow.
 */

const cache = new Map<string, string>();

/** Noto first for brand consistency; system fonts as ink-capable fallbacks. */
export const EMOJI_FONT_STACK =
  '"Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif';

const EMOJI_FONT_CANDIDATES = [
  '"Noto Color Emoji"',
  '"Apple Color Emoji"',
  '"Segoe UI Emoji"',
  'sans-serif',
] as const;

export type EmojiRasterOptions = {
  /** Solid outline width in CSS pixels (before DPR). 0 = none. */
  outlinePx?: number;
  /** Outline fill (default white). */
  outlineColor?: string;
};

function parseOutlineColor(color: string): { r: number; g: number; b: number } {
  const hex = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return {
      r: Number.parseInt(hex.slice(1, 3), 16),
      g: Number.parseInt(hex.slice(3, 5), 16),
      b: Number.parseInt(hex.slice(5, 7), 16),
    };
  }
  return { r: 255, g: 255, b: 255 };
}

export function emojiRasterCacheKey(
  emoji: string,
  pixelSize: number,
  dpr: number,
  outlinePx = 0,
): string {
  return `${emoji}|${Math.round(pixelSize)}|${dpr.toFixed(2)}|o${Math.round(outlinePx)}`;
}

function canvasHasInk(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  try {
    const { data } = ctx.getImageData(0, 0, width, height);
    for (let i = 3; i < data.length; i += 4) {
      if ((data[i] ?? 0) > 8) return true;
    }
  } catch {
    /* tainted / unsupported — assume ok */
    return true;
  }
  return false;
}

async function ensureEmojiFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts?.load) return;
  try {
    await Promise.allSettled([
      document.fonts.load(`64px "Noto Color Emoji"`),
      document.fonts.load(`64px "Apple Color Emoji"`),
      document.fonts.load(`64px "Segoe UI Emoji"`),
    ]);
    await document.fonts.ready;
  } catch {
    /* ignore */
  }
}

/** Dilate glyph alpha into a crisp solid ring, then restore the original emoji on top. */
function applySolidOutline(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  outlinePx: number,
  scale: number,
  outlineColor: string,
): void {
  const radius = Math.max(1, Math.round(outlinePx * scale));
  const src = ctx.getImageData(0, 0, width, height);
  const out = ctx.createImageData(width, height);
  const { r, g, b } = parseOutlineColor(outlineColor);
  const srcData = src.data;
  const outData = out.data;
  const r2 = radius * radius;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      let near = false;
      for (let dy = -radius; dy <= radius && !near; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx * dx + dy * dy > r2) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          if ((srcData[(ny * width + nx) * 4 + 3] ?? 0) > 16) {
            near = true;
            break;
          }
        }
      }
      if (near) {
        outData[i] = r;
        outData[i + 1] = g;
        outData[i + 2] = b;
        outData[i + 3] = 255;
      }
    }
  }

  for (let i = 0; i < srcData.length; i += 4) {
    const a = srcData[i + 3] ?? 0;
    if (a <= 16) continue;
    outData[i] = srcData[i]!;
    outData[i + 1] = srcData[i + 1]!;
    outData[i + 2] = srcData[i + 2]!;
    outData[i + 3] = a;
  }

  ctx.putImageData(out, 0, 0);
}

function drawEmojiOnCanvas(
  emoji: string,
  glyphSize: number,
  scale: number,
  fontFamily: string,
  outlinePx: number,
  outlineColor: string,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined') return null;
  const pad = Math.max(0, outlinePx);
  const logical = glyphSize + pad * 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(logical * scale);
  canvas.height = Math.ceil(logical * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, logical, logical);
  ctx.font = `${glyphSize * 0.92}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, logical / 2, logical / 2 + glyphSize * 0.04);
  if (pad > 0) {
    applySolidOutline(ctx, canvas.width, canvas.height, pad, scale, outlineColor);
  }
  return { canvas, ctx };
}

/** Logical image size (CSS px) for a rasterized glyph including outline padding. */
export function emojiRasterImageSize(glyphSize: number, outlinePx = 0): number {
  return Math.max(8, Math.round(glyphSize)) + Math.max(0, outlinePx) * 2;
}

/** Draw a single emoji glyph to an offscreen canvas; returns a PNG data URL (or null). */
export function rasterizeEmojiToDataUrl(
  emoji: string,
  pixelSize: number,
  dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
  options: EmojiRasterOptions = {},
): string | null {
  const size = Math.max(8, Math.round(pixelSize));
  const outlinePx = Math.max(0, Math.round(options.outlinePx ?? 0));
  const outlineColor = options.outlineColor ?? '#ffffff';
  const key = emojiRasterCacheKey(emoji, size, dpr, outlinePx);
  const hit = cache.get(key);
  if (hit) return hit;
  if (typeof document === 'undefined') return null;

  const scale = Math.min(3, Math.max(1, dpr));
  const families = [EMOJI_FONT_STACK, ...EMOJI_FONT_CANDIDATES];

  for (const family of families) {
    const drawn = drawEmojiOnCanvas(emoji, size, scale, family, outlinePx, outlineColor);
    if (!drawn) continue;
    if (!canvasHasInk(drawn.ctx, drawn.canvas.width, drawn.canvas.height)) continue;
    try {
      const url = drawn.canvas.toDataURL('image/png');
      cache.set(key, url);
      return url;
    } catch {
      continue;
    }
  }
  return null;
}

/** Async variant — waits for emoji fonts so the first paint is not a blank cache entry. */
export async function rasterizeEmojiToDataUrlAsync(
  emoji: string,
  pixelSize: number,
  dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
  options: EmojiRasterOptions = {},
): Promise<string | null> {
  const size = Math.max(8, Math.round(pixelSize));
  const outlinePx = Math.max(0, Math.round(options.outlinePx ?? 0));
  const key = emojiRasterCacheKey(emoji, size, dpr, outlinePx);
  const hit = cache.get(key);
  if (hit) return hit;
  await ensureEmojiFonts();
  return rasterizeEmojiToDataUrl(emoji, size, dpr, options);
}

/** Test helper — clear the in-memory raster cache. */
export function clearEmojiRasterCache(): void {
  cache.clear();
}
