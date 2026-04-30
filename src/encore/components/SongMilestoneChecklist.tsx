import AddIcon from '@mui/icons-material/Add';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useCallback, useMemo, useState } from 'react';
import type { EncoreMilestoneDefinition, EncoreMilestoneState, EncoreSong, EncoreSongOnlyMilestone } from '../types';
import { applyTemplateProgressToSong } from '../repertoire/repertoireMilestones';

function sortTemplate(template: readonly EncoreMilestoneDefinition[]): EncoreMilestoneDefinition[] {
  return [...template].filter((m) => !m.archived).sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
}

export function SongMilestoneChecklist(props: {
  song: EncoreSong;
  milestoneTemplate: readonly EncoreMilestoneDefinition[];
  onChange: (next: EncoreSong) => void;
}): React.ReactElement {
  const { song, milestoneTemplate, onChange } = props;
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
    <Stack spacing={2}>
      {defs.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No global milestones yet. Add them under Setup, or track nuance in your practice journal above.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {defs.map((m) => {
            const st = synced.milestoneProgress?.[m.id]?.state ?? 'todo';
            return (
              <Stack key={m.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                <Typography variant="body2" sx={{ flex: 1, minWidth: 0, fontWeight: 600 }}>
                  {m.label}
                </Typography>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel id={`ms-${m.id}`}>Status</InputLabel>
                  <Select
                    labelId={`ms-${m.id}`}
                    label="Status"
                    value={st}
                    onChange={(e) => setTemplateState(m.id, e.target.value as EncoreMilestoneState)}
                  >
                    <MenuItem value="todo">To do</MenuItem>
                    <MenuItem value="done">Done</MenuItem>
                    <MenuItem value="na">N/A</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            );
          })}
        </Stack>
      )}

      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          This song only
        </Typography>
        {(synced.songOnlyMilestones ?? []).length === 0 ? (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Add one-off steps (e.g. “Learn the 8-bar modulate”).
          </Typography>
        ) : (
          <Stack spacing={1.5} sx={{ mb: 1.5 }}>
            {(synced.songOnlyMilestones ?? []).map((row) => (
              <Stack key={row.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                <TextField
                  size="small"
                  fullWidth
                  label="Milestone"
                  value={row.label}
                  onChange={(e) => setSongOnlyLabel(row.id, e.target.value)}
                />
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel id={`so-${row.id}`}>Status</InputLabel>
                  <Select
                    labelId={`so-${row.id}`}
                    label="Status"
                    value={row.state}
                    onChange={(e) => setSongOnlyState(row.id, e.target.value as EncoreMilestoneState)}
                  >
                    <MenuItem value="todo">To do</MenuItem>
                    <MenuItem value="done">Done</MenuItem>
                    <MenuItem value="na">N/A</MenuItem>
                  </Select>
                </FormControl>
                <Button size="small" color="inherit" onClick={() => removeSongOnly(row.id)}>
                  Remove
                </Button>
              </Stack>
            ))}
          </Stack>
        )}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <TextField
            size="small"
            fullWidth
            label="Add milestone for this song"
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
