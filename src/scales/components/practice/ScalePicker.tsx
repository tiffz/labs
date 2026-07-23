import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import Collapse from '@mui/material/Collapse';
import BpmInput from '../../../shared/components/music/BpmInput';
import type { ExerciseKind, Hand, Key, PracticeItem, SubdivisionMode } from '../../curriculum/types';
import {
  FREE_PRACTICE_KINDS,
  FREE_PRACTICE_MIN_BPM,
  FREE_PRACTICE_MAX_BPM,
  keysForKind,
} from '../../practice/freePracticeOptions';

const SUBDIVISION_LABELS: Record<SubdivisionMode, string> = {
  none: 'Quarter notes',
  eighth: 'Eighths',
  triplet: 'Triplets',
  sixteenth: 'Sixteenths',
};

const HAND_LABELS: Record<Hand, string> = {
  right: 'Right',
  left: 'Left',
  both: 'Both',
};

/**
 * Controlled editor for a single {@link PracticeItem}. Key and scale are the
 * only fields shown up front (the ones a user actually came to change);
 * everything else lives behind "More options" pre-filled with sensible
 * defaults, so the picker is playable in one tap.
 *
 * Shared by Free Practice and the routine editor so both offer an identical,
 * gestalt-consistent control.
 */
export default function ScalePicker({
  value,
  onChange,
  idPrefix = 'scale-picker',
}: {
  value: PracticeItem;
  onChange: (next: PracticeItem) => void;
  idPrefix?: string;
}) {
  const [moreOpen, setMoreOpen] = useState(false);

  const setKind = (kind: ExerciseKind) => {
    const keys = keysForKind(kind);
    // Keep the current key if the new scale supports it; otherwise fall back
    // to the first available so the picker never lands on an invalid pair.
    const key = keys.includes(value.key) ? value.key : keys[0];
    onChange({ ...value, kind, key });
  };

  const kindLabelId = `${idPrefix}-kind-label`;
  const keyLabelId = `${idPrefix}-key-label`;
  const subLabelId = `${idPrefix}-sub-label`;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' }, gap: 2 }}>
        <FormControl fullWidth>
          <InputLabel id={kindLabelId}>Scale</InputLabel>
          <Select
            labelId={kindLabelId}
            label="Scale"
            value={value.kind}
            onChange={e => setKind(e.target.value as ExerciseKind)}
          >
            {FREE_PRACTICE_KINDS.map(k => (
              <MenuItem key={k.kind} value={k.kind}>{k.label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel id={keyLabelId}>Key</InputLabel>
          <Select
            labelId={keyLabelId}
            label="Key"
            value={value.key}
            onChange={e => onChange({ ...value, key: e.target.value as Key })}
          >
            {keysForKind(value.kind).map(k => (
              <MenuItem key={k} value={k}>{k}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Box>
        <Button
          variant="text"
          onClick={() => setMoreOpen(o => !o)}
          aria-expanded={moreOpen}
          endIcon={
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              {moreOpen ? 'expand_less' : 'expand_more'}
            </span>
          }
          sx={{ textTransform: 'none', px: 1 }}
        >
          More options
        </Button>

        <Collapse in={moreOpen}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
            <Box>
              <Typography component="span" sx={{ display: 'block', mb: 1, fontWeight: 500, fontSize: '0.875rem' }}>
                Hands
              </Typography>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={value.hand}
                onChange={(_e, next: Hand | null) => next && onChange({ ...value, hand: next })}
                aria-label="Hands"
              >
                {(['right', 'left', 'both'] as Hand[]).map(h => (
                  <ToggleButton key={h} value={h} sx={{ textTransform: 'none', px: 2.5 }}>
                    {HAND_LABELS[h]}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>

            <Box>
              <Typography component="span" sx={{ display: 'block', mb: 1, fontWeight: 500, fontSize: '0.875rem' }}>
                Octaves
              </Typography>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={value.octaves}
                onChange={(_e, next: 1 | 2 | null) => next && onChange({ ...value, octaves: next })}
                aria-label="Octaves"
              >
                <ToggleButton value={1} sx={{ px: 2.5 }}>1</ToggleButton>
                <ToggleButton value={2} sx={{ px: 2.5 }}>2</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <FormControl sx={{ maxWidth: 240 }}>
              <InputLabel id={subLabelId}>Rhythm</InputLabel>
              <Select
                labelId={subLabelId}
                label="Rhythm"
                value={value.subdivision}
                onChange={e => onChange({ ...value, subdivision: e.target.value as SubdivisionMode })}
              >
                {(['none', 'eighth', 'triplet', 'sixteenth'] as SubdivisionMode[]).map(s => (
                  <MenuItem key={s} value={s}>{SUBDIVISION_LABELS[s]}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box>
              <Typography component="span" sx={{ display: 'block', mb: 1, fontWeight: 500, fontSize: '0.875rem' }}>
                Tempo
              </Typography>
              <BpmInput
                value={value.bpm}
                onChange={bpm => onChange({ ...value, bpm })}
                min={FREE_PRACTICE_MIN_BPM}
                max={FREE_PRACTICE_MAX_BPM}
                layout="inline"
              />
            </Box>
          </Box>
        </Collapse>
      </Box>
    </Box>
  );
}
