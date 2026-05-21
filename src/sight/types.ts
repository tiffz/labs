/** Oklch color state used for all generators and scoring. */
export interface ColorState {
  h: number;
  c: number;
  l: number;
}

export type ModuleId = 'compare' | 'contextual' | 'bridge' | 'gamut';

export type CompareAxis = 'lighter' | 'darker' | 'moreSaturated' | 'lessSaturated';

export type CompareProfile = 'light' | 'saturationEasy' | 'saturationHard' | 'mixed';

export type ContextualProfile = 'flatNeutral' | 'valueLocked' | 'hueLocked' | 'full';

export type BridgeProfile = 'singleAxis' | 'warmCool';

export type GamutProfile = 'wide' | 'compressed';

export interface LevelConfig {
  level: number;
  module: ModuleId;
  label: string;
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

export interface ContextualChallenge {
  kind: 'contextual';
  seed: number;
  target: ColorState;
  background: ColorState;
  locked: { hue: boolean; chroma: boolean };
  /** Same neutral behind target and match workspace (intro level). */
  display: 'flat' | 'contextual';
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

export type SightChallenge = CompareChallenge | ContextualChallenge | BridgeChallenge | GamutChallenge;

export interface PracticeRound {
  level: number;
  challenge: SightChallenge;
}

export interface SightProfile {
  level: number;
  challengesCompleted: number;
  /** Consecutive passes at the current level (resets on fail or level-up). */
  passesAtLevel: number;
  /** Bumped when curriculum level count changes; drives migration in storage. */
  schemaVersion?: number;
}

/** Shown after submit / compare tap until the next challenge loads. */
export type PracticeReveal =
  | {
      kind: 'contextual';
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
