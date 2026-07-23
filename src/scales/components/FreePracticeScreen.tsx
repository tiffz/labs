import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { useScales, hasEnabledMidiDevice } from '../store';
import ScalesInputSources from './InputSources';
import ScalePicker from './practice/ScalePicker';
import { defaultPracticeItem, practiceItemHeadline } from '../practice/freePracticeOptions';
import { createRoutineId } from '../practice/routineTemplates';
import type { PracticeItem } from '../curriculum/types';

/**
 * Free Practice — pick any scale and drill it in isolation, ungated by the
 * curriculum. Opens pre-filled with the last selection (or a known-good
 * default) so it is playable in one tap.
 */
export default function FreePracticeScreen() {
  const { state, dispatch, startFreePractice } = useScales();
  const hasInput = hasEnabledMidiDevice(state) || state.microphoneActive;

  const [item, setItem] = useState<PracticeItem>(
    () => state.progress.lastFreePracticeParams ?? defaultPracticeItem(),
  );

  const goHome = () => dispatch({ type: 'SET_SCREEN', screen: 'home' });

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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton onClick={goHome} aria-label="Back to home" size="small">
          <span className="material-symbols-outlined">arrow_back</span>
        </IconButton>
        <Typography component="h1" sx={{ fontSize: '1.5rem', fontWeight: 500 }}>
          Practice something specific
        </Typography>
      </Box>

      <Typography sx={{ color: 'text.secondary', mb: 3 }}>
        Pick a scale and key, then play. Nothing here counts toward your guided path.
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
        <ScalesInputSources />
      </Box>

      <ScalePicker value={item} onChange={setItem} idPrefix="free-practice" />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 5 }}>
        <Button
          variant="contained"
          disableElevation
          disabled={!hasInput}
          onClick={() => startFreePractice(item)}
          startIcon={<span className="material-symbols-outlined" style={{ fontSize: 20 }}>play_arrow</span>}
          sx={{ borderRadius: '999px', px: 4, height: 48 }}
        >
          Start
        </Button>
        <Button
          variant="outlined"
          onClick={saveAsRoutine}
          startIcon={<span className="material-symbols-outlined" style={{ fontSize: 20 }}>bookmark_add</span>}
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
