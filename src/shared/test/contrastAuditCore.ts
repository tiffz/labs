/** WCAG contrast audit helpers — Vitest + e2e (browser fn must stay self-contained). */

export const CONTRAST_AUDIT_DEFAULTS = {
  /** WCAG AA normal text */
  minBodyContrast: 4.5,
  /** WCAG AA large text (≥18px regular or ≥14px bold) */
  minLargeTextContrast: 3,
  largeTextMinPx: 18,
  largeBoldTextMinPx: 14,
} as const;

export type ContrastViolation = {
  text: string;
  ratio: number;
  required: number;
  fgColor: string;
  bgColor: string;
  tag: string;
  className: string;
};

export type ContrastAuditFailure = {
  ok: false;
  violations: ContrastViolation[];
};

export type ContrastAuditSuccess = { ok: true };

export type ContrastAuditResult = ContrastAuditSuccess | ContrastAuditFailure;

export function requiredContrastRatio(
  fontSizePx: number,
  fontWeight: string | number,
  opts: {
    minBodyContrast?: number;
    minLargeTextContrast?: number;
    largeTextMinPx?: number;
    largeBoldTextMinPx?: number;
  } = {},
): number {
  const minBody = opts.minBodyContrast ?? CONTRAST_AUDIT_DEFAULTS.minBodyContrast;
  const minLarge = opts.minLargeTextContrast ?? CONTRAST_AUDIT_DEFAULTS.minLargeTextContrast;
  const largeMin = opts.largeTextMinPx ?? CONTRAST_AUDIT_DEFAULTS.largeTextMinPx;
  const largeBoldMin = opts.largeBoldTextMinPx ?? CONTRAST_AUDIT_DEFAULTS.largeBoldTextMinPx;
  const weight = typeof fontWeight === 'number' ? fontWeight : parseInt(fontWeight, 10) || 400;
  const isLarge = fontSizePx >= largeMin || (fontSizePx >= largeBoldMin && weight >= 700);
  return isLarge ? minLarge : minBody;
}

export {
  contrastRatio,
  parseCssColorToRgb,
  relativeLuminance,
  LAYOUT_HEURISTIC_DEFAULTS,
} from './layoutHeuristicsCore';
