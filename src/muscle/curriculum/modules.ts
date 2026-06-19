import type { MuscleMemoryModule } from '../types/node';

const DEFAULT_PRESETS = {
  head: { position: [0, 2.0, 2.5] as [number, number, number], target: [0, 2.0, 0] as [number, number, number] },
  chest: { position: [0, 1.2, 2.2] as [number, number, number], target: [0, 1.0, 0] as [number, number, number] },
  back: { position: [0, 1.2, -2.2] as [number, number, number], target: [0, 1.0, 0] as [number, number, number] },
  shoulder: { position: [1.8, 1.5, 1.2] as [number, number, number], target: [0.4, 1.4, 0] as [number, number, number] },
  arm: { position: [2.0, 1.2, 0.5] as [number, number, number], target: [0.5, 1.0, 0] as [number, number, number] },
  elbow: { position: [1.6, 0.9, 1.0] as [number, number, number], target: [0.5, 0.9, 0] as [number, number, number] },
  forearm: { position: [1.8, 0.7, 0.8] as [number, number, number], target: [0.55, 0.7, 0] as [number, number, number] },
  pelvis: { position: [0, 0.3, 2.0] as [number, number, number], target: [0, 0.2, 0] as [number, number, number] },
  leg: { position: [0.8, -0.5, 2.0] as [number, number, number], target: [0.2, -0.5, 0] as [number, number, number] },
  knee: { position: [0.9, -0.65, 1.6] as [number, number, number], target: [0.2, -0.65, 0] as [number, number, number] },
  hand: { position: [1.2, 0.5, 1.4] as [number, number, number], target: [0.62, 0.5, 0] as [number, number, number] },
  foot: { position: [0.6, -1.4, 1.8] as [number, number, number], target: [0.2, -1.4, 0] as [number, number, number] },
};

export const MUSCLE_MODULES: MuscleMemoryModule[] = [
  {
    id: 'fundamentals',
    label: 'Fundamentals',
    prokoLessonRefs: ['Proko Figure Drawing — Structure Basics'],
    prerequisiteModuleIds: [],
    cameraPresets: DEFAULT_PRESETS,
    glbUrl: '/muscle/models/fundamentals.glb',
  },
  {
    id: 'torso',
    label: 'Torso',
    prokoLessonRefs: ['Proko Anatomy — Torso'],
    prerequisiteModuleIds: ['fundamentals'],
    cameraPresets: DEFAULT_PRESETS,
    glbUrl: '/muscle/models/torso.glb',
  },
  {
    id: 'shoulder_neck',
    label: 'Shoulder & neck',
    prokoLessonRefs: ['Proko Anatomy — Shoulder'],
    prerequisiteModuleIds: ['fundamentals'],
    cameraPresets: DEFAULT_PRESETS,
    glbUrl: '/muscle/models/shoulder_neck.glb',
  },
  {
    id: 'arm',
    label: 'Arm',
    prokoLessonRefs: ['Proko Anatomy — Arms'],
    prerequisiteModuleIds: ['fundamentals', 'shoulder_neck'],
    cameraPresets: DEFAULT_PRESETS,
    glbUrl: '/muscle/models/arm.glb',
  },
  {
    id: 'hand',
    label: 'Hand',
    prokoLessonRefs: ['Proko Anatomy — Hands'],
    prerequisiteModuleIds: ['fundamentals', 'arm'],
    cameraPresets: DEFAULT_PRESETS,
    glbUrl: '/muscle/models/hand.glb',
  },
  {
    id: 'leg',
    label: 'Leg',
    prokoLessonRefs: ['Proko Anatomy — Legs'],
    prerequisiteModuleIds: ['fundamentals'],
    cameraPresets: DEFAULT_PRESETS,
    glbUrl: '/muscle/models/leg.glb',
  },
  {
    id: 'foot',
    label: 'Foot',
    prokoLessonRefs: ['Proko Anatomy — Feet'],
    prerequisiteModuleIds: ['fundamentals', 'leg'],
    cameraPresets: DEFAULT_PRESETS,
    glbUrl: '/muscle/models/foot.glb',
  },
];

export const MODULE_BY_ID = new Map(MUSCLE_MODULES.map((m) => [m.id, m]));

export function getModuleById(id: MuscleMemoryModule['id']): MuscleMemoryModule {
  const mod = MODULE_BY_ID.get(id);
  if (!mod) throw new Error(`Unknown module: ${id}`);
  return mod;
}
