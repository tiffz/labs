import {
  bleedConfigForLabsPrintSpec,
  trimSizeFromLabsPrintSpec,
  type LabsPrintSpec,
} from '../zine/labsPrintSpec';

/** Normalized trim-space insets where panel gutters should stay inside (quiet zone). */
export type LayoutSafeInsets = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type LayoutSafeRegion = LayoutSafeInsets & {
  x: number;
  y: number;
  width: number;
  height: number;
};

const DEFAULT_QUIET_FRACTION = 0.045;

/** Quiet-zone insets for generated panel layouts (Mixam-style best practice). */
export function getLayoutSafeInsets(printSpec?: LabsPrintSpec): LayoutSafeInsets {
  if (!printSpec) {
    const m = DEFAULT_QUIET_FRACTION;
    return { left: m, top: m, right: m, bottom: m };
  }

  const trim = trimSizeFromLabsPrintSpec(printSpec);
  const bleed = bleedConfigForLabsPrintSpec(printSpec);
  const quietIn = bleed.quietArea;
  const gutterIn = bleed.gutter ?? 0;

  const left = (quietIn + gutterIn) / trim.width;
  const right = quietIn / trim.width;
  const top = quietIn / trim.height;
  const bottom = quietIn / trim.height;

  return {
    left: Math.min(left, 0.18),
    top: Math.min(top, 0.18),
    right: Math.min(right, 0.18),
    bottom: Math.min(bottom, 0.18),
  };
}

export function getLayoutSafeRegion(printSpec?: LabsPrintSpec): LayoutSafeRegion {
  const insets = getLayoutSafeInsets(printSpec);
  return {
    ...insets,
    x: insets.left,
    y: insets.top,
    width: Math.max(0.5, 1 - insets.left - insets.right),
    height: Math.max(0.5, 1 - insets.top - insets.bottom),
  };
}
