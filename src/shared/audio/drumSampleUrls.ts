// NOTE:
// Keep shared playback using the recorded drums/metronome source files.
// We intentionally resolve these with static URLs so the same audio set is
// used by shared playback paths and app-local export paths.
//
// dum/tak/ka/slap are teacher-sourced recordings — do not remaster in place
// (see drumSampleIntegrity.test.ts). Thin laptop speakers may distort dum;
// prefer headphones on those machines rather than altering the take.
export const CLICK_SAMPLE_URL = new URL('../../drums/assets/sounds/click.mp3', import.meta.url).href;

export const DRUM_SAMPLE_URLS: Record<'dum' | 'tak' | 'ka' | 'slap', string> = {
  dum: new URL('../../drums/assets/sounds/dum.wav', import.meta.url).href,
  tak: new URL('../../drums/assets/sounds/tak.wav', import.meta.url).href,
  ka: new URL('../../drums/assets/sounds/ka.wav', import.meta.url).href,
  slap: new URL('../../drums/assets/sounds/slap2.wav', import.meta.url).href,
};
