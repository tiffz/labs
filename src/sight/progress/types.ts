import type {
  AlbersProfile,
  ContextualProfile,
  IsolatedProfile,
  ModuleId,
  SightChallenge,
} from '../types';

export const PROFILE_PROGRESS_SCHEMA_VERSION = 5;

export const MAX_RECENT_REPS = 30;

export type SkillVector =
  | 'valueSensation'
  | 'chromaIsolation'
  | 'temperatureIntuition'
  | 'relationalDecoding'
  | 'gamutMapping'
  | 'harmonicAlignment';

export type RepPurpose = 'curriculum' | 'focus' | 'maintenance' | 'practice';

export type GrowthDiagnosticId =
  | 'WARM_VALUE_BLINDNESS'
  | 'CHROMA_OVER_STEERING'
  | 'TEMPERATURE_UNDER_COMPENSATION';

export interface PracticeGenConstraints {
  hueRange?: [number, number];
  minBackgroundChroma?: number;
  maxDeltaE?: number;
  isolatedProfile?: IsolatedProfile;
  contextualProfile?: ContextualProfile;
  albersProfile?: AlbersProfile;
}

export interface GrowthDiagnostic {
  id: GrowthDiagnosticId;
  label: string;
  description: string;
  severityScore: number;
  remedyModule: ModuleId;
  remedyLevel?: number;
  forcedConstraints: PracticeGenConstraints;
}

export interface RepRecord {
  at: string;
  level: number;
  module: ModuleId;
  kind: SightChallenge['kind'];
  skillVector: SkillVector;
  purpose: RepPurpose;
  passed: boolean;
  deltaE?: number;
  accuracyRating?: number;
  overlapPct?: number;
  tags: string[];
}

export interface SkillMatrix {
  valueSensation: number;
  chromaIsolation: number;
  temperatureIntuition: number;
  relationalDecoding: number;
  gamutMapping: number;
  harmonicAlignment: number;
}

export interface DailyQueueItem {
  level: number;
  purpose: RepPurpose;
  focusId?: GrowthDiagnosticId;
  constraints?: PracticeGenConstraints;
}

export interface DailyQueueState {
  date: string;
  items: DailyQueueItem[];
  index: number;
}

export interface DailySessionSummary {
  date: string;
  passed: number;
  total: number;
  avgDeltaE?: number;
  focusCleared?: boolean;
  newFocusId?: GrowthDiagnosticId;
}

export const SKILL_VECTOR_LABELS: Record<SkillVector, string> = {
  valueSensation: 'Value',
  chromaIsolation: 'Chroma',
  temperatureIntuition: 'Temperature',
  relationalDecoding: 'Relational',
  gamutMapping: 'Gamut',
  harmonicAlignment: 'Harmony',
};

export function defaultSkillMatrix(level = 1): SkillMatrix {
  const base = Math.min(72, 38 + level * 2.5);
  return {
    valueSensation: base,
    chromaIsolation: base - 4,
    temperatureIntuition: base - 6,
    relationalDecoding: base - 10,
    gamutMapping: base - 14,
    harmonicAlignment: base - 18,
  };
}
