import type { ColorState } from '../types';

export interface WheelPoint {
  h: number;
  c: number;
}

export function colorsToWheelPoints(colors: ColorState[]): WheelPoint[] {
  return colors.map((c) => ({ h: c.h, c: c.c }));
}

/** Circular mean hue for unwrap reference (degrees). */
export function maskHueCenter(poly: WheelPoint[]): number {
  if (poly.length === 0) return 0;
  let sin = 0;
  let cos = 0;
  for (const v of poly) {
    const rad = (v.h * Math.PI) / 180;
    sin += Math.sin(rad);
    cos += Math.cos(rad);
  }
  return (Math.atan2(sin, cos) * 180) / Math.PI;
}

function unwrapHue(h: number, center: number): number {
  let d = h - center;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return center + d;
}

/** Same polar layout as `GamutWheelCanvas` (hue → angle, chroma → radius). */
function wheelPointToPlane(p: WheelPoint): { x: number; y: number } {
  const angle = (p.h / 360) * Math.PI * 2 - Math.PI / 2;
  return { x: Math.cos(angle) * p.c, y: Math.sin(angle) * p.c };
}

/**
 * Point-in-polygon in the wheel's polar plane so coverage matches what you see on the canvas.
 */
export function pointInPolygon(p: WheelPoint, poly: WheelPoint[]): boolean {
  if (poly.length < 3) return false;
  const { x: px, y: py } = wheelPointToPlane(p);

  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const { x: xi, y: yi } = wheelPointToPlane(poly[i]!);
    const { x: xj, y: yj } = wheelPointToPlane(poly[j]!);
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * % of landscape sample points (white dots) covered by the user mask.
 * Samples are generated inside the target gamut; align the pink mask to cover them.
 */
export function gamutOverlapPct(
  _truthMask: WheelPoint[],
  userMask: WheelPoint[],
  samplePoints: WheelPoint[],
): number {
  if (samplePoints.length === 0) return 0;
  const covered = samplePoints.filter((p) => pointInPolygon(p, userMask)).length;
  return (covered / samplePoints.length) * 100;
}

export function maskCentroid(vertices: WheelPoint[]): WheelPoint {
  if (vertices.length === 0) return { h: 0, c: 0 };
  const h = maskHueCenter(vertices);
  const c = vertices.reduce((s, v) => s + v.c, 0) / vertices.length;
  return { h, c };
}

export function deformMask(
  vertices: WheelPoint[],
  delta: { h: number; c: number; scale: number },
): WheelPoint[] {
  const center = maskCentroid(vertices);
  return vertices.map((v) => {
    const dh = ((unwrapHue(v.h, center.h) - center.h) * delta.scale + center.h + delta.h + 360) % 360;
    const dc = (v.c - center.c) * delta.scale + center.c + delta.c;
    return {
      h: dh,
      c: Math.max(0, Math.min(0.4, dc)),
    };
  });
}

/** Brute-force best deform for scoring / dev tools. */
export function findBestGamutDeform(
  truthMask: WheelPoint[],
  samples: WheelPoint[],
): { h: number; c: number; scale: number; overlapPct: number } {
  let best = { h: 0, c: 0, scale: 1, overlapPct: 0 };
  for (let h = -45; h <= 45; h += 5) {
    for (let scale = 0.7; scale <= 1.35; scale += 0.05) {
      for (let c = -0.04; c <= 0.04; c += 0.02) {
        const user = deformMask(truthMask, { h, c, scale });
        const overlapPct = gamutOverlapPct(truthMask, user, samples);
        if (overlapPct > best.overlapPct) {
          best = { h, c, scale, overlapPct };
        }
      }
    }
  }
  return best;
}
