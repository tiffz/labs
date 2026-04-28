/**
 * Vocal duet playback: user recording on left, sine tones on right (parity with Melodia duet helper).
 */

import { midiToFrequency } from '../music/scoreTypes';

export interface GuideTone {
  midi: number;
  startSec: number;
  durSec: number;
}

export interface VocalDuetHandle {
  stop: () => void;
}

export async function playVocalWithSineGuide(opts: {
  userBlob: Blob;
  tones: GuideTone[];
}): Promise<VocalDuetHandle> {
  const ctx = new AudioContext();
  if (ctx.state === 'suspended') await ctx.resume();

  const arrayBuf = await opts.userBlob.arrayBuffer();
  const userBuffer = await ctx.decodeAudioData(arrayBuf.slice(0));

  const t0 = ctx.currentTime + 0.05;
  const userSrc = ctx.createBufferSource();
  userSrc.buffer = userBuffer;
  const userPan = ctx.createStereoPanner();
  userPan.pan.setValueAtTime(-0.85, t0);
  const userGain = ctx.createGain();
  userGain.gain.setValueAtTime(0.9, t0);
  userSrc.connect(userGain).connect(userPan).connect(ctx.destination);
  userSrc.start(t0);

  const oscNodes: OscillatorNode[] = [];

  for (const tone of opts.tones) {
    const start = t0 + tone.startSec;
    const end = start + Math.min(tone.durSec, 1.35);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(midiToFrequency(tone.midi), start);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.065, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    const pan = ctx.createStereoPanner();
    pan.pan.setValueAtTime(0.85, start);
    osc.connect(g).connect(pan).connect(ctx.destination);
    osc.start(start);
    osc.stop(end + 0.02);
    oscNodes.push(osc);
  }

  return {
    stop: () => {
      try {
        userSrc.stop();
      } catch {
        /* */
      }
      for (const o of oscNodes) {
        try {
          o.stop();
        } catch {
          /* */
        }
      }
      void ctx.close();
    },
  };
}
