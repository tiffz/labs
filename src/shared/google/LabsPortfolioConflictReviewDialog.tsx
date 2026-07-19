import HelpOutlineIcon from '@mui/icons-material/HelpOutlined';
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
import type {
  LabsPortfolioConflictAnalysis,
  LabsPortfolioConflictRow,
  LabsPortfolioClock,
} from '../drive/labsPortfolioConflictAnalysis';

export type LabsPortfolioConflictChoice = 'local' | 'remote';

function formatClock(clock: LabsPortfolioClock | string | undefined | null): string {
  if (clock == null) return '–';
  if (typeof clock === 'string') {
    const t = clock.trim();
    if (!t) return '–';
    const d = new Date(t);
    return Number.isNaN(d.getTime())
      ? t
      : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }
  if (!(clock > 0)) return '–';
  return new Date(clock).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function rowKey(row: LabsPortfolioConflictRow): string {
  return `${row.kind}:${row.id}`;
}

function ChoiceCard(props: {
  selected: boolean;
  onClick: () => void;
  side: LabsPortfolioConflictChoice;
  timestamp: LabsPortfolioClock | string | undefined;
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
          bgcolor: selected
            ? alpha(theme.palette.primary.main, 0.1)
            : alpha(theme.palette.text.primary, 0.04),
        },
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: "center",
          minWidth: 0,
          width: '100%'
        }}>
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
            sx={{
              color: "text.secondary",
              lineHeight: 1.3,
              fontVariantNumeric: 'tabular-nums'
            }}>
            {formatClock(timestamp)}
          </Typography>
        </Stack>
      </Stack>
    </ButtonBase>
  );
}

export type LabsPortfolioConflictReviewDialogProps = {
  open: boolean;
  dialogTitleId?: string;
  analysis: LabsPortfolioConflictAnalysis | null;
  busy?: boolean;
  /** Optional footnote under the intro (app-specific merge guarantees). */
  mergeFootnote?: string;
  helpTooltip?: string;
  onApply: (choices: Map<string, LabsPortfolioConflictChoice>) => void;
  onDismiss: () => void;
};

/**
 * Per-row conflict review for portfolio Drive apps (ADR 0020).
 * Only `needsReview` rows are listed; non-overlapping edits auto-merge silently.
 */
export default function LabsPortfolioConflictReviewDialog(
  props: LabsPortfolioConflictReviewDialogProps,
): ReactElement {
  const {
    open,
    dialogTitleId = 'labs-portfolio-conflict-review-title',
    analysis,
    busy = false,
    mergeFootnote,
    helpTooltip = 'Your library lives in this browser and backs up to Google Drive. When both sides edit the same item and automatic merge would lose content, you pick which version to keep. Edits on different items merge silently.',
    onApply,
    onDismiss,
  } = props;

  const needsReview = useMemo(() => analysis?.needsReview ?? [], [analysis]);
  const localOnlyCount = analysis?.localOnly.length ?? 0;
  const remoteOnlyCount = analysis?.remoteOnly.length ?? 0;
  const autoResolvedCount = analysis?.autoResolved.length ?? 0;

  const [choices, setChoices] = useState<Map<string, LabsPortfolioConflictChoice>>(() => new Map());

  useEffect(() => {
    if (open) setChoices(new Map());
  }, [open, analysis]);

  const setRowChoice = (key: string, choice: LabsPortfolioConflictChoice) => {
    setChoices((prev) => {
      const next = new Map(prev);
      next.set(key, choice);
      return next;
    });
  };

  const applyToAll = (choice: LabsPortfolioConflictChoice) => {
    const next = new Map<string, LabsPortfolioConflictChoice>();
    for (const row of needsReview) next.set(rowKey(row), choice);
    setChoices(next);
  };

  const allDecided = needsReview.every((row) => choices.has(rowKey(row)));

  return (
    <Dialog
      open={open}
      onClose={() => !busy && onDismiss()}
      aria-labelledby={dialogTitleId}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle id={dialogTitleId} sx={{ pb: 1.5 }}>
        <Stack direction="row" spacing={1} sx={{
          alignItems: "center"
        }}>
          <span>Review sync changes</span>
          <Tooltip
            arrow
            placement="bottom-start"
            title={
              <Typography variant="caption" component="div" sx={{ lineHeight: 1.55, maxWidth: 320 }}>
                {helpTooltip}
              </Typography>
            }
          >
            <IconButton size="small" aria-label="What is a sync conflict?" sx={{ color: 'text.secondary' }}>
              <HelpOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ overflow: 'visible', pt: 1 }}>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            lineHeight: 1.55,
            mb: 2
          }}>
          Both this device and Drive changed since your last sync. Most edits merge automatically, but{' '}
          <strong>
            {needsReview.length === 1 ? '1 item' : `${needsReview.length} items`}
          </strong>{' '}
          need a choice.
          {(localOnlyCount > 0 || remoteOnlyCount > 0 || autoResolvedCount > 0) && (
            <>
              {' '}
              Other edits are merged automatically
              {localOnlyCount > 0 || remoteOnlyCount > 0 || autoResolvedCount > 0 ? (
                <>
                  {' '}
                  (
                  {[
                    localOnlyCount > 0 ? `${localOnlyCount} from this device` : null,
                    remoteOnlyCount > 0 ? `${remoteOnlyCount} from Drive` : null,
                    autoResolvedCount > 0 ? `${autoResolvedCount} auto-merged` : null,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                  )
                </>
              ) : null}
              .
            </>
          )}
        </Typography>
        {mergeFootnote ? (
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              display: 'block',
              mb: 1.5,
              lineHeight: 1.45
            }}>
            {mergeFootnote}
          </Typography>
        ) : null}

        {needsReview.length > 1 && (
          <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap' }} useFlexGap>
            <Button
              size="small"
              variant="outlined"
              startIcon={<LaptopMacIcon fontSize="small" />}
              onClick={() => applyToAll('local')}
              disabled={busy}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              All this device
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<CloudIcon fontSize="small" />}
              onClick={() => applyToAll('remote')}
              disabled={busy}
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
          {needsReview.map((row) => {
            const key = rowKey(row);
            const choice = choices.get(key);
            return (
              <Box
                key={key}
                sx={{
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  p: 1.25,
                  bgcolor: 'background.paper',
                }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    alignItems: "center",
                    mb: 1,
                    minWidth: 0
                  }}>
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
                    {row.kind}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.25 }} noWrap>
                    {row.label}
                  </Typography>
                </Stack>
                {row.stakesSummary ? (
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      display: 'block',
                      mb: 1,
                      lineHeight: 1.4
                    }}>
                    {row.stakesSummary}
                  </Typography>
                ) : null}
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
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 1,
          px: 3,
          pb: 2.5,
          pt: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack direction="row" spacing={1} useFlexGap sx={{
          justifyContent: "flex-end"
        }}>
          <Button
            onClick={onDismiss}
            color="inherit"
            size="medium"
            disabled={busy}
            sx={{ textTransform: 'none', fontWeight: 500 }}
          >
            Decide later
          </Button>
          <Button
            onClick={() => onApply(choices)}
            variant="contained"
            color="primary"
            size="medium"
            disabled={!allDecided || busy}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Apply choices and sync
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
