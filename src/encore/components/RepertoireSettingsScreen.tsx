import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useCallback, useMemo, useState } from 'react';
import type { EncoreMilestoneDefinition } from '../types';
import { useEncore } from '../context/EncoreContext';
import {
  encoreMaxWidthNarrowPage,
  encoreRadius,
  encoreShadowSurface,
} from '../theme/encoreUiTokens';
import { encorePagePaddingTop, encoreScreenPaddingX } from '../theme/encoreM3Layout';
import { EncorePageHeader } from '../ui/EncorePageHeader';
import { encorePossessivePageTitle } from '../utils/encorePossessivePageTitle';

export function RepertoireSettingsScreen(): React.ReactElement {
  const { repertoireExtras, saveRepertoireExtras, effectiveDisplayName } = useEncore();
  const [venueInput, setVenueInput] = useState('');
  const [milestoneLabel, setMilestoneLabel] = useState('');

  const sortedVenues = useMemo(
    () => [...repertoireExtras.venueCatalog].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
    [repertoireExtras.venueCatalog],
  );

  const sortedMilestones = useMemo(
    () =>
      [...repertoireExtras.milestoneTemplate].sort((a, b) => {
        const arch = Number(Boolean(a.archived)) - Number(Boolean(b.archived));
        if (arch !== 0) return arch;
        return a.sortOrder - b.sortOrder || a.label.localeCompare(b.label);
      }),
    [repertoireExtras.milestoneTemplate],
  );

  const addVenue = useCallback(async () => {
    const v = venueInput.trim();
    if (!v) return;
    const next = new Set(repertoireExtras.venueCatalog.map((x) => x.trim()).filter(Boolean));
    next.add(v);
    await saveRepertoireExtras({ venueCatalog: [...next].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })) });
    setVenueInput('');
  }, [repertoireExtras.venueCatalog, saveRepertoireExtras, venueInput]);

  const removeVenue = useCallback(
    async (v: string) => {
      const next = repertoireExtras.venueCatalog.filter((x) => x !== v);
      await saveRepertoireExtras({ venueCatalog: next });
    },
    [repertoireExtras.venueCatalog, saveRepertoireExtras],
  );

  const addMilestone = useCallback(async () => {
    const label = milestoneLabel.trim();
    if (!label) return;
    const maxOrder = repertoireExtras.milestoneTemplate.reduce((m, x) => Math.max(m, x.sortOrder), 0);
    const row: EncoreMilestoneDefinition = {
      id: crypto.randomUUID(),
      label,
      sortOrder: maxOrder + 1,
    };
    await saveRepertoireExtras({ milestoneTemplate: [...repertoireExtras.milestoneTemplate, row] });
    setMilestoneLabel('');
  }, [milestoneLabel, repertoireExtras.milestoneTemplate, saveRepertoireExtras]);

  const updateMilestoneLabel = useCallback(
    async (id: string, label: string) => {
      const next = repertoireExtras.milestoneTemplate.map((m) => (m.id === id ? { ...m, label } : m));
      await saveRepertoireExtras({ milestoneTemplate: next });
    },
    [repertoireExtras.milestoneTemplate, saveRepertoireExtras],
  );

  const archiveMilestone = useCallback(
    async (id: string, archived: boolean) => {
      const next = repertoireExtras.milestoneTemplate.map((m) => (m.id === id ? { ...m, archived } : m));
      await saveRepertoireExtras({ milestoneTemplate: next });
    },
    [repertoireExtras.milestoneTemplate, saveRepertoireExtras],
  );

  const deleteMilestone = useCallback(
    async (id: string) => {
      const next = repertoireExtras.milestoneTemplate.filter((m) => m.id !== id);
      await saveRepertoireExtras({ milestoneTemplate: next });
    },
    [repertoireExtras.milestoneTemplate, saveRepertoireExtras],
  );

  return (
    <Box
      sx={{
        px: encoreScreenPaddingX,
        pt: encorePagePaddingTop,
        pb: { xs: 10, md: 5 },
        ...encoreMaxWidthNarrowPage,
      }}
    >
      <EncorePageHeader
        title={encorePossessivePageTitle(effectiveDisplayName, 'settings')}
        description="Venues feed autocomplete and bulk import matching. Milestones are your shared checklist on every song — voice-first; add keys or staging steps you care about."
      />

      <Paper
        elevation={0}
        sx={{
          borderRadius: encoreRadius,
          p: { xs: 2.5, sm: 3 },
          mb: { xs: 3, sm: 4 },
          boxShadow: encoreShadowSurface,
          border: 'none',
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
          Saved venues
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
          <TextField
            size="small"
            fullWidth
            label="Add venue"
            value={venueInput}
            onChange={(e) => setVenueInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void addVenue();
              }
            }}
          />
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => void addVenue()} sx={{ flexShrink: 0 }}>
            Add
          </Button>
        </Stack>
        {sortedVenues.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No saved venues yet. Add names you use often, or they will accumulate from performances over time.
          </Typography>
        ) : (
          <Stack divider={<Divider flexItem />} spacing={0.5}>
            {sortedVenues.map((v) => (
              <Stack key={v} direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                <Typography variant="body2">{v}</Typography>
                <IconButton size="small" aria-label={`Remove ${v}`} onClick={() => void removeVenue(v)}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))}
          </Stack>
        )}
      </Paper>

      <Paper
        elevation={0}
        sx={{
          borderRadius: encoreRadius,
          p: { xs: 2.5, sm: 3 },
          boxShadow: encoreShadowSurface,
          border: 'none',
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
          Global milestones
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Each song gets these rows as a checklist. You can mark a row N/A on a song, or add song-only rows from the
          song page. Archived rows appear at the bottom here; uncheck Archived on a row to show it on songs again.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
          <TextField
            size="small"
            fullWidth
            label="New milestone"
            value={milestoneLabel}
            onChange={(e) => setMilestoneLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void addMilestone();
              }
            }}
          />
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => void addMilestone()} sx={{ flexShrink: 0 }}>
            Add
          </Button>
        </Stack>
        {repertoireExtras.milestoneTemplate.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No milestones yet. Add steps like “Sing with karaoke track in time” or “Comp keys while singing.”
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {sortedMilestones.map((m) => (
              <Stack
                key={m.id}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                alignItems={{ sm: 'center' }}
                sx={{
                  opacity: m.archived ? 0.72 : 1,
                }}
              >
                <TextField
                  size="small"
                  fullWidth
                  label="Label"
                  value={m.label}
                  onChange={(e) => void updateMilestoneLabel(m.id, e.target.value)}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={Boolean(m.archived)}
                      onChange={(e) => void archiveMilestone(m.id, e.target.checked)}
                      size="small"
                    />
                  }
                  label={m.archived ? 'Archived (uncheck to restore)' : 'Archived'}
                  sx={{ flexShrink: 0, m: 0 }}
                />
                <IconButton size="small" aria-label={`Delete ${m.label}`} onClick={() => void deleteMilestone(m.id)}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))}
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
