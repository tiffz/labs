import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useCallback, useMemo, useState } from 'react';
import type { EncoreMilestoneDefinition, EncoreMilestoneState, EncoreSong, EncoreSongOnlyMilestone } from '../types';
import { applyTemplateProgressToSong } from '../repertoire/repertoireMilestones';

function sortTemplate(template: readonly EncoreMilestoneDefinition[]): EncoreMilestoneDefinition[] {
  return [...template].filter((m) => !m.archived).sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
}

/**
 * Single milestone row: a primary checkbox cycles `todo` ↔ `done`; a low-key
 * "N/A" affordance toggles between `todo` and `na` so it stays out of the way
 * of normal practice progress.
 */
function MilestoneRow(props: {
  label: string;
  state: EncoreMilestoneState;
  onSetState: (state: EncoreMilestoneState) => void;
  onRemove?: () => void;
  onLabelChange?: (label: string) => void;
}): React.ReactElement {
  const { label, state, onSetState, onRemove, onLabelChange } = props;
  const isNa = state === 'na';
  const isDone = state === 'done';

  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      sx={{
        py: 0.25,
        opacity: isNa ? 0.55 : 1,
        transition: 'opacity 160ms ease',
      }}
    >
      <Checkbox
        size="small"
        checked={isDone}
        disabled={isNa}
        onChange={(e) => onSetState(e.target.checked ? 'done' : 'todo')}
        inputProps={{ 'aria-label': `Mark "${label}" as done` }}
      />
      {onLabelChange ? (
        <TextField
          variant="standard"
          size="small"
          fullWidth
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          inputProps={{ 'aria-label': 'Milestone label' }}
          sx={{
            flex: 1,
            minWidth: 0,
            '& .MuiInput-underline:before': { borderBottom: 'none' },
            '& .MuiInput-underline:hover:not(.Mui-disabled):before': { borderBottom: 1, borderColor: 'divider' },
            '& input': {
              fontSize: '0.875rem',
              fontWeight: 500,
              textDecoration: isDone ? 'line-through' : 'none',
              color: isDone ? 'text.secondary' : 'text.primary',
            },
          }}
        />
      ) : (
        <Typography
          variant="body2"
          sx={{
            flex: 1,
            minWidth: 0,
            fontWeight: 500,
            textDecoration: isDone ? 'line-through' : 'none',
            color: isDone ? 'text.secondary' : 'text.primary',
          }}
        >
          {label}
        </Typography>
      )}
      <Tooltip title={isNa ? 'Mark as a real milestone again' : 'Mark as not applicable for this song'}>
        <Button
          size="small"
          variant="text"
          startIcon={<RemoveCircleOutlineIcon sx={{ fontSize: 16 }} />}
          onClick={() => onSetState(isNa ? 'todo' : 'na')}
          sx={{
            color: 'text.secondary',
            fontSize: '0.7rem',
            textTransform: 'none',
            fontWeight: isNa ? 700 : 500,
            minWidth: 0,
            px: 0.75,
            '&:hover': { color: 'text.primary', bgcolor: 'transparent' },
          }}
        >
          {isNa ? 'N/A' : 'Mark N/A'}
        </Button>
      </Tooltip>
      {onRemove ? (
        <IconButton size="small" aria-label="Remove milestone" onClick={onRemove} sx={{ color: 'text.disabled' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      ) : null}
    </Stack>
  );
}

export function SongMilestoneChecklist(props: {
  song: EncoreSong;
  milestoneTemplate: readonly EncoreMilestoneDefinition[];
  onChange: (next: EncoreSong) => void;
  onOpenGlobalMilestoneSettings?: () => void;
}): React.ReactElement {
  const { song, milestoneTemplate, onChange, onOpenGlobalMilestoneSettings } = props;
  const [localLabel, setLocalLabel] = useState('');

  const defs = useMemo(() => sortTemplate(milestoneTemplate), [milestoneTemplate]);
  const synced = useMemo(() => applyTemplateProgressToSong(song, milestoneTemplate), [song, milestoneTemplate]);

  const setTemplateState = useCallback(
    (id: string, state: EncoreMilestoneState) => {
      const now = new Date().toISOString();
      const progress = { ...(synced.milestoneProgress ?? {}) };
      progress[id] = {
        state,
        doneAt: state === 'done' ? now : undefined,
      };
      onChange({ ...synced, milestoneProgress: progress, updatedAt: now });
    },
    [onChange, synced],
  );

  const setSongOnlyState = useCallback(
    (id: string, state: EncoreMilestoneState) => {
      const now = new Date().toISOString();
      const list = [...(synced.songOnlyMilestones ?? [])];
      const i = list.findIndex((x) => x.id === id);
      if (i < 0) return;
      list[i] = {
        ...list[i]!,
        state,
        doneAt: state === 'done' ? now : undefined,
      };
      onChange({ ...synced, songOnlyMilestones: list, updatedAt: now });
    },
    [onChange, synced],
  );

  const setSongOnlyLabel = useCallback(
    (id: string, label: string) => {
      const now = new Date().toISOString();
      const list = [...(synced.songOnlyMilestones ?? [])];
      const i = list.findIndex((x) => x.id === id);
      if (i < 0) return;
      list[i] = { ...list[i]!, label };
      onChange({ ...synced, songOnlyMilestones: list, updatedAt: now });
    },
    [onChange, synced],
  );

  const addSongOnly = useCallback(() => {
    const label = localLabel.trim();
    if (!label) return;
    const now = new Date().toISOString();
    const row: EncoreSongOnlyMilestone = {
      id: crypto.randomUUID(),
      label,
      state: 'todo',
    };
    onChange({
      ...synced,
      songOnlyMilestones: [...(synced.songOnlyMilestones ?? []), row],
      updatedAt: now,
    });
    setLocalLabel('');
  }, [localLabel, onChange, synced]);

  const removeSongOnly = useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      onChange({
        ...synced,
        songOnlyMilestones: (synced.songOnlyMilestones ?? []).filter((x) => x.id !== id),
        updatedAt: now,
      });
    },
    [onChange, synced],
  );

  return (
    <Stack spacing={3}>
      {defs.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No global milestones yet. Add them in Library settings, or track nuance in your practice journal above.
        </Typography>
      ) : (
        <Stack spacing={0.5}>
          {defs.map((m) => {
            const st = synced.milestoneProgress?.[m.id]?.state ?? 'todo';
            return (
              <Stack key={m.id} direction="row" spacing={1} alignItems="flex-start" sx={{ width: 1 }}>
                <Tooltip title="Applies to every song · Click to open Library settings">
                  <Chip
                    size="small"
                    label="Global"
                    variant="outlined"
                    onClick={() => onOpenGlobalMilestoneSettings?.()}
                    sx={{
                      mt: 0.5,
                      flexShrink: 0,
                      fontWeight: 700,
                      cursor: onOpenGlobalMilestoneSettings ? 'pointer' : 'default',
                    }}
                  />
                </Tooltip>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <MilestoneRow
                    label={m.label}
                    state={st}
                    onSetState={(s) => setTemplateState(m.id, s)}
                  />
                </Box>
              </Stack>
            );
          })}
        </Stack>
      )}

      <Box>
        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1.25 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Song-only milestones
          </Typography>
          <Tooltip title="Global milestones come from Library settings and apply to every song. Song-only steps are extra checklist items for this title only.">
            <IconButton size="small" aria-label="About global vs song-only milestones" sx={{ p: 0.25 }}>
              <InfoOutlinedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Stack>
        {(synced.songOnlyMilestones ?? []).length === 0 ? null : (
          <Stack spacing={0.5} sx={{ mb: 1.5 }}>
            {(synced.songOnlyMilestones ?? []).map((row) => (
              <Stack key={row.id} direction="row" spacing={1} alignItems="flex-start" sx={{ width: 1 }}>
                <Chip size="small" label="Song" variant="outlined" sx={{ mt: 0.5, flexShrink: 0, fontWeight: 700 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <MilestoneRow
                    label={row.label}
                    state={row.state}
                    onSetState={(s) => setSongOnlyState(row.id, s)}
                    onLabelChange={(l) => setSongOnlyLabel(row.id, l)}
                    onRemove={() => removeSongOnly(row.id)}
                  />
                </Box>
              </Stack>
            ))}
          </Stack>
        )}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <TextField
            size="small"
            fullWidth
            label="Add a song-only milestone"
            placeholder="e.g. Learn the 8-bar modulate"
            value={localLabel}
            onChange={(e) => setLocalLabel(e.target.value)}
          />
          <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={addSongOnly} sx={{ flexShrink: 0 }}>
            Add
          </Button>
        </Stack>
      </Box>
    </Stack>
  );
}
