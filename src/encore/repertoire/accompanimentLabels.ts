import type { EncoreAccompanimentKind } from '../types';

export const ACCOMPANIMENT_LABELS: Record<EncoreAccompanimentKind, string> = {
  vocal_only: 'Vocal only',
  self_accompanied_keys: 'Self on keys',
  other: 'Other / band',
  unknown: 'Not set',
};
