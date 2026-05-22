import type { CurriculumPhase } from './curriculum/phases';

/** Oklch color state used for all generators and scoring. */
export interface ColorState {
  h: number;
  c: number;
  l: number;
}

export type ModuleId = 'flashcard' | 'compare' | 'contextual' | 'bridge' | 'gamut';

export type CompareAxis = 'lighter' | 'darker' | 'moreSaturated' | 'lessSaturated';

export type IsolatedAxis = CompareAxis | 'warmer' | 'cooler';

export type CompareProfile = 'light' | 'saturationEasy' | 'saturationHard' | 'mixed';

export type IsolatedProfile =
  | 'valueGrayscale'
  | 'valueHueContrast'
  | 'valueNearMatch'
  | 'chromaEasy'
  | 'chromaHard'
  | 'temperatureUndertone'
  | 'temperatureHueBoundary';

export type FlashcardKind = 'isolated' | 'albers';

export type AlbersProfile = 'identity' | 'perceivedValue' | 'perceivedTemperature' | 'perceivedChroma';

export type AlbersQuestionKind =
  | 'identity'
  | 'perceivedLighter'
  | 'perceivedDarker'
  | 'perceivedWarmer'
  | 'perceivedCooler'
  | 'perceivedMoreSaturated'
  | 'perceivedLessSaturated';

export type ContextualProfile =
  | 'adjacentFlat'
  | 'flatNeutral'
  | 'valueLocked'
  | 'hueLocked'
  | 'full';

export type BridgeProfile = 'singleAxis' | 'warmCool';

export type GamutProfile = 'wide' | 'compressed';

export interface LevelConfig {
  level: number;
  module: ModuleId;
  label: string;
  phase?: CurriculumPhase;
  flashcardKind?: FlashcardKind;
  isolatedProfile?: IsolatedProfile;
  albersProfile?: AlbersProfile;
  compareProfile?: CompareProfile;
  contextualProfile?: ContextualProfile;
  bridgeProfile?: BridgeProfile;
  gamutProfile?: GamutProfile;
  maxDeltaE?: number;
  maxBridgeVariancePct?: number;
  minGamutOverlapPct?: number;
}

export interface CompareChallenge {
  kind: 'compare';
  seed: number;
  axis: CompareAxis;
  left: ColorState;
  right: ColorState;
  correctSide: 'left' | 'right';
}

export interface IsolatedFlashcardChallenge {
  kind: 'flashcard-isolated';
  seed: number;
  profile: IsolatedProfile;
  axis: IsolatedAxis;
  left: ColorState;
  right: ColorState;
  correctSide: 'left' | 'right';
}

export interface AlbersField {
  background: ColorState;
  target: ColorState;
}

export interface AlbersFlashcardChallenge {
  kind: 'flashcard-albers';
  seed: number;
  profile: AlbersProfile;
  question: AlbersQuestionKind;
  left: AlbersField;
  right: AlbersField;
  targetsIdentical: boolean;
  correctSide: 'left' | 'right' | null;
  correctBinary: 'same' | 'different' | null;
}

export type FlashcardChallenge = IsolatedFlashcardChallenge | AlbersFlashcardChallenge;

export interface ContextualChallenge {
  kind: 'contextual';
  seed: number;
  target: ColorState;
  background: ColorState;
  locked: { hue: boolean; chroma: boolean };
  display: 'adjacent' | 'flat' | 'contextual';
  startLightnessDelta?: number;
}

export interface BridgeChallenge {
  kind: 'bridge';
  seed: number;
  keyA: ColorState;
  keyB: ColorState;
  referenceSteps: ColorState[];
  emptyIndices: number[];
  stepCount: number;
}

export interface GamutChallenge {
  kind: 'gamut';
  seed: number;
  colors: { skyA: ColorState; skyB: ColorState; bg: ColorState; mid: ColorState; fg: ColorState };
  maskVertices: Array<{ h: number; c: number }>;
  maskShape: 'triangle' | 'square' | 'diamond';
}

export type SightChallenge =
  | CompareChallenge
  | FlashcardChallenge
  | ContextualChallenge
  | BridgeChallenge
  | GamutChallenge;

export interface PracticeRound {
  level: number;
  challenge: SightChallenge;
}

export interface SightProfile {
  level: number;
  challengesCompleted: number;
  passesAtLevel: number;
  schemaVersion?: number;
}

/** Shown after submit / compare tap until the next challenge loads. */
export type PracticeReveal =
  | {
      kind: 'contextual';
      target: ColorState;
      input: ColorState;
      targetHex: string;
      inputHex: string;
      passed: boolean;
      accuracyRating: number;
      deltaE: number;
    }
  | {
      kind: 'compare';
      challenge: CompareChallenge;
      pickedSide: 'left' | 'right';
      passed: boolean;
    }
  | {
      kind: 'flashcard-isolated';
      challenge: IsolatedFlashcardChallenge;
      pickedSide: 'left' | 'right';
      passed: boolean;
    }
  | {
      kind: 'flashcard-albers';
      challenge: AlbersFlashcardChallenge;
      pickedSide?: 'left' | 'right';
      pickedBinary?: 'same' | 'different';
      passed: boolean;
    }
  | {
      kind: 'bridge';
      challenge: BridgeChallenge;
      userSteps: ColorState[];
      passed: boolean;
      closenessPct: number;
    }
  | {
      kind: 'gamut';
      passed: boolean;
      overlapPct: number;
      minPct: number;
    };
