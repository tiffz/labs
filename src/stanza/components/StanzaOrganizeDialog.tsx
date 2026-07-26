import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useLiveQuery } from 'dexie-react-hooks';

import { stanzaDb, type StanzaSong } from '../db/stanzaDb';
import {
  detectStanzaDuplicateGroups,
  type StanzaDuplicateGroup,
} from '../organize/stanzaDuplicateHeuristics';
import {
  formatStanzaOrganizeDuration,
  initialStanzaOrganizeGroupState,
  stanzaOrganizePreviewLines,
  stanzaOrganizeReasonSummary,
  stanzaOrganizeRichestMemberId,
  stanzaOrganizeSelectionFromState,
  stanzaOrganizeTierLabel,
  type StanzaOrganizeGroupSelectionState,
} from '../organize/stanzaOrganizeDialogModel';
import {
  previewStanzaOrganizeGroup,
  type StanzaOrganizeSelection,
} from '../organize/stanzaOrganizeMerge';
import StanzaLibrarySourceBadge from './StanzaLibrarySourceBadge';
import { stanzaLibrarySourceKind } from './stanzaLibrarySourceKind';

const STANZA_ROSE = '#e848a0';
const roseControlSx = { color: STANZA_ROSE, '&.Mui-checked': { color: STANZA_ROSE } };

function sectionCountLabel(count: number): string {
  return `${count} section${count === 1 ? '' : 's'}`;
}

function MemberLabel({ song, richest }: { song: StanzaSong; richest: boolean }) {
  const duration = formatStanzaOrganizeDuration(song);
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0, py: 0.25 }}>
      <StanzaLibrarySourceBadge kind={stanzaLibrarySourceKind(song)} />
      <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>
        {song.title.trim() || 'Untitled'}
      </Typography>
      {duration ? (
        <Typography variant="caption" color="text.secondary">
          {duration}
        </Typography>
      ) : null}
      <Typography variant="caption" color="text.secondary">
        {sectionCountLabel(song.markers.length)}
      </Typography>
      {richest ? (
        <Chip
          size="small"
          label="Richest"
          sx={{ height: 18, fontSize: 11, bgcolor: 'rgba(232, 72, 160, 0.12)', color: STANZA_ROSE }}
        />
      ) : null}
    </Stack>
  );
}

export interface StanzaOrganizeDialogViewProps {
  open: boolean;
  /** Full library rows (for previews, thumbnails, durations). */
  rows: StanzaSong[];
  /** Detected duplicate groups, strongest tier first. */
  groups: StanzaDuplicateGroup[];
  loading?: boolean;
  busy?: boolean;
  onClose: () => void;
  onMerge: (selections: StanzaOrganizeSelection[]) => void;
}

/**
 * Presentational review dialog. Pure given `rows` + `groups`; owns only the local selection state
 * (which groups to merge, which row survives, which source plays). Calls `onMerge` with the chosen
 * selections. The apply-path, undo, and toast live in the container.
 */
