import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { TIERS } from '../curriculum/tiers';
import type { ExerciseKind } from '../curriculum/types';
import { getExerciseProgress, getMasteryTier, type MasteryTier } from '../progress/store';
import type { ScalesProgressData } from '../progress/types';

const SCALE_KINDS: ExerciseKind[] = ['major-scale', 'natural-minor-scale'];
const ARPEGGIO_KINDS: ExerciseKind[] = ['arpeggio-major', 'arpeggio-minor'];

function Icon({
  name,
  size = 20,
  filled = false,
  color,
}: { name: string; size?: number; filled?: boolean; color?: string }) {
  return (
    <Box
      component="span"
      aria-hidden="true"
      className="material-symbols-outlined"
      sx={{
        fontSize: size,
        lineHeight: 1,
        color,
        fontVariationSettings: filled ? '"FILL" 1' : undefined,
      }}
    >
      {name}
    </Box>
  );
}

export type MasteryCategory = 'scale' | 'arpeggio';

export interface MasteryDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  category: MasteryCategory;
  progress: ScalesProgressData;
}

interface Row {
  id: string;
  label: string;
  tier: MasteryTier;
  started: boolean;
  levelsDone: number;
  totalLevels: number;
  needsReview: boolean;
}

/**
 * One row in the bar chart: leading mastered-check slot, fixed-width name,
 * progress bar filling the middle, trailing stage fraction + optional
 * review dot. Entire row lives on one 36px line so the dialog can show
 * all 22 scales with minimal scroll.
 */
function BarRow({ row, noun }: { row: Row; noun: string }) {
  const isMastered = row.tier === 'mastered';
  const isFluent = row.tier === 'fluent';
  const pct = row.totalLevels > 0 ? (row.levelsDone / row.totalLevels) * 100 : 0;
  const barColor = isMastered || isFluent ? 'success.main' : 'primary.main';

  const tierWord: string = isMastered
    ? 'mastered'
    : isFluent
      ? 'fluent'
      : row.started
        ? 'in progress'
        : 'not started';
  const ariaParts = [`${row.label} ${noun}`];
  if (row.started) {
    ariaParts.push(`${row.levelsDone} of ${row.totalLevels} levels`);
  }
  ariaParts.push(tierWord);
  if (row.needsReview) ariaParts.push('due for review');
  const rowAria = ariaParts.join(', ');

  return (
    <Box
      role="listitem"
      aria-label={rowAria}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        height: 32,
      }}
    >
      {/* Leading check slot reserved for mastered rows; keeps all labels
          aligned whether a row is mastered or not. */}
      <Box sx={{ width: 14, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        {isMastered && (
          <Icon name="check_circle" size={14} filled color="success.main" />
        )}
      </Box>
      <Typography
        sx={{
          width: 96,
          flexShrink: 0,
          fontSize: '0.875rem',
          fontWeight: row.started ? 500 : 400,
          color: row.started ? 'text.primary' : 'text.secondary',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {row.label}
      </Typography>
      {/* Progress track + fill. Thin (3px) and capped in width so the bar
          reads as a quiet indicator rather than dominating the row. A
          single rounded pill with an absolutely positioned inner fill
          keeps the end caps flush. */}
      <Box
        sx={{
          flex: 1,
          maxWidth: 140,
          height: 3,
          borderRadius: '999px',
          bgcolor: theme => `${theme.palette.primary.main}14`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {row.levelsDone > 0 && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              width: `${pct}%`,
              borderRadius: '999px',
              bgcolor: barColor,
            }}
          />
        )}
      </Box>
      <Box
        sx={{
          width: 48,
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 0.5,
        }}
      >
        <Typography
          sx={{
            fontSize: '0.75rem',
            fontVariantNumeric: 'tabular-nums',
            color: row.started ? 'text.secondary' : 'text.disabled',
          }}
        >
          {row.started ? `${row.levelsDone}/${row.totalLevels}` : '—'}
        </Typography>
        {/* A single warning dot communicates review faster than a text
            label would — an orange pip in a field of green/blue bars is
            immediately scannable. Hidden from SR since the row's
            aria-label already encodes "due for review". */}
        {row.needsReview && (
          <Box
            aria-hidden="true"
            sx={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              bgcolor: 'warning.main',
              flexShrink: 0,
            }}
          />
        )}
      </Box>
    </Box>
  );
}

