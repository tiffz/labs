import type { EncoreFilterFieldConfig } from '../ui/EncoreFilterChipBar';
import type { EncoreOriginalSong } from './types';
import { encoreDateRangeFilterField } from '../utils/encoreFilterFieldHelpers';

export function buildOriginalsFilterFieldDefs(originals: EncoreOriginalSong[]): EncoreFilterFieldConfig[] {
  const keys = [...new Set(originals.map((o) => o.key).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' }),
  );

  return [
    {
      id: 'key',
      label: 'Key',
      exclusive: true,
      options: keys.map((k) => ({ value: k, label: k })),
      allowEmptyOptions: true,
    },
    encoreDateRangeFilterField('started', 'Started'),
    encoreDateRangeFilterField('updated', 'Updated'),
  ];
}
