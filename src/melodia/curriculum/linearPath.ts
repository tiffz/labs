import pathConfig from './path.json';

const SEED_FALLBACK_IDS = [
  'melodia-b1-001',
  'melodia-b1-002',
  'melodia-b1-003',
] as const;

interface PathConfig {
  exerciseIds?: unknown;
  version?: number;
  generatedBy?: string;
}

function readConfiguredIds(): readonly string[] {
  const cfg = pathConfig as PathConfig;
  const ids = cfg.exerciseIds;
  if (!Array.isArray(ids)) return SEED_FALLBACK_IDS;
  const filtered = ids.filter((v): v is string => typeof v === 'string' && v.length > 0);
  return filtered.length > 0 ? filtered : SEED_FALLBACK_IDS;
}

const RESOLVED_IDS = readConfiguredIds();

export function linearCurriculumLength(): number {
  return RESOLVED_IDS.length;
}

export function getLinearCurriculumExerciseId(index: number): string | undefined {
  return RESOLVED_IDS[index];
}
