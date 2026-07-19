import { useMemo } from 'react';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ScoreDisplay from '../../shared/notation/ScoreDisplay';
import { useMidi } from '../useMidi';
import { selectDisplayScore } from '../selectors';
import { CaptureBar } from './CaptureBar';
import { NotationStrictnessSlider } from './NotationStrictnessSlider';
import { LoopTransport } from './LoopTransport';
import { DragExportChip } from './DragExportChip';

const EMPTY_NOTE_INDICES = new Map<string, number>();

export function ScratchpadView() {
  const { state } = useMidi();
  const score = useMemo(() => selectDisplayScore(state), [state]);

  return (
    <Box className="midi-playground-sheet">
      <Box className="midi-staff-panel" aria-label="Captured notation">
        {score ? (
          <ScoreDisplay
            score={score}
            currentMeasureIndex={0}
            currentNoteIndices={EMPTY_NOTE_INDICES}
            activeMidiNotes={new Set(state.activeMidis)}
            highlightActiveMatches
          />
        ) : (
          <Box className="midi-empty-staff">
            <Typography component="p" variant="body1" className="midi-empty-staff-title">
              Your scratchpad is empty
            </Typography>
            <Typography component="p" variant="body2" sx={{
              color: "text.secondary"
            }}>
              Start the metronome, play a few bars, then capture.
            </Typography>
          </Box>
        )}
      </Box>
      <Box className="midi-playground-actions">
        <CaptureBar />

        <Box className="midi-playground-secondary">
          <NotationStrictnessSlider />
          <Stack
            direction="row"
            spacing={1.5}
            useFlexGap
            sx={{
              alignItems: "center",
              flexWrap: "wrap"
            }}>
            <LoopTransport />
            <DragExportChip />
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
