/**
 * The instruments this app can actually be.
 *
 * All three come out of the same Karplus-Strong string model — excite a delay
 * line, feed it back through an averaging filter — because that model is
 * parameterised by FREQUENCY, so a 350-cent third is rendered at 350 cents
 * rather than resampled towards it. That is the whole reason this app
 * synthesises instead of shipping samples, and it is why the list below is
 * strings rather than a general orchestra.
 *
 * **On "can we have a piano".** A sampled piano cannot play this music: it is
 * fixed-pitch percussion, so a pitch-shifted piano note reads to the ear as
 * out of tune rather than as an interval, which is the opposite of the lesson.
 * But a piano IS a struck string, and a struck string is this model with a
 * harder excitation and a faster decay — which is exactly what a santur is.
 * So the honest version of "piano" is here, under the name of the instrument
 * that actually plays maqamat.
 *
 * What is NOT reachable this way: anything sustained and bowed or blown — ney,
 * kamancheh, voice. Those need a different generator (a filtered oscillator
 * with a breath envelope), not a different set of numbers.
 */

export interface MaqamVoice {
  id: string;
  label: string;
  /** One line, shown beside Play. Says what it is, not how it was made. */
  description: string;
  /** Seconds of tail rendered per note. */
  seconds: number;
  /** Feedback loss per round trip, 0..1. Higher sustains longer. */
  sustain: number;
  /** 0..1, higher is darker. A one-pole lowpass on the rendered output. */
  tone: number;
  /**
   * Whether the string is doubled, as an oud's and a qanun's are — each
   * "string" is a course of two, tuned a few cents apart. This is the single
   * biggest richness win available here, and it is what those instruments
   * actually do rather than a chorus bolted on. A santur's courses are struck
   * together, so it keeps them; a lone string does not.
   */
  course: boolean;
}

export const MAQAM_VOICES: MaqamVoice[] = [
  {
    id: 'oud',
    label: 'Oud',
    description: 'Gut strings, woody and warm. The default.',
    seconds: 2.6,
    sustain: 0.9965,
    tone: 0.62,
    course: true,
  },
  {
    id: 'qanun',
    label: 'Qanun',
    description: 'Plucked and bright, with a fast bloom.',
    seconds: 2.2,
    sustain: 0.995,
    tone: 0.3,
    course: true,
  },
  {
    id: 'santur',
    label: 'Santur',
    description: 'Struck rather than plucked — the family a piano belongs to.',
    seconds: 1.8,
    sustain: 0.991,
    tone: 0.2,
    course: true,
  },
];

export const DEFAULT_MAQAM_VOICE_ID = 'oud';

/** `undefined` for an unknown id, so the caller decides, not this. */
export function findMaqamVoice(id: string | null | undefined): MaqamVoice | undefined {
  return id ? MAQAM_VOICES.find((voice) => voice.id === id) : undefined;
}
