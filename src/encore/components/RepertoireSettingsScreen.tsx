import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useCallback, useMemo, useState, type ReactElement } from 'react';
import type { EncoreDriveUploadFolderKind, EncoreMilestoneDefinition } from '../types';
import { useEncore } from '../context/EncoreContext';
import { resolveDriveFolderFromUserInput } from '../drive/resolveDriveFolderFromUserInput';
import {
  encoreMaxWidthNarrowPage,
  encoreRadius,
  encoreShadowSurface,
} from '../theme/encoreUiTokens';
import { encorePagePaddingTop, encoreScreenPaddingX } from '../theme/encoreM3Layout';
import { EncorePageHeader } from '../ui/EncorePageHeader';
import { EncoreDriveFolderPasteOrBrowseBlock } from '../ui/EncoreDriveFolderPasteOrBrowseBlock';
import { encorePossessivePageTitle } from '../utils/encorePossessivePageTitle';

export function RepertoireSettingsScreen(): ReactElement {
  const {
    repertoireExtras,
    saveRepertoireExtras,
    effectiveDisplayName,
    googleAccessToken,
  } = useEncore();
  const [venueInput, setVenueInput] = useState('');
  const [milestoneLabel, setMilestoneLabel] = useState('');
  const [folderDraftByKind, setFolderDraftByKind] = useState<
    Partial<Record<EncoreDriveUploadFolderKind, string>>
  >({});
  const [folderRowError, setFolderRowError] = useState<
    Partial<Record<EncoreDriveUploadFolderKind, string>>
  >({});
  const [folderApplyBusyKind, setFolderApplyBusyKind] = useState<EncoreDriveUploadFolderKind | null>(null);

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

  const driveFolderRows = useMemo(
    () =>
      (
        [
          { kind: 'performances' as const, label: 'Performance videos' },
          { kind: 'charts' as const, label: 'Charts / sheet music' },
          { kind: 'referenceTracks' as const, label: 'Reference tracks (file uploads)' },
          { kind: 'backingTracks' as const, label: 'Backing tracks (file uploads)' },
          { kind: 'takes' as const, label: 'Takes / recordings' },
        ] satisfies Array<{ kind: EncoreDriveUploadFolderKind; label: string }>
      ),
    [],
  );

  const applyDriveUploadFolderFromInput = useCallback(
    async (kind: EncoreDriveUploadFolderKind) => {
      if (!googleAccessToken) return;
      const overrideId = repertoireExtras.driveUploadFolderOverrides?.[kind]?.trim();
      const raw = (folderDraftByKind[kind] !== undefined ? folderDraftByKind[kind] : overrideId ?? '').trim();
      setFolderRowError((prev) => {
        const next = { ...prev };
        delete next[kind];
        return next;
      });
      setFolderApplyBusyKind(kind);
      try {
        const resolved = await resolveDriveFolderFromUserInput(googleAccessToken, raw);
        if (!resolved.ok) {
          setFolderRowError((prev) => ({ ...prev, [kind]: resolved.message }));
          return;
        }
        await saveRepertoireExtras({
          driveUploadFolderOverrides: {
            ...repertoireExtras.driveUploadFolderOverrides,
            [kind]: resolved.id,
          },
          driveUploadFolderOverrideLabels: {
            ...repertoireExtras.driveUploadFolderOverrideLabels,
            [kind]: resolved.name,
          },
        });
        setFolderDraftByKind((prev) => {
          const next = { ...prev };
          delete next[kind];
          return next;
        });
      } finally {
        setFolderApplyBusyKind(null);
      }
    },
    [
      googleAccessToken,
      folderDraftByKind,
      repertoireExtras.driveUploadFolderOverrides,
      repertoireExtras.driveUploadFolderOverrideLabels,
      saveRepertoireExtras,
    ],
  );

  const clearDriveUploadFolder = useCallback(
    async (kind: EncoreDriveUploadFolderKind) => {
      const o = { ...(repertoireExtras.driveUploadFolderOverrides ?? {}) };
      delete o[kind];
      const labels = { ...(repertoireExtras.driveUploadFolderOverrideLabels ?? {}) };
      delete labels[kind];
      setFolderDraftByKind((prev) => {
        const next = { ...prev };
        delete next[kind];
        return next;
      });
      setFolderRowError((prev) => {
        const next = { ...prev };
        delete next[kind];
        return next;
      });
      await saveRepertoireExtras({
        driveUploadFolderOverrides: Object.keys(o).length > 0 ? o : undefined,
        driveUploadFolderOverrideLabels: Object.keys(labels).length > 0 ? labels : undefined,
      });
    },
    [
      repertoireExtras.driveUploadFolderOverrides,
      repertoireExtras.driveUploadFolderOverrideLabels,
      saveRepertoireExtras,
    ],
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
          mb: { xs: 3, sm: 4 },
          boxShadow: encoreShadowSurface,
          border: 'none',
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
          Drive upload folders
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25, lineHeight: 1.55 }}>
          Encore still keeps its <Box component="span" sx={{ fontWeight: 600 }}>Encore_App</Box> tree in Google Drive.
          Optional overrides send new uploads to folders you choose; Encore adds shortcuts with canonical names inside its
          own folders where needed.
        </Typography>
        <Alert severity="info" sx={{ mb: 2, py: 0.75 }} variant="outlined">
          Folder paths here are a <strong>draft</strong> until you save them. New uploads and <strong>Organize Drive</strong>{' '}
          use the <strong>saved</strong> folder on each row — not the clipboard or picker selection by itself.
        </Alert>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.55 }}>
          Paste a folder link or id, pick a folder, then tap <strong>Save folder</strong> for that row. Saving checks the
          folder with Google and writes it to your Encore library settings. <strong>Pick folder in Drive</strong> needs the
          Google Picker API and a browser API key configured (see Encore README).
        </Typography>
        {!googleAccessToken ? (
          <Typography variant="body2" color="text.secondary">
            Sign in with Google (Account menu) to choose upload folders.
          </Typography>
        ) : (
          <Stack divider={<Divider flexItem />} spacing={1.25}>
            {driveFolderRows.map(({ kind, label }) => {
              const overrideId = repertoireExtras.driveUploadFolderOverrides?.[kind]?.trim();
              const statusLabel = repertoireExtras.driveUploadFolderOverrideLabels?.[kind]?.trim();
              const status =
                overrideId && statusLabel
                  ? statusLabel
                  : overrideId
                    ? `Folder id · ${overrideId.length > 18 ? `${overrideId.slice(0, 9)}…` : overrideId}`
                    : 'Encore default';
              const draft = folderDraftByKind[kind];
              const folderFieldValue = draft !== undefined ? draft : (overrideId ?? '');
              const rowBusy = folderApplyBusyKind === kind;
              const rowDirty = draft !== undefined;
              return (
                <Stack key={kind} spacing={1.25}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    alignItems={{ sm: 'flex-start' }}
                    justifyContent="space-between"
                  >
                    <Box sx={{ minWidth: 0, flex: '1 1 auto' }}>
                      <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap" useFlexGap>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {label}
                        </Typography>
                        {rowDirty ? (
                          <Chip size="small" label="Unsaved" color="warning" variant="outlined" sx={{ height: 22 }} />
                        ) : null}
                      </Stack>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                        {status}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      color="inherit"
                      disabled={!overrideId || rowBusy}
                      onClick={() => void clearDriveUploadFolder(kind)}
                      sx={{ textTransform: 'none', flexShrink: 0, alignSelf: { sm: 'center' } }}
                    >
                      Clear
                    </Button>
                  </Stack>
                  <EncoreDriveFolderPasteOrBrowseBlock
                    value={folderFieldValue}
                    onChange={(v) => {
                      const trimmed = v.trim();
                      const saved = (overrideId ?? '').trim();
                      setFolderDraftByKind((prev) => {
                        const next = { ...prev };
                        if (trimmed === saved) delete next[kind];
                        else next[kind] = v;
                        return next;
                      });
                      setFolderRowError((prev) => {
                        const next = { ...prev };
                        delete next[kind];
                        return next;
                      });
                    }}
                    googleAccessToken={googleAccessToken}
                    disabled={rowBusy}
                    primaryAction={
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => void applyDriveUploadFolderFromInput(kind)}
                        disabled={rowBusy || !rowDirty || !folderFieldValue.trim() || !googleAccessToken}
                        sx={{ textTransform: 'none' }}
                      >
                        Save folder
                      </Button>
                    }
                  />
                  {folderRowError[kind] ? (
                    <Alert severity="warning" sx={{ py: 0.5, whiteSpace: 'pre-line' }}>
                      {folderRowError[kind]}
                    </Alert>
                  ) : null}
                  {rowBusy ? <LinearProgress /> : null}
                </Stack>
              );
            })}
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
