import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { useTheme, alpha } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import { TIERS } from '../curriculum/tiers';
import type { ExerciseKind } from '../curriculum/types';
import { getExerciseProgress, getMasteryTier, type MasteryTier } from '../progress/store';
import type { ScalesProgressData } from '../progress/types';

const SCALE_KINDS: ExerciseKind[] = ['major-scale', 'natural-minor-scale'];
const ARPEGGIO_KINDS: ExerciseKind[] = ['arpeggio-major', 'arpeggio-minor'];

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
  root: string;
  tier: MasteryTier;
  started: boolean;
  levelsDone: number;
  totalLevels: number;
}

function Icon({
  name,
  size = 20,
  color,
}: { name: string; size?: number; color?: string }) {
  return (
    <Box
      component="span"
      aria-hidden="true"
      className="material-symbols-outlined"
      sx={{
        fontSize: size,
        lineHeight: 1,
        color,
      }}
    >
      {name}
    </Box>
  );
}

function parseScaleName(label: string): { root: string; quality: string } {
  const match = label.match(/^([A-G][#b]?)\s+(.+)$/);
  if (!match) return { root: label, quality: '' };
  return { root: match[1], quality: match[2] };
}

function prettifyRoot(root: string): string {
  return root.replace('#', '\u266F').replace('b', '\u266D');
}

function prettifyLabel(label: string): string {
  const { root, quality } = parseScaleName(label);
  if (!quality) return label;
  return `${prettifyRoot(root)} ${quality}`;
}

function ariaFor(row: Row, noun: string): string {
  const tierWord = row.tier === 'mastered'
    ? 'mastered'
    : row.tier === 'fluent'
      ? 'fluent'
      : row.started
        ? 'in progress'
        : 'not started';
  const parts = [`${row.label} ${noun}`, tierWord];
  if (row.started) parts.push(`${row.levelsDone} of ${row.totalLevels} levels`);
  return parts.join(', ');
}

// Per-tier visual tokens. We differentiate tiers via card chrome
// (background tint + border color + border style) rather than
// swapping icons in the ring — the root letter stays inside every
// badge so the grid reads at a glance. The ring's arc length is
// always tied to `levelsDone / totalLevels`, so it matches the
// fraction shown in the status text.
interface TierVisual {
  ringAccent: string;
  ringTrack: string;
  ringProgress: number;
  rootColor: string;
  cardBg: string;
  cardBorderColor: string;
  cardBorderStyle: 'solid' | 'dashed';
  nameColor: string;
  statusColor: string;
  statusText: string;
}

function tierVisual(row: Row, theme: Theme): TierVisual {
  const success = theme.palette.success.main;
  const successDark = theme.palette.success.dark;
  const primary = theme.palette.primary.main;
  const progress = row.totalLevels > 0 ? row.levelsDone / row.totalLevels : 0;

  if (row.tier === 'mastered') {
    return {
      ringAccent: success,
      ringTrack: alpha(success, 0.22),
      ringProgress: 1,
      rootColor: successDark,
      cardBg: alpha(success, 0.16),
      cardBorderColor: success,
      cardBorderStyle: 'solid',
      nameColor: successDark,
      statusColor: successDark,
      statusText: 'Mastered',
    };
  }

  if (row.tier === 'fluent') {
    return {
      ringAccent: success,
      ringTrack: alpha(success, 0.16),
      ringProgress: progress,
      rootColor: successDark,
      cardBg: alpha(success, 0.06),
      cardBorderColor: alpha(success, 0.75),
      cardBorderStyle: 'solid',
      nameColor: successDark,
      statusColor: successDark,
      statusText: `Fluent \u00b7 ${row.levelsDone}/${row.totalLevels}`,
    };
  }

  if (row.started) {
    return {
      ringAccent: primary,
      ringTrack: alpha(primary, 0.16),
      ringProgress: progress,
      rootColor: theme.palette.text.primary,
      cardBg: 'transparent',
      cardBorderColor: alpha(theme.palette.text.primary, 0.22),
      cardBorderStyle: 'solid',
      nameColor: theme.palette.text.primary,
      statusColor: theme.palette.text.secondary,
      statusText: `${row.levelsDone}/${row.totalLevels}`,
    };
  }

  return {
    ringAccent: theme.palette.text.disabled,
    ringTrack: theme.palette.divider,
    ringProgress: 0,
    rootColor: theme.palette.text.disabled,
    cardBg: 'transparent',
    cardBorderColor: alpha(theme.palette.text.primary, 0.18),
    cardBorderStyle: 'dashed',
    nameColor: theme.palette.text.secondary,
    statusColor: theme.palette.text.disabled,
    statusText: 'Not started',
  };
}

interface BadgeRingProps {
  size: number;
  stroke: number;
  progress: number;
  accent: string;
  track: string;
  children?: ReactNode;
}

function BadgeRing({ size, stroke, progress, accent, track, children }: BadgeRingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - progress);
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <Box
        component="svg"
        aria-hidden="true"
        width={size}
        height={size}
        sx={{ position: 'absolute', inset: 0, display: 'block' }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={track}
          strokeWidth={stroke}
        />
        {progress > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={accent}
            strokeWidth={stroke}
            strokeDasharray={c}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </Box>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

function MasteryCard({ row, noun }: { row: Row; noun: string }) {
  const theme = useTheme();
  const v = tierVisual(row, theme);

  return (
    <Box
      role="listitem"
      aria-label={ariaFor(row, noun)}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        px: 1.25,
        py: 1.5,
        borderRadius: '12px',
        bgcolor: v.cardBg,
        border: `1px ${v.cardBorderStyle} ${v.cardBorderColor}`,
      }}
    >
      <BadgeRing
        size={48}
        stroke={3}
        progress={v.ringProgress}
        accent={v.ringAccent}
        track={v.ringTrack}
      >
        <Typography
          sx={{
            fontSize: '1.125rem',
            fontWeight: 500,
            lineHeight: 1,
            letterSpacing: '-0.01em',
            color: v.rootColor,
          }}
        >
          {prettifyRoot(row.root)}
        </Typography>
      </BadgeRing>

      <Typography
        sx={{
          fontSize: '0.8125rem',
          fontWeight: 500,
          lineHeight: 1.25,
          color: v.nameColor,
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100%',
          mt: 0.25,
        }}
      >
        {prettifyLabel(row.label)}
      </Typography>

      <Typography
        sx={{
          fontSize: '0.6875rem',
          fontWeight: 500,
          letterSpacing: '0.04em',
          lineHeight: 1,
          color: v.statusColor,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {v.statusText}
      </Typography>
    </Box>
  );
}

/**
 * Minimalist M3-outlined card grid of per-scale mastery. Each card
 * shows the scale root inside a circular progress ring whose arc
 * tracks `levelsDone / totalLevels`. Tier (mastered / fluent /
 * learning / not started) is conveyed by the card's background and
 * border treatment — tinted + solid for mastered, solid success
 * border for fluent, solid divider for learning, dashed divider for
 * not started — not by swapping icons inside the ring.
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
        const label = ex.label.replace(suffix, '');
        const { root } = parseScaleName(label);
        return {
          id: ex.id,
          label,
          root,
          tier,
          started: levelsDone > 0,
          levelsDone,
          totalLevels,
        };
      }),
  );

  const totalMastered = rows.filter(r => r.tier === 'mastered').length;
  const totalFluent = rows.filter(r => r.tier === 'fluent' || r.tier === 'mastered').length;

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
      PaperProps={{ sx: { borderRadius: '28px', maxHeight: '90vh' } }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          px: { xs: 2.5, sm: 3 },
          pt: { xs: 2.5, sm: 3 },
          pb: 1,
        }}
      >
        <Box>
          <Typography
            component="h2"
            sx={{
              fontSize: '1.5rem',
              fontWeight: 500,
              letterSpacing: '-0.01em',
              lineHeight: 1.25,
            }}
          >
            {title}
          </Typography>
          <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mt: 0.5 }}>
            {totalFluent} fluent
            {totalMastered > 0 ? `, ${totalMastered} mastered` : ''}
            {' '}of {rows.length} {nounPlural}
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Close" size="small" sx={{ mt: -0.5 }}>
          <Icon name="close" size={20} />
        </IconButton>
      </DialogTitle>
      <DialogContent
        sx={{
          px: { xs: 2.5, sm: 3 },
          pt: 1.5,
          pb: { xs: 2.5, sm: 3 },
        }}
      >
        <Box
          role="list"
          aria-label={title}
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(3, 1fr)',
              sm: 'repeat(4, 1fr)',
              md: 'repeat(5, 1fr)',
              lg: 'repeat(6, 1fr)',
            },
            gap: { xs: 1, sm: 1.25 },
          }}
        >
          {sortedRows.map(row => (
            <MasteryCard key={row.id} row={row} noun={noun} />
          ))}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
