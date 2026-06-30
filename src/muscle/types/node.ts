/** 0 superficial · 1 intermediate · 2 deep · 3 skeleton (bones/joints). */
export type MuscleLayerDepth = 0 | 1 | 2 | 3;

export type MuscleRegion =
  | 'anatomy_terms'
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

export interface StructureDetails {
  /** 1–2 sentences: visible form + drawing role (artist voice). */
  definition: string;
  colloquialNames?: string[];
  latinName?: string;
  /** Verified only — see scripts/verify-anatomy-links.mjs */
  wikipediaUrl?: string;
  learnMore?: { label: string; url: string }[];
}

export interface MuscleMemoryNode {
  id: string;
  name: string;
  type: MuscleNodeType;
  region: MuscleRegion;
  /** Anatomical peel layer — see MuscleLayerDepth. */
  layerDepth: MuscleLayerDepth;
  isSurfaceForm: boolean;
  jointType?: JointType;
  originBoneId?: string;
  insertionBoneId?: string;
  subcutaneousLandmarks?: string[];
  primitiveShape: PrimitiveShape;
  /** When true, only shown in Full body atlas — excluded from module study decks. */
  atlasOnly?: boolean;
  details: StructureDetails;
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

export type QuizMode =
  | 'identify_highlight'
  | 'locate_name'
  | 'identify_region'
  | 'term_direction';

export type QuizFeedbackKind = 'idle' | 'correct' | 'incorrect';

export interface QuizState {
  targetNodeId: string | null;
  choices: string[];
  feedback: QuizFeedbackKind;
  mistakeNodeId: string | null;
  /** When locate_name, hide MCQ buttons. */
  quizMode: QuizMode;
  /** Shown instead of highlight for locate_name. */
  promptName: string | null;
}

export type ModuleGuidePhase = 'intro' | 'lesson' | 'explore' | 'quiz' | 'complete';

export interface ModuleGuideProgress {
  moduleId: MuscleRegion;
  phase: ModuleGuidePhase;
  lessonStepIndex: number;
  completedAt?: number;
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
