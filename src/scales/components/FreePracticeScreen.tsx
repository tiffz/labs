import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Collapse from '@mui/material/Collapse';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useScales, hasEnabledMidiDevice } from '../store';
import ScalesInputSources from './InputSources';
import CircleOfFifths from './practice/CircleOfFifths';
import BpmInput from '../../shared/components/music/BpmInput';
import {
  FREE_PRACTICE_KINDS,
  FREE_PRACTICE_MIN_BPM,
  FREE_PRACTICE_MAX_BPM,
  keysForKind,
  keyForKindOrDefault,
  defaultPracticeItem,
  practiceItemHeadline,
} from '../practice/freePracticeOptions';
import { getRecentPracticeItems, practiceItemIdentity } from '../progress/store';
import { createRoutineId } from '../practice/routineTemplates';
import type { ExerciseKind, Hand, Key, PracticeItem, SubdivisionMode } from '../curriculum/types';

function MSym({ name, size = 20 }: { name: string; size?: number }) {
  return <span className="material-symbols-outlined" style={{ fontSize: size }}>{name}</span>;
}

const SUBDIVISION_LABELS: Record<SubdivisionMode, string> = {
  none: 'Quarter notes', eighth: 'Eighths', triplet: 'Triplets', sixteenth: 'Sixteenths',
};
const HAND_LABELS: Record<Hand, string> = { right: 'Right', left: 'Left', both: 'Both' };

const selectedToggleSx = {
  '&.Mui-selected, &.Mui-selected:hover': {
    backgroundColor: 'var(--labs-selection-secondary-bg, rgba(5, 150, 105, 0.14))',
    color: 'var(--labs-selection-secondary-fg, #047857)',
    borderColor: 'var(--labs-selection-secondary-border, rgba(5, 150, 105, 0.28))',
    fontWeight: 600,
  },
} as const;

/**
 * Practice — pick any scale from a menu (family cards + circle-of-fifths key
 * wheel), then Start. Opens pre-filled from the last selection or a known-good
 * default; hands/octaves/tempo hide behind "Adjust". Picking a scale starts a
 * one-item, curriculum-isolated session; recents make the common case one tap.
 */
