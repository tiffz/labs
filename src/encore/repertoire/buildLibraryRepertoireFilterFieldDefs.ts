import type { EncoreFilterFieldConfig } from '../ui/EncoreFilterChipBar';
import type { EncoreMilestoneDefinition, EncorePerformance, EncoreSong } from '../types';
import { ENCORE_FILTER_SENTINEL } from '../utils/encoreFilterSentinels';
import { ENCORE_PERFORMANCE_KEY_OPTIONS } from './performanceKeys';
import { collectAllSongTags } from './songTags';

export function buildLibraryRepertoireFilterFieldDefs(opts: {
  songs: EncoreSong[];
  performances: EncorePerformance[];
  venueCatalog: string[];
  milestoneTemplate: EncoreMilestoneDefinition[];
}): EncoreFilterFieldConfig[] {
  const { songs, performances, venueCatalog, milestoneTemplate } = opts;

  const venueSet = new Set<string>();
  for (const v of venueCatalog) {
    const t = v.trim();
    if (t) venueSet.add(t);
  }
  for (const p of performances) {
    const t = p.venueTag.trim();
    if (t) venueSet.add(t);
  }
  const venueOpts = [
    { value: ENCORE_FILTER_SENTINEL.repertoireNoPerformances, label: 'No performances yet' },
    ...[...venueSet].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })).map((v) => ({ value: v, label: v })),
  ];

  const tagOpts = [
    { value: ENCORE_FILTER_SENTINEL.blankTags, label: 'No tags' },
    ...collectAllSongTags(songs).map((t) => ({ value: t, label: t })),
  ];

  const artistOpts = [
    { value: ENCORE_FILTER_SENTINEL.blankArtist, label: 'No artist' },
    ...[...new Set(songs.map((s) => s.artist.trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      .map((a) => ({ value: a, label: a })),
  ];

  const keyOpts = [
    { value: ENCORE_FILTER_SENTINEL.blankKey, label: 'No key set' },
    ...[...new Set([...ENCORE_PERFORMANCE_KEY_OPTIONS, ...songs.map((s) => s.performanceKey?.trim()).filter(Boolean) as string[]])].sort(
      (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }),
    ).map((k) => ({ value: k, label: k })),
  ];

  const milestoneWhichFieldOptions = [...milestoneTemplate]
    .filter((m) => !m.archived)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
    .map((m) => ({ value: m.id, label: m.label }));

  const tmpl = milestoneTemplate.filter((m) => !m.archived).length;
  const songOnlyMax = songs.reduce((m, s) => Math.max(m, (s.songOnlyMilestones ?? []).length), 0);
  const cap = Math.min(48, Math.max(1, tmpl + songOnlyMax));
  const milestoneCountFilterOptions = Array.from({ length: cap + 1 }, (_, i) => ({ value: String(i), label: String(i) }));

  const assetPair: EncoreFilterFieldConfig[] = [
    {
      id: 'assetRefs',
      label: 'References',
      exclusive: true,
      options: [
        { value: 'with', label: 'Has reference tracks' },
        { value: 'without', label: 'No reference tracks' },
      ],
    },
    {
      id: 'assetBacking',
      label: 'Backing tracks',
      exclusive: true,
      options: [
        { value: 'with', label: 'Has backing tracks' },
        { value: 'without', label: 'No backing tracks' },
      ],
    },
    {
      id: 'assetSpotify',
      label: 'Spotify source',
      exclusive: true,
      options: [
        { value: 'with', label: 'Spotify info source set' },
        { value: 'without', label: 'No Spotify source' },
      ],
    },
    {
      id: 'assetCharts',
      label: 'Charts',
      exclusive: true,
      options: [
        { value: 'with', label: 'Has charts' },
        { value: 'without', label: 'No charts' },
      ],
    },
    {
      id: 'assetTakes',
      label: 'Takes',
      exclusive: true,
      options: [
        { value: 'with', label: 'Has takes' },
        { value: 'without', label: 'No takes' },
      ],
    },
  ];

  const milestoneFields: EncoreFilterFieldConfig[] = [];
  if (milestoneWhichFieldOptions.length > 0) {
    milestoneFields.push({
      id: 'milestoneWhich',
      label: 'Milestone checked off',
      allowEmptyOptions: true,
      options: milestoneWhichFieldOptions,
    });
    milestoneFields.push({
      id: 'milestoneNotDone',
      label: 'Milestone not complete',
      allowEmptyOptions: true,
      options: milestoneWhichFieldOptions,
    });
  }
  milestoneFields.push(
    {
      id: 'milestoneDoneMin',
      label: 'Done count (min)',
      exclusive: true,
      options: milestoneCountFilterOptions,
    },
    {
      id: 'milestoneDoneMax',
      label: 'Done count (max)',
      exclusive: true,
      options: milestoneCountFilterOptions,
    },
  );

  return [
    {
      id: 'performed',
      label: 'Performed',
      exclusive: true,
      options: [
        { value: 'with', label: 'With performances' },
        { value: 'none', label: 'None yet' },
      ],
    },
    {
      id: 'practicing',
      label: 'Status',
      exclusive: true,
      options: [
        { value: 'practicing', label: 'Currently practicing' },
        { value: 'not_practicing', label: 'Not practicing' },
      ],
    },
    { id: 'venue', label: 'Venue', options: venueOpts, supportsExclude: true },
    { id: 'tags', label: 'Tags', options: tagOpts, supportsExclude: true },
    { id: 'artist', label: 'Artist', options: artistOpts, supportsExclude: true },
    { id: 'perfKey', label: 'Key', options: keyOpts, supportsExclude: true },
    ...assetPair,
    ...milestoneFields,
  ];
}
