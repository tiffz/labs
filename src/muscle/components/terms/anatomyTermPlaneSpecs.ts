import type { AnatomyStageFrame } from '../../types/anatomyStageFrame';

export type TermPlaneKind = 'sagittal' | 'coronal' | 'transverse';

export const PLANE_TERM_IDS: Record<TermPlaneKind, string> = {
  sagittal: 'term_plane_sagittal',
  coronal: 'term_plane_coronal',
  transverse: 'term_plane_transverse',
};

export const PLANE_COLORS: Record<TermPlaneKind, string> = {
  sagittal: '#2563eb',
  coronal: '#059669',
  transverse: '#d4a017',
};

/** Normalized [0–1] profile in plane-local space (u = width axis, v = height axis). */
const SAGITTAL_PROFILE: ReadonlyArray<[number, number]> = [
  [0.5, 0.96],
  [0.62, 0.92],
  [0.78, 0.86],
  [0.84, 0.78],
  [0.76, 0.68],
  [0.72, 0.56],
  [0.68, 0.44],
  [0.64, 0.3],
  [0.6, 0.16],
  [0.58, 0.04],
  [0.42, 0.02],
  [0.36, 0.14],
  [0.34, 0.28],
  [0.32, 0.42],
  [0.3, 0.56],
  [0.28, 0.7],
  [0.26, 0.82],
  [0.24, 0.9],
  [0.34, 0.94],
  [0.5, 0.96],
];

const CORONAL_PROFILE: ReadonlyArray<[number, number]> = [
  [0.5, 0.96],
  [0.68, 0.9],
  [0.82, 0.82],
  [0.88, 0.72],
  [0.9, 0.58],
  [0.88, 0.44],
  [0.82, 0.3],
  [0.72, 0.16],
  [0.62, 0.04],
  [0.38, 0.04],
  [0.28, 0.16],
  [0.18, 0.3],
  [0.12, 0.44],
  [0.1, 0.58],
  [0.12, 0.72],
  [0.18, 0.82],
  [0.32, 0.9],
  [0.5, 0.96],
];

const TRANSVERSE_PROFILE: ReadonlyArray<[number, number]> = [
  [0.5, 0.5],
  [0.72, 0.42],
  [0.82, 0.5],
  [0.72, 0.58],
  [0.5, 0.62],
  [0.28, 0.58],
  [0.18, 0.5],
  [0.28, 0.42],
  [0.5, 0.5],
];

export type TermPlaneSpec = {
  kind: TermPlaneKind;
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number];
  contour: ReadonlyArray<[number, number, number]>;
  border: ReadonlyArray<[number, number, number]>;
};

function profileToLocalPoints(
  profile: ReadonlyArray<[number, number]>,
  width: number,
  height: number,
): ReadonlyArray<[number, number, number]> {
  return profile.map(([u, v]) => [(u - 0.5) * width, (v - 0.5) * height, 0.003]);
}

function planeBorder(width: number, height: number): ReadonlyArray<[number, number, number]> {
  const halfW = width / 2;
  const halfH = height / 2;
  return [
    [-halfW, -halfH, 0.001],
    [halfW, -halfH, 0.001],
    [halfW, halfH, 0.001],
    [-halfW, halfH, 0.001],
    [-halfW, -halfH, 0.001],
  ];
}

/** Position and size each reference plane against the staged full-body écorché volume. */
export function planeSpecForKind(kind: TermPlaneKind, frame: AnatomyStageFrame): TermPlaneSpec {
  const { center, layout, bounds } = frame;
  const midlineX = layout.position[0];
  const bodyHeight = Math.max(bounds.max[1] - bounds.min[1], 0.5);
  const bodyDepth = Math.max(bounds.max[2] - bounds.min[2], 0.25);
  const fullWidth = Math.max(bounds.max[0] - bounds.min[0], 0.4);
  const bodyCenterX = (bounds.min[0] + bounds.max[0]) / 2;

  if (kind === 'sagittal') {
    const width = bodyDepth * 1.25;
    const height = bodyHeight * 1.1;
    return {
      kind,
      position: [midlineX, center[1], center[2]],
      rotation: [0, Math.PI / 2, 0],
      size: [width, height],
      contour: profileToLocalPoints(SAGITTAL_PROFILE, width, height),
      border: planeBorder(width, height),
    };
  }

  if (kind === 'coronal') {
    const width = fullWidth * 1.05;
    const height = bodyHeight * 1.1;
    return {
      kind,
      position: [bodyCenterX, center[1], center[2]],
      rotation: [0, 0, 0],
      size: [width, height],
      contour: profileToLocalPoints(CORONAL_PROFILE, width, height),
      border: planeBorder(width, height),
    };
  }

  const width = fullWidth * 1.05;
  const depth = bodyDepth * 1.25;
  const cutY = bounds.min[1] + bodyHeight * 0.52;
  return {
    kind,
    position: [bodyCenterX, cutY, center[2]],
    rotation: [Math.PI / 2, 0, 0],
    size: [width, depth],
    contour: profileToLocalPoints(TRANSVERSE_PROFILE, width, depth),
    border: planeBorder(width, depth),
  };
}

export function allPlaneKinds(): TermPlaneKind[] {
  return ['sagittal', 'coronal', 'transverse'];
}

export function planeKindFromTermVisualization(
  visualization: string,
): TermPlaneKind | null {
  if (visualization === 'plane_sagittal') return 'sagittal';
  if (visualization === 'plane_coronal') return 'coronal';
  if (visualization === 'plane_transverse') return 'transverse';
  return null;
}

export function planeKindFromTermId(termId: string): TermPlaneKind | null {
  for (const kind of allPlaneKinds()) {
    if (PLANE_TERM_IDS[kind] === termId) return kind;
  }
  return null;
}
