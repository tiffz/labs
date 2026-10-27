import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import type { ReactElement } from 'react';

import { setLyreflyComicCredit, setLyreflyComicSeries } from '../db/lyreflyIdentityMutations';
import { useLyreflyIdentities } from '../hooks/useLyreflyIdentities';
import type { ComicProject } from '../types';

const NONE = '';
// On the component, not in lyrefly.css: MUI's unlayered `min-width: 0` beats the stylesheet, and an
// empty select then collapses to its label ("Seri…") on a phone.
const FIELD_SX = { minWidth: '9rem' } as const;

/**
 * Pen name and series for one comic. Stored on the comic, not read live from the series, so a
 * series that later changes pen names leaves the credits of comics already out alone.
 */
export function LyreflyComicCreditPickers({ project }: { project: ComicProject }): ReactElement | null {
  const { identities, identitiesHydrated } = useLyreflyIdentities();
  if (!identitiesHydrated) return null;

  const creditId = project.personaIds?.[0] ?? NONE;
  // A retired pen name or series stays selectable for the comic already pointing at it.
  const personas = identities.personas.filter((p) => !p.retiredAt || p.id === creditId);
  const series = identities.series.filter((s) => !s.retiredAt || s.id === project.seriesId);
  // The comic can sync before the pen name or series it points at (an older device may push a
  // backup without them). Say so rather than showing a blank picker.
  const creditMissing = creditId !== NONE && !personas.some((p) => p.id === creditId);
  const seriesMissing = Boolean(project.seriesId) && !series.some((s) => s.id === project.seriesId);

  return (
    <div className="lyrefly-credit-pickers" data-testid="lyrefly-credit-pickers">
      <TextField
        select
        size="small"
        variant="standard"
        label="Credited to"
        value={creditId}
        onChange={(e) => void setLyreflyComicCredit(project, e.target.value || null)}
        className="lyrefly-credit-pickers__field"
        sx={FIELD_SX}
      >
        <MenuItem value={NONE}>No pen name</MenuItem>
        {creditMissing ? (
          <MenuItem value={creditId} disabled>
            Not synced yet
          </MenuItem>
        ) : null}
        {personas.map((p) => (
          <MenuItem key={p.id} value={p.id}>
            {p.name}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        size="small"
        variant="standard"
        label="Series"
        value={project.seriesId ?? NONE}
        onChange={(e) => void setLyreflyComicSeries(project, e.target.value || null)}
        className="lyrefly-credit-pickers__field"
        sx={FIELD_SX}
      >
        <MenuItem value={NONE}>No series</MenuItem>
        {seriesMissing ? (
          <MenuItem value={project.seriesId!} disabled>
            Not synced yet
          </MenuItem>
        ) : null}
        {series.map((s) => (
          <MenuItem key={s.id} value={s.id}>
            {s.title}
          </MenuItem>
        ))}
      </TextField>
    </div>
  );
}
