import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CloudIcon from '@mui/icons-material/Cloud';
import LaptopMacIcon from '@mui/icons-material/LaptopMac';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import type { ConflictAnalysis, ConflictRowSummary } from '../drive/repertoireSync';
import {
  encoreDialogActionsSx,
  encoreDialogContentSx,
  encoreDialogTitleSx,
  encoreHairline,
  encoreShadowLift,
} from '../theme/encoreUiTokens';

type Choice = 'local' | 'remote';

function formatTs(iso: string | undefined | null): string {
  const t = iso?.trim();
  if (!t) return '–';
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? t : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function rowKey(row: ConflictRowSummary): string {
  return `${row.kind}:${row.id}`;
}

const ROW_KIND_LABEL: Record<ConflictRowSummary['kind'], string> = {
  song: 'Song',
  performance: 'Performance',
};

function ChoiceCard(props: {
  selected: boolean;
  onClick: () => void;
  side: 'local' | 'remote';
  timestamp: string | undefined;
}): ReactElement {
  const theme = useTheme();
  const { selected, onClick, side, timestamp } = props;
  const Icon = side === 'local' ? LaptopMacIcon : CloudIcon;
  const heading = side === 'local' ? 'Keep this device' : 'Use Drive';
  const accent = selected ? theme.palette.primary.main : theme.palette.divider;
  return (
    <ButtonBase
      onClick={onClick}
      aria-pressed={selected}
      sx={{
        flex: 1,
        minWidth: 0,
        textAlign: 'left',
        borderRadius: 2,
        border: `1.5px solid ${accent}`,
        bgcolor: selected ? alpha(theme.palette.primary.main, 0.08) : 'background.paper',
        px: 1.25,
        py: 1,
        transition: 'background-color 120ms ease, border-color 120ms ease',
        '&:hover': {
          bgcolor: selected ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.text.primary, 0.04),
        },
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, width: '100%' }}>
        <Icon
          fontSize="small"
          sx={{ color: selected ? 'primary.main' : 'text.secondary' }}
          aria-hidden
        />
        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              letterSpacing: '-0.005em',
              color: selected ? 'primary.main' : 'text.primary',
              lineHeight: 1.2,
            }}
          >
            {heading}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ lineHeight: 1.3, fontVariantNumeric: 'tabular-nums' }}
          >
            {formatTs(timestamp)}
          </Typography>
        </Stack>
      </Stack>
    </ButtonBase>
  );
}

export type SyncConflictReviewDialogProps = {
  open: boolean;
  analysis: ConflictAnalysis | null;
  onApply: (choices: Map<string, Choice>) => void;
  onDismiss: () => void;
};

/**
 * Compact, modern sync-conflict review.
 *
 * Encore now silently auto-merges any non-overlapping local + remote edits, so this dialog only
 * appears when both sides edited the same row. The list shows just those rows; the user picks per
 * row, with shortcuts to "apply to all → device" / "apply to all → Drive". The verbose long-form
 * explanation is hidden behind a "?" tooltip for the curious.
 */
