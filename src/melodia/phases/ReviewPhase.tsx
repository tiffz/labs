import { useCallback, useMemo, useRef, useState, type ReactElement } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { pickMelodyPart } from '../../shared/music/melodiaPipeline/partUtils';
import { playDuetReview, type DuetPlaybackHandle } from '../audio';
import { buildPitchedOnsets } from '../music';
import MelodiaStaff, { type MelodiaStaffLayout } from '../components/MelodiaStaff';
import MelodiaHeatMap from '../components/MelodiaHeatMap';
import { pitchMatchStats } from '../analysis';
import type { MelodiaExercise, PitchTrailPoint } from '../types';

export interface ReviewPhaseProps {
  exercise: MelodiaExercise;
  pitchTrail: PitchTrailPoint[];
  performanceBlob: Blob | null;
  isPathLastLesson: boolean;
  onPracticeAgain: () => void;
  onNextLesson: () => void;
}

export default function ReviewPhase({
  exercise,
  pitchTrail,
  performanceBlob,
  isPathLastLesson,
  onPracticeAgain,
  onNextLesson,
}: ReviewPhaseProps): ReactElement {
  const [layout, setLayout] = useState<MelodiaStaffLayout | null>(null);
  const [duetPlaying, setDuetPlaying] = useState(false);
  const duetRef = useRef<DuetPlaybackHandle | null>(null);

  const pitchedOnsets = useMemo(() => {
    const part = pickMelodyPart(exercise.score);
    return buildPitchedOnsets(exercise.score, part, 0);
  }, [exercise]);

  const stats = useMemo(
    () => pitchMatchStats(pitchTrail, pitchedOnsets),
    [pitchTrail, pitchedOnsets],
  );

  const tierLabel =
    stats.tier === 'gold' ? 'Gold' : stats.tier === 'silver' ? 'Silver' : 'Bronze';
  const pct = Math.round(stats.ratio * 100);

  const onPlayDuet = useCallback(async () => {
    if (!performanceBlob || duetPlaying) return;
    setDuetPlaying(true);
    const handle = await playDuetReview({
      userBlob: performanceBlob,
      score: exercise.score,
      part: pickMelodyPart(exercise.score),
      transposeSemitones: 0,
    });
    duetRef.current = handle;
    const ctx = new AudioContext();
    const buf = await ctx.decodeAudioData(await performanceBlob.arrayBuffer());
    void ctx.close();
    const ms = Math.min(120_000, Math.max(3000, (buf.duration + 1.5) * 1000));
    window.setTimeout(() => {
      handle.stop();
      duetRef.current = null;
      setDuetPlaying(false);
    }, ms);
  }, [exercise, performanceBlob, duetPlaying]);

  const stopDuet = useCallback(() => {
    duetRef.current?.stop();
    duetRef.current = null;
    setDuetPlaying(false);
  }, []);

  return (
    <Stack spacing={1.25}>
      <MelodiaStaff score={exercise.score} onLayout={setLayout}>
        {layout && <MelodiaHeatMap layout={layout} perNote={stats.perNote} />}
      </MelodiaStaff>

      <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700, m: 0 }}>
        Review — {tierLabel}
      </Typography>
      <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
        {stats.samplesUsed === 0
          ? 'No steady pitch samples were detected — try closer to the mic or a quieter room.'
          : `${stats.closeCount} of ${stats.samplesUsed} samples (${pct}%) were within one semitone of a written pitch. Pink wash highlights notes you drifted on.`}
      </Typography>

      <Stack direction="row" spacing={1} flexWrap="wrap">
        <Button
          variant="outlined"
          size="small"
          onClick={() => void onPlayDuet()}
          disabled={!performanceBlob || duetPlaying}
        >
          Listen back (duet)
        </Button>
        {duetPlaying && (
          <Button variant="text" size="small" onClick={stopDuet}>
            Stop playback
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" size="small" onClick={onPracticeAgain}>
          Practice again
        </Button>
        <Button
          variant="contained"
          color="secondary"
          size="small"
          onClick={onNextLesson}
          disabled={isPathLastLesson}
        >
          {isPathLastLesson ? 'End of path' : 'Next lesson'}
        </Button>
      </Stack>
    </Stack>
  );
}