export default function FreePracticeScreen() {
  const { state, dispatch, startFreePractice } = useScales();
  const hasInput = hasEnabledMidiDevice(state) || state.microphoneActive;
  const recents = getRecentPracticeItems(state.progress);

  const [item, setItem] = useState<PracticeItem>(
    () => state.progress.lastFreePracticeParams ?? defaultPracticeItem(),
  );
  const [adjustOpen, setAdjustOpen] = useState(false);

  const goHome = () => dispatch({ type: 'SET_SCREEN', screen: 'home' });

  const setKind = (kind: ExerciseKind) =>
    setItem({ ...item, kind, key: keyForKindOrDefault(kind, item.key) });

  const selectedOption = FREE_PRACTICE_KINDS.find(k => k.kind === item.kind) ?? FREE_PRACTICE_KINDS[0];
  const qualityLabel = selectedOption.quality === 'minor' ? 'minor' : 'major';

  const saveAsRoutine = () => {
    dispatch({
      type: 'SAVE_ROUTINE',
      routine: {
        id: createRoutineId(),
        name: practiceItemHeadline(item),
        updatedAt: new Date().toISOString(),
        items: [{ ...item }],
      },
    });
    dispatch({ type: 'SET_SCREEN', screen: 'routines' });
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 720, mx: 'auto', px: { xs: 3, sm: 4 }, py: { xs: 3, md: 5 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <IconButton onClick={goHome} aria-label="Back to home" size="small">
          <MSym name="arrow_back" />
        </IconButton>
        <Typography component="h1" sx={{ fontSize: '1.5rem', fontWeight: 700 }}>
          Practice
        </Typography>
      </Box>
      <Typography sx={{ color: 'text.secondary', mb: 3, ml: 5.5, mt: -0.5, fontSize: '0.9rem' }}>
        {"Drill anything you like. It won't touch your path."}
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
        <ScalesInputSources />
      </Box>

      {recents.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <SectionLabel>Pick up where you left off</SectionLabel>
          <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 0.5, mx: -0.5, px: 0.5 }}>
            {recents.map(r => (
              <ButtonBase
                key={practiceItemIdentity(r)}
                focusRipple
                disabled={!hasInput}
                onClick={() => startFreePractice(r)}
                aria-label={`Start ${practiceItemHeadline(r)}`}
                sx={{
                  flex: '0 0 auto', gap: 1, px: 1.25, py: 1, borderRadius: '999px',
                  border: theme => `1px solid ${theme.palette.divider}`,
                  fontSize: '0.84rem', fontWeight: 600, whiteSpace: 'nowrap',
                  '&:hover': { bgcolor: 'action.hover' },
                  '&.Mui-disabled': { opacity: 0.55 },
                  '&:focus-visible': { outline: theme => `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
                }}
              >
                <Box aria-hidden sx={{
                  width: 20, height: 20, borderRadius: '50%', display: 'grid', placeItems: 'center',
                  bgcolor: theme => `${theme.palette.primary.main}29`, color: 'primary.main', flexShrink: 0,
                }}>
                  <MSym name="play_arrow" size={14} />
                </Box>
                {practiceItemHeadline(r)}
              </ButtonBase>
            ))}
          </Box>
        </Box>
      )}

      <SectionLabel>Choose a family</SectionLabel>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 1.25, mb: 3 }}>
        {FREE_PRACTICE_KINDS.map(fam => {
          const selected = fam.kind === item.kind;
          return (
            <ButtonBase
              key={fam.kind}
              focusRipple
              onClick={() => setKind(fam.kind)}
              aria-pressed={selected}
              aria-label={fam.label}
              sx={{
                display: 'block', textAlign: 'left', p: 1.5, borderRadius: '14px',
                // Selection + focus use the shared brand tokens, never the
                // per-family accent (which stays on the glyph chip only) — so
                // every card selects the same way and the focus ring is consistent.
                border: theme => `1.5px solid ${selected
                  ? 'var(--labs-selection-secondary-border, ' + theme.palette.primary.main + ')'
                  : theme.palette.divider}`,
                bgcolor: selected
                  ? 'var(--labs-selection-secondary-bg, rgba(5, 150, 105, 0.14))'
                  : 'background.paper',
                transition: 'transform 120ms ease',
                '&:hover': { transform: 'translateY(-1px)' },
                '&:focus-visible': { outline: theme => `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
              }}
            >
              <Box sx={{
                width: 30, height: 30, borderRadius: '9px', display: 'grid', placeItems: 'center',
                bgcolor: fam.accent, color: '#fff', fontWeight: 800, fontSize: '0.95rem', mb: 1,
              }}>{fam.glyph}</Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.2 }}>{fam.label}</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: '0.72rem', mt: 0.25, lineHeight: 1.3 }}>
                {fam.blurb}
              </Typography>
            </ButtonBase>
          );
        })}
      </Box>

      <SectionLabel>Choose a key</SectionLabel>
      <CircleOfFifths
        keys={keysForKind(item.kind)}
        value={item.key}
        onChange={(key: Key) => setItem({ ...item, key })}
        qualityLabel={qualityLabel}
      />

      {/* Preview + adjust */}
      <Box sx={{
        mt: 3, p: 2, borderRadius: '14px', border: theme => `1px solid ${theme.palette.divider}`,
        bgcolor: 'action.hover',
      }}>
        <Typography sx={{ fontWeight: 700 }}>{practiceItemHeadline(item)}</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
          {HAND_LABELS[item.hand]} hands · {item.octaves} octave{item.octaves === 1 ? '' : 's'} · ♩ = {item.bpm}
        </Typography>
        <Button
          variant="text"
          size="small"
          onClick={() => setAdjustOpen(o => !o)}
          aria-expanded={adjustOpen}
          endIcon={<MSym name={adjustOpen ? 'expand_less' : 'expand_more'} size={18} />}
          sx={{ textTransform: 'none', mt: 0.5, px: 0.5 }}
        >
          Adjust
        </Button>
        <Collapse in={adjustOpen}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1.5 }}>
            <Box>
              <SectionLabel>Hands</SectionLabel>
              <ToggleButtonGroup
                exclusive size="small" value={item.hand}
                onChange={(_e, v: Hand | null) => v && setItem({ ...item, hand: v })}
                aria-label="Hands"
              >
                {(['right', 'left', 'both'] as Hand[]).map(h => (
                  <ToggleButton key={h} value={h} sx={{ textTransform: 'none', px: 2.5, ...selectedToggleSx }}>
                    {HAND_LABELS[h]}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
            <Box>
              <SectionLabel>Octaves</SectionLabel>
              <ToggleButtonGroup
                exclusive size="small" value={item.octaves}
                onChange={(_e, v: 1 | 2 | null) => v && setItem({ ...item, octaves: v })}
                aria-label="Octaves"
              >
                <ToggleButton value={1} sx={{ px: 2.5, ...selectedToggleSx }}>1</ToggleButton>
                <ToggleButton value={2} sx={{ px: 2.5, ...selectedToggleSx }}>2</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <FormControl sx={{ maxWidth: 240 }}>
              <InputLabel id="fp-rhythm">Rhythm</InputLabel>
              <Select
                labelId="fp-rhythm" label="Rhythm" value={item.subdivision}
                onChange={e => setItem({ ...item, subdivision: e.target.value as SubdivisionMode })}
              >
                {(['none', 'eighth', 'triplet', 'sixteenth'] as SubdivisionMode[]).map(s => (
                  <MenuItem key={s} value={s}>{SUBDIVISION_LABELS[s]}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box>
              <SectionLabel>Tempo</SectionLabel>
              <BpmInput
                value={item.bpm}
                onChange={bpm => setItem({ ...item, bpm })}
                min={FREE_PRACTICE_MIN_BPM}
                max={FREE_PRACTICE_MAX_BPM}
                layout="inline"
              />
            </Box>
          </Box>
        </Collapse>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 3 }}>
        <Button
          variant="contained"
          disableElevation
          disabled={!hasInput}
          onClick={() => startFreePractice(item)}
          startIcon={<MSym name="play_arrow" size={20} />}
          aria-label={`Start ${practiceItemHeadline(item)}`}
          sx={{ borderRadius: '999px', px: 4, height: 48 }}
        >
          Start
        </Button>
        <Button
          variant="outlined"
          onClick={saveAsRoutine}
          startIcon={<MSym name="bookmark_add" size={20} />}
          sx={{ borderRadius: '999px', px: 3, height: 48 }}
        >
          Save as routine
        </Button>
      </Box>

      {!hasInput && (
        <Typography sx={{ color: 'text.secondary', mt: 2, fontSize: '0.875rem' }}>
          Connect MIDI or a microphone above to start playing.
        </Typography>
      )}
    </Box>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      component="div"
      sx={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.66rem', fontWeight: 700, color: 'text.secondary', mb: 1, mt: 0.5 }}
    >
      {children}
    </Typography>
  );
}