/**
 * Modal showing per-exercise mastery for an entire category (scales or
 * arpeggios). Opens when the user taps the matching big-stat card on the
 * home screen.
 *
 * Layout: a single-column horizontal bar chart. Each row is one scale,
 * with the progress bar carrying tier (color), progress (length), and
 * review state (trailing dot). This is intentionally sparser than an
 * M3 list item because the bar itself replaces the tier label, supporting
 * text line, and per-row mini-bar that earlier iterations composed, while
 * keeping information density high enough to show all 22 scales at once.
 */
export default function MasteryDetailsDialog({
  open,
  onClose,
  category,
  progress,
}: MasteryDetailsDialogProps) {
  const kinds = category === 'scale' ? SCALE_KINDS : ARPEGGIO_KINDS;
  const title = category === 'scale' ? 'Your scales' : 'Your arpeggios';
  const noun = category === 'scale' ? 'scale' : 'arpeggio';
  const nounPlural = category === 'scale' ? 'scales' : 'arpeggios';

  // Strip the trailing kind suffix because the dialog title already
  // supplies it: "G Major Scale" -> "G Major" reads cleaner in the 120px
  // name column.
  const suffix = category === 'scale' ? /\s+Scale$/ : /\s+Arpeggio$/;
  const rows: Row[] = TIERS.flatMap(t =>
    t.exercises
      .filter(ex => kinds.includes(ex.kind))
      .map(ex => {
        const ep = getExerciseProgress(progress, ex.id);
        const tier: MasteryTier = getMasteryTier(ep, ex);
        const completedIdx = ep.completedStageId
          ? ex.stages.findIndex(s => s.id === ep.completedStageId)
          : -1;
        const levelsDone = completedIdx + 1;
        const totalLevels = ex.stages.length;
        return {
          id: ex.id,
          label: ex.label.replace(suffix, ''),
          tier,
          started: levelsDone > 0,
          levelsDone,
          totalLevels,
          needsReview: ep.needsReview,
        };
      }),
  );

  const totalMastered = rows.filter(r => r.tier === 'mastered').length;
  const totalFluent = rows.filter(r => r.tier === 'fluent' || r.tier === 'mastered').length;

  // Sort: active (progress > 0) to the top, mastered before fluent before
  // learning; within a tier, more progress first. Not-started rows follow
  // in curriculum order. The visual transition from colored bars to empty
  // tracks is self-evident, so no section headers are needed.
  const tierRank: Record<MasteryTier, number> = { mastered: 0, fluent: 1, learning: 2 };
  const sortedRows: Row[] = [
    ...rows
      .filter(r => r.started)
      .slice()
      .sort((a, b) => {
        const byTier = tierRank[a.tier] - tierRank[b.tier];
        if (byTier !== 0) return byTier;
        return b.levelsDone - a.levelsDone;
      }),
    ...rows.filter(r => !r.started),
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '28px',
          maxHeight: '85vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          px: 3,
          pt: 3,
          pb: 2,
        }}
      >
        <Box>
          <Typography
            component="h2"
            sx={{ fontSize: '1.5rem', fontWeight: 400, lineHeight: 1.33 }}
          >
            {title}
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', mt: 0.5 }}>
            {/* Fluent leads because it is the realistic near-term tier and
                matches the home-screen big-stat framing. Mastered is only
                mentioned once the learner has at least one. */}
            {totalFluent} fluent
            {totalMastered > 0 ? `, ${totalMastered} mastered` : ''}
            {' '}of {rows.length} {nounPlural}
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Close" size="small" sx={{ mt: -0.5 }}>
          <Icon name="close" size={20} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: 3, pt: 0, pb: 3 }}>
        {/* Two-column grid on sm+ so 22 rows render as ~11 visible rows,
            further de-emphasizing the bar as a primary visual element
            (narrower cells = shorter bars). Collapses to a single column
            on xs where columns would be too cramped. */}
        <Box
          role="list"
          aria-label={title}
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            columnGap: 4,
            rowGap: 0,
          }}
        >
          {sortedRows.map(row => (
            <BarRow key={row.id} row={row} noun={noun} />
          ))}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
