import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
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
import { TYPE, Icon } from './scalesUi';
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

const SUBDIVISION_LABELS: Record<SubdivisionMode, string> = {
  none: 'Quarter notes', eighth: 'Eighths', triplet: 'Triplets', sixteenth: 'Sixteenths',
};
const HAND_LABELS: Record<Hand, string> = { right: 'Right', left: 'Left', both: 'Both' };

// The app's emerald alpha-tint selection (matches Home/Progress), not MUI grey
// or the shared lilac secondary token.
const greenToggleSx = {
  '&.Mui-selected, &.Mui-selected:hover': {
    backgroundColor: (t: { palette: { primary: { main: string } } }) => `${t.palette.primary.main}14`,
    color: 'primary.main',
    borderColor: 'primary.main',
  },
} as const;

/**
 * Practice — pick any scale from a menu (family cards + circle-of-fifths key
 * wheel), then Start. Uses the Scales app design language (TYPE scale, outlined
 * 16px cards, emerald tint selection). Opens pre-filled from the last selection
 * or a known-good default; hands/octaves/tempo hide behind "Adjust". Picking a
 * scale starts a one-item, curriculum-isolated session.
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
    <Box sx={{ width: '100%', maxWidth: 840, mx: 'auto', px: { xs: 4, sm: 6 }, py: { xs: 5, md: 8 } }}>
      {/* Header — matches the Progress screen */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: { xs: 4, md: 5 } }}>
        <IconButton
          aria-label="Back to home"
          onClick={goHome}
          sx={{ color: 'text.primary', borderRadius: '50%', width: 40, height: 40, '&:hover': { bgcolor: 'action.hover' } }}
        >
          <Icon name="arrow_back" size={22} />
        </IconButton>
        <Typography component="h1" sx={{ ...TYPE.displaySmall, color: 'text.primary', flex: 1 }}>
          Practice
        </Typography>
        <Box sx={{ flexShrink: 0 }}><ScalesInputSources /></Box>
      </Box>
      <Typography sx={{ ...TYPE.bodyLarge, color: 'text.secondary', mb: { xs: 4, md: 5 }, maxWidth: 560 }}>
        {"Drill anything you like. It won't touch your path."}
      </Typography>

      {recents.length > 0 && (
        <Box sx={{ mb: { xs: 4, md: 5 } }}>
          <SectionLabel>Pick up where you left off</SectionLabel>
          <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 0.5, mx: -0.5, px: 0.5 }} data-labs-allow-horizontal-scroll>
            {recents.map(r => (
              <RecentChip key={practiceItemIdentity(r)} item={r} disabled={!hasInput} onClick={() => startFreePractice(r)} />
            ))}
          </Box>
        </Box>
      )}

      <SectionLabel>Choose a family</SectionLabel>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: { xs: 4, md: 5 } }}>
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
                display: 'block', textAlign: 'left', p: 2, borderRadius: '16px',
                border: theme => `${selected ? 2 : 1}px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
                bgcolor: selected ? theme => `${theme.palette.primary.main}08` : 'background.paper',
                transition: 'background-color 120ms ease',
                '&:hover': { bgcolor: selected ? theme => `${theme.palette.primary.main}0D` : 'action.hover' },
                '&:focus-visible': { outline: theme => `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
              }}
            >
              <Box
                aria-hidden
                sx={{
                  width: 32, height: 32, borderRadius: '50%', display: 'grid', placeItems: 'center', mb: 1.25,
                  bgcolor: theme => `${theme.palette.primary.main}14`, color: 'primary.main', ...TYPE.labelLarge,
                }}
              >
                {fam.glyph}
              </Box>
              <Typography sx={{ ...TYPE.titleMedium, color: 'text.primary' }}>{fam.label}</Typography>
              <Typography sx={{ ...TYPE.bodySmall, color: 'text.secondary', mt: 0.25 }}>{fam.blurb}</Typography>
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

      <Paper variant="outlined" sx={{ mt: { xs: 4, md: 5 }, p: 3, borderRadius: '16px', borderColor: 'divider' }}>
        <Typography sx={{ ...TYPE.titleMedium, color: 'text.primary' }}>{practiceItemHeadline(item)}</Typography>
        <Typography sx={{ ...TYPE.bodyMedium, color: 'text.secondary' }}>
          {HAND_LABELS[item.hand]} hands · {item.octaves} octave{item.octaves === 1 ? '' : 's'} · ♩ = {item.bpm}
        </Typography>
        <Button
          variant="text"
          onClick={() => setAdjustOpen(o => !o)}
          aria-expanded={adjustOpen}
          endIcon={<Icon name={adjustOpen ? 'expand_less' : 'expand_more'} size={18} />}
          sx={{ ...TYPE.labelLarge, color: 'primary.main', textTransform: 'none', mt: 1, px: 0.5 }}
        >
          Adjust
        </Button>
        <Collapse in={adjustOpen}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
            <Box>
              <SectionLabel>Hands</SectionLabel>
              <ToggleButtonGroup
                exclusive size="small" value={item.hand}
                onChange={(_e, v: Hand | null) => v && setItem({ ...item, hand: v })}
                aria-label="Hands"
              >
                {(['right', 'left', 'both'] as Hand[]).map(h => (
                  <ToggleButton key={h} value={h} sx={{ ...TYPE.labelLarge, textTransform: 'none', px: 2.5, ...greenToggleSx }}>
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
                <ToggleButton value={1} sx={{ ...TYPE.labelLarge, px: 2.5, ...greenToggleSx }}>1</ToggleButton>
                <ToggleButton value={2} sx={{ ...TYPE.labelLarge, px: 2.5, ...greenToggleSx }}>2</ToggleButton>
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
      </Paper>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: { xs: 4, md: 5 } }}>
        <Button
          variant="contained"
          disableElevation
          disabled={!hasInput}
          onClick={() => startFreePractice(item)}
          startIcon={<Icon name="play_arrow" size={20} />}
          aria-label={`Start ${practiceItemHeadline(item)}`}
          sx={{ ...TYPE.labelLarge, borderRadius: '999px', px: 4, height: 48 }}
        >
          Start
        </Button>
        <Button
          variant="outlined"
          onClick={saveAsRoutine}
          startIcon={<Icon name="bookmark_add" size={20} />}
          sx={{ ...TYPE.labelLarge, borderRadius: '999px', px: 3, height: 48, textTransform: 'none' }}
        >
          Save as routine
        </Button>
      </Box>

      {!hasInput && (
        <Typography sx={{ ...TYPE.bodyMedium, color: 'text.secondary', mt: 2 }}>
          Connect MIDI or a microphone above to start playing.
        </Typography>
      )}
    </Box>
  );
}

function RecentChip({ item, disabled, onClick }: { item: PracticeItem; disabled: boolean; onClick: () => void }) {
  return (
    <ButtonBase
      focusRipple
      disabled={disabled}
      onClick={onClick}
      aria-label={`Start ${practiceItemHeadline(item)}`}
      sx={{
        flex: '0 0 auto', gap: 1, pl: 1, pr: 1.75, py: 1, borderRadius: '999px',
        border: theme => `1px solid ${theme.palette.divider}`, ...TYPE.labelLarge,
        color: 'text.primary', whiteSpace: 'nowrap',
        '&:hover': { bgcolor: 'action.hover' },
        '&.Mui-disabled': { opacity: 0.55 },
        '&:focus-visible': { outline: theme => `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
      }}
    >
      <Box aria-hidden sx={{
        width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0,
        bgcolor: theme => `${theme.palette.primary.main}1F`, color: 'primary.main',
      }}>
        <Icon name="play_arrow" size={15} />
      </Box>
      {practiceItemHeadline(item)}
    </ButtonBase>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      component="div"
      sx={{ ...TYPE.labelMedium, color: 'text.secondary', textTransform: 'uppercase', mb: 1.5 }}
    >
      {children}
    </Typography>
  );
}
