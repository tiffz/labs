import { useEffect, useRef } from 'react';

function playClick(ctx: AudioContext): void {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.value = 880;
  g.gain.value = 0.0001;
  o.connect(g);
  g.connect(ctx.destination);
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  o.start(t);
  o.stop(t + 0.07);
}

/**
 * Emits metronome clicks on the media timeline using anchor + BPM.
 * When disabled or missing inputs, cleans up.
 */
export function useMetronomeSync(
  enabled: boolean,
  bpm: number | undefined,
  anchorMediaTime: number | undefined,
  getMediaTime: () => number,
  isPlaying: boolean,
  audioEnabled: boolean,
): void {
  const lastBeatRef = useRef<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    lastBeatRef.current = null;
  }, [anchorMediaTime, bpm, enabled]);

  useEffect(() => {
    if (!enabled || !bpm || bpm <= 0 || anchorMediaTime === undefined || !isPlaying) {
      return;
    }
    const period = 60 / bpm;
    let raf = 0;

    const tick = () => {
      const t = getMediaTime();
      const beat = Math.floor((t - anchorMediaTime) / period + 1e-9);
      if (lastBeatRef.current === null) {
        lastBeatRef.current = beat;
      } else if (beat > lastBeatRef.current) {
        lastBeatRef.current = beat;
        if (audioEnabled) {
          const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (Ctx) {
            if (!ctxRef.current || ctxRef.current.state === 'closed') {
              ctxRef.current = new Ctx();
            }
            const ctx = ctxRef.current;
            if (ctx.state === 'suspended') {
              void ctx.resume();
            }
            playClick(ctx);
          }
        }
      }
      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [enabled, bpm, anchorMediaTime, isPlaying, audioEnabled, getMediaTime]);
}
