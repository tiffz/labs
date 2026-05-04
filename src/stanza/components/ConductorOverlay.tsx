import { useCallback, useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import type { SegmentStat } from '../db/stanzaDb';
import type { DerivedSegment } from '../utils/segments';
import type { GuidedRegimen } from '../utils/conductorRegimen';
import { regimenProfile } from '../utils/conductorRegimen';

type ConductorPhase = 'listen' | 'attempt' | 'review' | 'checkpoint';

interface TransportControls {
  play: () => void;
  pause: () => void;
  seek: (t: number) => void;
  setRate: (r: number) => void;
  getTime: () => number;
  getDuration: () => number;
}

export interface ConductorOverlayProps {
  open: boolean;
  onClose: () => void;
  regimen: GuidedRegimen;
  segment: DerivedSegment;
  segments: DerivedSegment[];
  segmentMs: Record<string, SegmentStat | undefined>;
  transport: TransportControls;
  onSaveTake: (blob: Blob, segmentId: string) => Promise<void>;
  onGuidedTakeCompleted: () => void;
  guidedTakesSinceCheckpoint: number;
  onSwitchSegment: (index: number) => void;
  onCheckpointResolved: () => void;
}

function pickUnderPracticedSegment(segments: DerivedSegment[], ms: Record<string, SegmentStat | undefined>): number {
  let bestIdx = 0;
  let best = Infinity;
  segments.forEach((s, i) => {
    const v = ms[s.id]?.totalMs ?? 0;
    if (v < best) {
      best = v;
      bestIdx = i;
    }
  });
  return bestIdx;
}

export default function ConductorOverlay({
  open,
  onClose,
  regimen,
  segment,
  segments,
  segmentMs,
  transport,
  onSaveTake,
  onGuidedTakeCompleted,
  guidedTakesSinceCheckpoint,
  onSwitchSegment,
  onCheckpointResolved,
}: ConductorOverlayProps) {
  const [phase, setPhase] = useState<ConductorPhase>('listen');
  const [reviewUrl, setReviewUrl] = useState<string | null>(null);
  const [suggestedIndex, setSuggestedIndex] = useState(0);
  const listenTimerRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const transportRef = useRef(transport);

  transportRef.current = transport;

  const profile = regimenProfile(regimen);

  const clearListenTimer = useCallback(() => {
    if (listenTimerRef.current !== null) {
      window.clearTimeout(listenTimerRef.current);
      listenTimerRef.current = null;
    }
  }, []);

  const startListenPhase = useCallback(() => {
    const tr = transportRef.current;
    clearListenTimer();
    tr.pause();
    tr.setRate(profile.listenRate);
    tr.seek(segment.start);
    tr.play();
    setPhase('listen');
    listenTimerRef.current = window.setTimeout(() => {
      tr.pause();
      setPhase('attempt');
      listenTimerRef.current = null;
    }, profile.listenSeconds * 1000);
  }, [clearListenTimer, profile.listenRate, profile.listenSeconds, segment.start]);

  useEffect(() => {
    if (!open) {
      clearListenTimer();
      transportRef.current.pause();
      setPhase('listen');
      setReviewUrl(null);
      return;
    }
    startListenPhase();
    return () => {
      clearListenTimer();
    };
  }, [open, segment.id, startListenPhase, clearListenTimer]);

  useEffect(() => {
    return () => {
      if (reviewUrl) URL.revokeObjectURL(reviewUrl);
    };
  }, [reviewUrl]);

  const stopRecording = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state === 'inactive') return;
    rec.stop();
  }, []);

  const startRecording = useCallback(async () => {
    const tr = transportRef.current;
    tr.setRate(profile.attemptRate);
    tr.seek(segment.start);
    tr.play();
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const rec = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
        tr.pause();
        const blob = new Blob(chunksRef.current, { type: mime });
        chunksRef.current = [];
        await onSaveTake(blob, segment.id);
        onGuidedTakeCompleted();
        const url = URL.createObjectURL(blob);
        setReviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        setPhase('review');
      };
      rec.start();
    } catch (e) {
      console.error('Stanza: microphone access failed', e);
    }
  }, [onGuidedTakeCompleted, onSaveTake, profile.attemptRate, segment.id, segment.start]);

  const handleClose = () => {
    clearListenTimer();
    transportRef.current.pause();
    stopRecording();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setReviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    onClose();
  };

  if (!open) return null;

  return (
    <Box
      className="stanza-conductor-overlay"
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 1300,
        bgcolor: 'rgba(15, 23, 42, 0.94)',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        p: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" component="h2">
          The Conductor · {regimen}
        </Typography>
        <IconButton aria-label="Exit guided mode" onClick={handleClose} sx={{ color: 'inherit' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Typography variant="body2" sx={{ opacity: 0.85, mb: 2 }}>
        Section: {segment.label} ({segment.start.toFixed(1)}s – {segment.end.toFixed(1)}s)
      </Typography>

      {phase === 'listen' && (
        <Box>
          <Typography variant="h6">Listen</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Follow the phrase at {Math.round(profile.listenRate * 100)}% speed. Attempt starts automatically afterward.
          </Typography>
        </Box>
      )}

      {phase === 'attempt' && (
        <Box>
          <Typography variant="h6">Attempt</Typography>
          <Typography variant="body2" sx={{ mt: 1, mb: 2 }}>
            Record a take for this section. Playback runs at {Math.round(profile.attemptRate * 100)}% speed.
          </Typography>
          <Button variant="contained" color="secondary" onClick={startRecording} aria-label="Start recording take">
            Start recording
          </Button>
          <Button sx={{ ml: 1 }} variant="outlined" onClick={stopRecording} aria-label="Stop recording take">
            Stop and save
          </Button>
        </Box>
      )}

      {phase === 'review' && reviewUrl && (
        <Box>
          <Typography variant="h6">Review</Typography>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption -- practice take; no caption track */}
          <audio controls src={reviewUrl} style={{ width: '100%', marginTop: 12 }} aria-label="Recorded take playback" />
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              onClick={() => {
                if (guidedTakesSinceCheckpoint >= 5) {
                  setSuggestedIndex(pickUnderPracticedSegment(segments, segmentMs));
                  setPhase('checkpoint');
                } else {
                  startListenPhase();
                }
              }}
            >
              Next round
            </Button>
          </Box>
        </Box>
      )}

      {phase === 'checkpoint' && (
        <Box>
          <Typography variant="h6">Checkpoint</Typography>
          <Typography variant="body2" sx={{ mt: 1, mb: 2 }}>
            You have logged five guided takes. Consider switching to a cooler section on the heatmap:{' '}
            <strong>{segments[suggestedIndex]?.label}</strong>
          </Typography>
          <Button
            variant="contained"
            onClick={() => {
              onCheckpointResolved();
              onSwitchSegment(suggestedIndex);
              startListenPhase();
            }}
          >
            Switch to suggested section
          </Button>
          <Button
            sx={{ ml: 1 }}
            variant="outlined"
            onClick={() => {
              onCheckpointResolved();
              startListenPhase();
            }}
          >
            Stay on this section
          </Button>
        </Box>
      )}

      <Box sx={{ mt: 'auto', pt: 2 }}>
        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          Phase: {phase} · Guided takes this block: {guidedTakesSinceCheckpoint} / 5
        </Typography>
      </Box>
    </Box>
  );
}
