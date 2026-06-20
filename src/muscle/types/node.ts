export type MuscleRegion =
  | 'fundamentals'
  | 'torso'
  | 'shoulder_neck'
  | 'arm'
  | 'hand'
  | 'leg'
  | 'foot';

/** Canvas can show one Proko module or the combined atlas. */
export type BodyView = 'region' | 'full_body';

export type MuscleNodeType = 'bone' | 'muscle' | 'joint';

export type JointType =
  | 'hinge'
  | 'pivot'
  | 'ball_socket'
  | 'ellipsoid'
  | 'saddle'
  | 'plane';

export type PrimitiveShape = 'box' | 'cylinder' | 'sphere' | 'bucket' | 'egg';

export interface ArtisticContext {
  whyItMatters: string;
  commonMistake: string;
  movementEffect: string;
}

export interface MuscleMemoryNode {
  id: string;
  name: string;
  latinName?: string;
  type: MuscleNodeType;
  region: MuscleRegion;
  layerDepth: 0 | 1 | 2;
  isSurfaceForm: boolean;
  jointType?: JointType;
  originBoneId?: string;
  insertionBoneId?: string;
  subcutaneousLandmarks?: string[];
  primitiveShape: PrimitiveShape;
  /** When true, only shown in Full body atlas — excluded from module study decks. */
  atlasOnly?: boolean;
  artisticContext: ArtisticContext;
  /** Optional layout hint for procedural / robo-skelly placement. */
  layout?: {
    position: [number, number, number];
    rotation?: [number, number, number];
    scale: [number, number, number];
  };
  /** Camera preset key from module cameraPresets. */
  cameraPresetKey?: string;
}

export type WorkoutState = 'new' | 'learning' | 'review';

export interface WorkoutProgress {
  nodeId: string;
  state: WorkoutState;
  interval: number;
  repetitionCount: number;
  easeFactor: number;
  nextReviewDate: number;
}

export interface CameraPreset {
  position: [number, number, number];
  target: [number, number, number];
}

export interface MuscleMemoryModule {
  id: MuscleRegion;
  label: string;
  prokoLessonRefs: string[];
  prerequisiteModuleIds: MuscleRegion[];
  cameraPresets: Record<string, CameraPreset>;
  glbUrl: string;
}

export type WorkoutMode = 'warmup' | 'active';

export type QuizFeedbackKind = 'idle' | 'correct' | 'incorrect';

export interface QuizState {
  targetNodeId: string | null;
  choices: string[];
  feedback: QuizFeedbackKind;
  mistakeNodeId: string | null;
}

export interface RegionManifestEntry {
  nodeId: string;
  meshName: string;
  triangleCount?: number;
}

export interface RegionManifest {
  region: MuscleRegion;
  glbUrl: string;
  meshes: RegionManifestEntry[];
}

export interface MuscleModelManifest {
  version: 1;
  regions: Partial<Record<MuscleRegion, RegionManifest>>;
}
