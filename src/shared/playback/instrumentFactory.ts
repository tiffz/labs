import {
  PianoSynthesizer,
  SampledPiano,
  SimpleSynthesizer,
  type Instrument,
  type WaveformType,
} from './instruments';

export type SharedSoundType =
  | 'piano'
  | 'piano-sampled'
  | 'sine'
  | 'square'
  | 'sawtooth'
  | 'triangle';

const waveformMap: Record<string, WaveformType> = {
  sine: 'sine',
  square: 'square',
  sawtooth: 'sawtooth',
  triangle: 'triangle',
};

export interface InstrumentFactoryOptions {
  soundType: SharedSoundType | string;
  context: AudioContext;
  output: AudioNode;
  sampledPiano?: SampledPiano | null;
  connectOutput?: boolean;
}

export function createInstrumentForSoundType({
  soundType,
  context,
  output,
  sampledPiano,
  connectOutput = true,
}: InstrumentFactoryOptions): Instrument {
  if (soundType === 'piano-sampled') {
    const inst = sampledPiano ?? new SampledPiano(context);
    if (connectOutput) inst.connect(output);
    return inst;
  }
  if (soundType === 'piano') {
    const inst = new PianoSynthesizer(context);
    if (connectOutput) inst.connect(output);
    return inst;
  }
  const inst = new SimpleSynthesizer(context, waveformMap[soundType] ?? 'sine');
  if (connectOutput) inst.connect(output);
  return inst;
}

