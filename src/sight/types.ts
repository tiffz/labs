import type { CurriculumPhase } from './curriculum/phases';
import type {
  DailyQueueState,
  DailySessionSummary,
  GrowthDiagnostic,
  RepRecord,
  SkillMatrix,
} from './progress/types';

/** Oklch color state used for all generators and scoring. */
export interface ColorState {
  h: number;
  c: number;
  l: number;
}

export type ModuleId =
  | 'flashcard'
  | 'compare'
  | 'contextual'
  | 'bridge'
  | 'gamut'
  | 'anchor-pivot'
  | 'albers-equalizer'
  | 'munsell-slice'
  | 'yot-cast';

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
  | 'chromaLocked'
  | 'hueLocked'
  | 'lightnessChromaLocked'
  | 'full';

/** Which Oklch sliders are fixed for a contextual match drill. */
export interface ContextualLocks {
  lightness: boolean;
  chroma: boolean;
  hue: boolean;
}

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
  locked: ContextualLocks;
  display: 'adjacent' | 'flat' | 'contextual';
  startLightnessDelta?: number;
  startChromaDelta?: number;
  startHueDelta?: number;
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

export type HarmonySystem = 'complementary' | 'splitComplementary' | 'triadic' | 'tetradic';

export interface AnchorPivotChallenge {
  kind: 'anchor-pivot';
  seed: number;
  system: HarmonySystem;
  targetAngles: number[];
  targetChroma: number;
  targetLightness: number;
  pivotHue: number;
}

export type AlbersEqualizerPair = 'warm-cool' | 'saturation-contrast';

export interface AlbersEqualizerChallenge {
  kind: 'albers-equalizer';
  seed: number;
  left: AlbersField;
  right: AlbersField;
  backgroundPair: AlbersEqualizerPair;
}

export type MunsellSliceAxis = 'value' | 'chroma';

export interface MunsellSliceChallenge {
  kind: 'munsell-slice';
  seed: number;
  axis: MunsellSliceAxis;
  swatches: ColorState[];
  outlierIndex: number;
}

export type YotLightPrompt = 'goldenHour' | 'blueCave' | 'overcast' | 'neonAlley';

export interface YotFlat {
  id: string;
  local: ColorState;
}

export interface YotCastChallenge {
  kind: 'yot-cast';
  seed: number;
  lightPrompt: YotLightPrompt;
  flats: YotFlat[];
  options: ColorState[][];
  correctIndex: number;
}

export type SightChallenge =
  | CompareChallenge
  | FlashcardChallenge
  | ContextualChallenge
  | BridgeChallenge
  | GamutChallenge
  | AnchorPivotChallenge
  | AlbersEqualizerChallenge
  | MunsellSliceChallenge
  | YotCastChallenge;

export interface PracticeRound {
  level: number;
  challenge: SightChallenge;
}

export interface SightProfile {
  /** Level the learner is working toward (pass gate applies here). */
  level: number;
  /** Highest level unlocked; may be above `level` when revisiting earlier levels. */
  peakLevel?: number;
  challengesCompleted: number;
  passesAtLevel: number;
  schemaVersion?: number;
  skillMatrix: SkillMatrix;
  recentReps: RepRecord[];
  activeFocus: GrowthDiagnostic | null;
  dailyQueue: DailyQueueState | null;
  lastDailySummary?: DailySessionSummary;
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
    }
  | {
      kind: 'munsell-slice';
      challenge: MunsellSliceChallenge;
      pickedIndex: number;
      passed: boolean;
    }
  | {
      kind: 'albers-equalizer';
      passed: boolean;
      accuracyRating: number;
      deltaE: number;
    }
  | {
      kind: 'anchor-pivot';
      passed: boolean;
      angularScore: number;
      maxAngularError: number;
    }
  | {
      kind: 'yot-cast';
      challenge: YotCastChallenge;
      pickedIndex: number;
      passed: boolean;
    };