export function StanzaOrganizeDialogView({
  open,
  rows,
  groups,
  loading,
  busy,
  onClose,
  onMerge,
}: StanzaOrganizeDialogViewProps) {
  const [states, setStates] = useState<StanzaOrganizeGroupSelectionState[]>([]);

  useEffect(() => {
    setStates(groups.map(initialStanzaOrganizeGroupState));
  }, [groups]);

  const rowsById = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  const previews = useMemo(
    () =>
      groups.map((group, i) =>
        states[i]
          ? previewStanzaOrganizeGroup(rows, stanzaOrganizeSelectionFromState(group, states[i]))
          : null,
      ),
    [groups, states, rows],
  );

  const patchState = (index: number, patch: Partial<StanzaOrganizeGroupSelectionState>) => {
    setStates((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const selections: StanzaOrganizeSelection[] = groups
    .map((group, i) => ({ group, state: states[i], preview: previews[i] }))
    .filter((e) => e.state?.checked && e.preview && !e.preview.refusedReason)
    .map((e) => stanzaOrganizeSelectionFromState(e.group, e.state!));

  const canMerge = selections.length > 0 && !busy;

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="stanza-organize-title"
      slotProps={{ paper: { className: 'stanza-panel stanza-organize-dialog' } }}
    >
      <DialogTitle id="stanza-organize-title" sx={{ fontWeight: 700 }}>
        Organize library
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Stack sx={{ alignItems: 'center', py: 4 }} aria-busy>
            <CircularProgress size={24} sx={{ color: STANZA_ROSE }} aria-label="Scanning library" />
          </Stack>
        ) : groups.length === 0 ? (
          <Stack spacing={0.5} sx={{ py: 2 }}>
            <Typography variant="subtitle2">No duplicates found.</Typography>
            <Typography variant="body2" color="text.secondary">
              Your library looks tidy.
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={2} divider={<Divider flexItem />}>
            {groups.map((group, i) => {
              const state = states[i];
              const preview = previews[i];
              if (!state || !preview) return null;
              const refused = preview.refusedReason;
              const richestId = stanzaOrganizeRichestMemberId(rows, group.memberIds);
              const lines = stanzaOrganizePreviewLines(preview);
              return (
                <Box component="section" key={group.memberIds.join('|')} aria-label={`Possible duplicate ${i + 1}`}>
                  <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                      <Chip
                        size="small"
                        label={stanzaOrganizeTierLabel(group.tier)}
                        sx={{
                          bgcolor: group.tier === 1 ? 'rgba(232, 72, 160, 0.14)' : 'rgba(60,60,67,0.08)',
                          color: group.tier === 1 ? STANZA_ROSE : 'text.secondary',
                          fontWeight: 600,
                        }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {stanzaOrganizeReasonSummary(group)}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center' }}>
                      <Checkbox
                        size="small"
                        checked={!!state.checked && !refused}
                        disabled={!!refused || busy}
                        onChange={(e) => patchState(i, { checked: e.target.checked })}
                        sx={roseControlSx}
                        slotProps={{ input: { 'aria-label': `Merge possible duplicate ${i + 1}` } }}
                      />
                      <Typography variant="body2" component="span" aria-hidden>
                        Merge
                      </Typography>
                    </Stack>
                  </Stack>

                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Keep this one:
                  </Typography>
                  <RadioGroup
                    value={state.canonicalId}
                    onChange={(e) => patchState(i, { canonicalId: e.target.value, playFromId: e.target.value })}
                  >
                    {group.memberIds.map((id) => {
                      const song = rowsById.get(id);
                      if (!song) return null;
                      return (
                        <FormControlLabel
                          key={id}
                          value={id}
                          disabled={busy}
                          control={<Radio size="small" sx={roseControlSx} />}
                          label={<MemberLabel song={song} richest={id === richestId} />}
                        />
                      );
                    })}
                  </RadioGroup>

                  {preview.crossSource && !refused ? (
                    <Box sx={{ mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Play from:
                      </Typography>
                      <RadioGroup
                        row
                        value={state.playFromId}
                        onChange={(e) => patchState(i, { playFromId: e.target.value })}
                      >
                        {group.memberIds.map((id) => {
                          const song = rowsById.get(id);
                          if (!song) return null;
                          return (
                            <FormControlLabel
                              key={id}
                              value={id}
                              disabled={busy}
                              control={<Radio size="small" sx={roseControlSx} />}
                              label={
                                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                                  <StanzaLibrarySourceBadge kind={stanzaLibrarySourceKind(song)} />
                                  <Typography variant="caption">{song.title.trim() || 'Untitled'}</Typography>
                                </Stack>
                              }
                            />
                          );
                        })}
                      </RadioGroup>
                    </Box>
                  ) : null}

                  {refused ? (
                    <Typography variant="body2" sx={{ mt: 0.5, color: 'warning.main' }}>
                      {refused}
                    </Typography>
                  ) : (
                    <Stack sx={{ mt: 0.5 }}>
                      {lines.map((line) => (
                        <Typography key={line} variant="body2" color="text.secondary">
                          {line}
                        </Typography>
                      ))}
                    </Stack>
                  )}
                </Box>
              );
            })}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={!canMerge}
          onClick={() => onMerge(selections)}
          sx={{ bgcolor: STANZA_ROSE, '&:hover': { bgcolor: '#d63f92' } }}
        >
          {busy ? 'Merging…' : `Merge selected${selections.length ? ` (${selections.length})` : ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export interface StanzaOrganizeDialogProps {
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onMerge: (selections: StanzaOrganizeSelection[]) => void;
}

/** Container: loads the library, runs read-only detection, and renders the review dialog. */
export default function StanzaOrganizeDialog({ open, busy, onClose, onMerge }: StanzaOrganizeDialogProps) {
  const rows = useLiveQuery(
    () => (open ? stanzaDb.songs.toArray() : Promise.resolve<StanzaSong[]>([])),
    [open],
  );
  const loading = open && rows === undefined;
  const safeRows = useMemo(() => rows ?? [], [rows]);
  const groups = useMemo(() => detectStanzaDuplicateGroups(safeRows), [safeRows]);

  return (
    <StanzaOrganizeDialogView
      open={open}
      rows={safeRows}
      groups={groups}
      loading={loading}
      busy={busy}
      onClose={onClose}
      onMerge={onMerge}
    />
  );
}
