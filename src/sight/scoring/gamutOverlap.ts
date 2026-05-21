import type { ColorState } from '../types';

export interface WheelPoint {
  h: number;
  c: number;
}

export function colorsToWheelPoints(colors: ColorState[]): WheelPoint[] {
  return colors.map((c) => ({ h: c.h, c: c.c }));
}

/**
 * % of artwork sample points inside the true gamut that also fall inside the user mask.
 */
export function gamutOverlapPct(truthMask: WheelPoint[], userMask: WheelPoint[], samplePoints: WheelPoint[]): number {
  const inTruth = samplePoints.filter((p) => pointInPolygon(p, truthMask));
  if (inTruth.length === 0) return 0;
  const covered = inTruth.filter((p) => pointInPolygon(p, userMask)).length;
  return (covered / inTruth.length) * 100;
}

function pointInPolygon(p: WheelPoint, poly: WheelPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const pi = poly[i]!;
    const pj = poly[j]!;
    const intersect =
      pi.c > p.c !== pj.c > p.c &&
      p.h < ((pj.h - pi.h) * (p.c - pi.c)) / (pj.c - pi.c + 1e-9) + pi.h;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function maskCentroid(vertices: WheelPoint[]): WheelPoint {
  if (vertices.length === 0) return { h: 0, c: 0 };
  const h = vertices.reduce((s, v) => s + v.h, 0) / vertices.length;
  const c = vertices.reduce((s, v) => s + v.c, 0) / vertices.length;
  return { h, c };
}

export function deformMask(
  vertices: WheelPoint[],
  delta: { h: number; c: number; scale: number },
): WheelPoint[] {
  const center = maskCentroid(vertices);
  return vertices.map((v) => ({
    h: ((v.h - center.h) * delta.scale + center.h + delta.h + 360) % 360,
    c: Math.max(0, Math.min(0.4, (v.c - center.c) * delta.scale + center.c + delta.c)),
  }));
}
