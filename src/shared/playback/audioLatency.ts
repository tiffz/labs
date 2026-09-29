/**
 * What the audio path costs, in milliseconds, end to end.
 *
 * Every app here that plays a note in response to a key press or a MIDI
 * message has the same question behind it — "why is this late?" — and the
 * answer is usually not in the app. A Web Audio note is delayed by two things
 * the page does not control:
 *
 *   `baseLatency`   the render quantum plus whatever the browser buffers
 *                   before handing audio to the OS. Typically 5-12ms.
 *   `outputLatency` the OS and the device. Wired output is a few ms.
 *                   **Bluetooth is commonly 150-300ms**, which no amount of
 *                   work inside the app can recover.
 *
 * Reporting them separately is the point: it tells you whether a latency
 * complaint is a bug you can fix or a device the player should swap. A number
 * the app computes about itself is worth more than a guess, and this is the
 * one measurement that distinguishes the two causes.
 *
 * `outputLatency` is not implemented everywhere (Safari, and any headless
 * browser with no audio device, report 0 or omit it). Zero is therefore
 * "unknown", not "instant" — so it is reported as `null` rather than as a
 * number a caller would add to a total and believe.
 */
export interface AudioLatency {
  /** Browser-side buffering. `null` when the browser does not report it. */
  baseMs: number | null;
  /** Device and OS. `null` when unknown — NOT zero. */
  outputMs: number | null;
  /** The two together, or `null` if neither is known. */
  totalMs: number | null;
}

const toMs = (seconds: number | undefined): number | null =>
  typeof seconds === 'number' && seconds > 0 ? Math.round(seconds * 10000) / 10 : null;

export function measureAudioLatency(context: AudioContext | null | undefined): AudioLatency {
  if (!context || context.state === 'closed') return { baseMs: null, outputMs: null, totalMs: null };
  const baseMs = toMs(context.baseLatency);
  // Not in every browser's AudioContext, so read it defensively rather than
  // trusting the type.
  const outputMs = toMs((context as AudioContext & { outputLatency?: number }).outputLatency);
  const totalMs =
    baseMs === null && outputMs === null
      ? null
      : Math.round(((baseMs ?? 0) + (outputMs ?? 0)) * 10) / 10;
  return { baseMs, outputMs, totalMs };
}

/**
 * One line a player can act on.
 *
 * The thresholds are about playing, not about perception in general: under
 * ~10ms is indistinguishable from an acoustic instrument, ~20ms is what a
 * typical DAW round trip feels like, and past ~50ms a drummer will hear
 * themselves flam against their own hands.
 */
export function describeAudioLatency(latency: AudioLatency): string {
  if (latency.totalMs === null) return 'This browser does not report audio latency.';
  const total = latency.totalMs;
  if (total >= 80) {
    return `Audio is ${Math.round(total)}ms behind your keys. That is usually a Bluetooth speaker or headphones. Wired output is far quicker.`;
  }
  if (total >= 30) {
    return `Audio is ${Math.round(total)}ms behind your keys. Playable, but you may hear it on fast passages.`;
  }
  return `Audio is ${Math.round(total)}ms behind your keys.`;
}
