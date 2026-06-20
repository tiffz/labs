import type { MuscleMemoryNode } from '../../types/node';
import type { MeshVisualState } from './meshState';

export const ANATOMY_COLORS = {
  /** Rose-coral — between dusty pink and terra cotta; reads clearly against skin. */
  muscle: '#b87a82',
  bone: '#faf6f0',
  joint: '#c5d0de',
  /** Warm living skin tone for the envelope. */
  skin: '#e4b896',
  /** Sclera / cornea — slightly lighter than skin. */
  eyeGlobe: '#f4f0ea',
  faded: '#6b7280',
  highlight: '#2563eb',
  hover: '#f5f0e8',
  correct: '#059669',
  incorrect: '#dc2626',
  subcutaneous: '#d4a017',
} as const;

export function baseColorForNode(node: MuscleMemoryNode | undefined): string {
  if (!node) return ANATOMY_COLORS.muscle;
  if (node.type === 'bone') return ANATOMY_COLORS.bone;
  if (node.type === 'joint') return ANATOMY_COLORS.joint;
  return ANATOMY_COLORS.muscle;
}

export function outlineColorForState(state: MeshVisualState): string | null {
  switch (state) {
    case 'highlight':
      return ANATOMY_COLORS.highlight;
    case 'hover':
      return ANATOMY_COLORS.hover;
    case 'correct':
      return ANATOMY_COLORS.correct;
    case 'incorrect':
      return ANATOMY_COLORS.incorrect;
    default:
      return null;
  }
}

/** Low-poly procedural meshes only — dense GLB anatomy uses emissive tint instead. */
export function shouldShowOutline(state: MeshVisualState, showSubcutaneous: boolean): boolean {
  return showSubcutaneous || state === 'hover' || state === 'correct' || state === 'incorrect';
}

export function emissiveForState(state: MeshVisualState): { color: string; intensity: number } {
  switch (state) {
    case 'hover':
      return { color: ANATOMY_COLORS.hover, intensity: 0.18 };
    case 'highlight':
      return { color: ANATOMY_COLORS.highlight, intensity: 0.42 };
    case 'correct':
      return { color: ANATOMY_COLORS.correct, intensity: 0.38 };
    case 'incorrect':
      return { color: ANATOMY_COLORS.incorrect, intensity: 0.38 };
    default:
      return { color: '#000000', intensity: 0 };
  }
}

export function opacityForState(
  state: MeshVisualState,
  wireframe: boolean,
  options?: { exploration?: boolean },
): number {
  if (state === 'faded') return options?.exploration ? 0.42 : 0.22;
  return wireframe ? 0.88 : 1;
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  const value = Number.parseInt(normalized, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`;
}

function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const ratio = Math.min(1, Math.max(0, t));
  return rgbToHex(
    ar + (br - ar) * ratio,
    ag + (bg - ag) * ratio,
    ab + (bb - ab) * ratio,
  );
}

export function colorForVisualState(baseColor: string, state: MeshVisualState): string {
  if (state === 'faded') return ANATOMY_COLORS.faded;
  if (state === 'hover') return mixHex(baseColor, ANATOMY_COLORS.hover, 0.22);
  if (state === 'highlight') return mixHex(baseColor, ANATOMY_COLORS.highlight, 0.28);
  if (state === 'correct') return mixHex(baseColor, ANATOMY_COLORS.correct, 0.32);
  if (state === 'incorrect') return mixHex(baseColor, ANATOMY_COLORS.incorrect, 0.32);
  return baseColor;
}