export function SyncConflictReviewDialog(props: SyncConflictReviewDialogProps): ReactElement {
  const { open, analysis, onApply, onDismiss } = props;
  const bothEdited = useMemo(() => analysis?.bothEdited ?? [], [analysis]);
  const localOnlyCount = analysis?.localOnly.length ?? 0;
  const remoteOnlyCount = analysis?.remoteOnly.length ?? 0;

  const [choices, setChoices] = useState<Map<string, Choice>>(() => new Map());

  useEffect(() => {
    // Reset selections every time the dialog re-opens with a fresh analysis.
    if (open) setChoices(new Map());
  }, [open, analysis]);

  const setRowChoice = (key: string, choice: Choice) => {
    setChoices((prev) => {
      const next = new Map(prev);
      next.set(key, choice);
      return next;
    });
  };

  const applyToAll = (choice: Choice) => {
    const next = new Map<string, Choice>();
    for (const row of bothEdited) next.set(rowKey(row), choice);
    setChoices(next);
  };

  const allDecided = bothEdited.every((row) => choices.has(rowKey(row)));

  return (
    <Dialog
      open={open}
      onClose={onDismiss}
      aria-labelledby="encore-conflict-review-title"
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            border: `1px solid ${encoreHairline}`,
            boxShadow: encoreShadowLift,
          },
        },
      }}
    >
      <DialogTitle id="encore-conflict-review-title" sx={{ ...encoreDialogTitleSx, pb: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <span>Review sync changes</span>
          <Tooltip
            arrow
            placement="bottom-start"
            title={
              <Typography variant="caption" component="div" sx={{ lineHeight: 1.55, maxWidth: 320 }}>
                Encore stores your library in this browser and backs it up to Google Drive (
                <code>repertoire_data.json</code>). When both sides edit the same row Encore cannot
                merge automatically, so you pick which version to keep. Edits on different rows are
                merged silently; the newer version wins.
              </Typography>
            }
          >
            <IconButton size="small" aria-label="What is a sync conflict?" sx={{ color: 'text.secondary' }}>
              <HelpOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ ...encoreDialogContentSx, overflow: 'visible', pt: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55, mb: 2 }}>
          Both this device and Drive changed since your last sync. Encore can merge most edits
          automatically, but{' '}
          <strong>{bothEdited.length === 1 ? '1 row' : `${bothEdited.length} rows`}</strong> changed
          on both sides. Pick which version to keep for each.
          {(localOnlyCount > 0 || remoteOnlyCount > 0) && (
            <>
              {' '}
              Other edits are merged automatically (
              {localOnlyCount > 0 && <span>{localOnlyCount} from this device</span>}
              {localOnlyCount > 0 && remoteOnlyCount > 0 && <span>, </span>}
              {remoteOnlyCount > 0 && <span>{remoteOnlyCount} from Drive</span>}
              ).
            </>
          )}
        </Typography>

        {bothEdited.length > 1 && (
          <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap' }} useFlexGap>
            <Button
              size="small"
              variant="outlined"
              startIcon={<LaptopMacIcon fontSize="small" />}
              onClick={() => applyToAll('local')}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              All this device
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<CloudIcon fontSize="small" />}
              onClick={() => applyToAll('remote')}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              All Drive
            </Button>
          </Stack>
        )}

        <Stack
          spacing={1.25}
          sx={{
            maxHeight: { xs: '50vh', sm: '46vh' },
            overflowY: 'auto',
            pr: 0.5,
          }}
        >
          {bothEdited.map((row) => {
            const key = rowKey(row);
            const choice = choices.get(key);
            return (
              <Box
                key={key}
                sx={{
                  borderRadius: 2,
                  border: `1px solid ${encoreHairline}`,
                  p: 1.25,
                  bgcolor: 'background.paper',
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1, minWidth: 0 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: 'text.secondary',
                      flexShrink: 0,
                    }}
                  >
                    {ROW_KIND_LABEL[row.kind]}
                  </Typography>
                  <Stack sx={{ minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 700, lineHeight: 1.25 }}
                      noWrap
                    >
                      {row.label}
                    </Typography>
                    {row.sublabel && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ lineHeight: 1.3 }}
                        noWrap
                      >
                        {row.sublabel}
                      </Typography>
                    )}
                  </Stack>
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <ChoiceCard
                    selected={choice === 'local'}
                    onClick={() => setRowChoice(key, 'local')}
                    side="local"
                    timestamp={row.localUpdatedAt}
                  />
                  <ChoiceCard
                    selected={choice === 'remote'}
                    onClick={() => setRowChoice(key, 'remote')}
                    side="remote"
                    timestamp={row.remoteUpdatedAt}
                  />
                </Stack>
              </Box>
            );
          })}
        </Stack>
      </DialogContent>
      <DialogActions
        sx={{
          ...encoreDialogActionsSx,
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 1,
          pt: 2,
          borderTop: '1px solid',
          borderColor: encoreHairline,
        }}
      >
        <Stack direction="row" spacing={1} justifyContent="flex-end" useFlexGap>
          <Button
            onClick={onDismiss}
            color="inherit"
            size="medium"
            sx={{ textTransform: 'none', fontWeight: 500 }}
          >
            Decide later
          </Button>
          <Button
            onClick={() => onApply(choices)}
            variant="contained"
            color="primary"
            size="medium"
            disabled={!allDecided}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Apply
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
