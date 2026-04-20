/**
 * Persists the user's audio-input choices across reloads so they don't have
 * to re-enable the microphone or re-hide a MIDI device every visit.
 *
 * Storage is intentionally small and scoped: we remember "user wants mic on"
 * rather than the permission itself (the browser owns permissions). On boot
 * we only auto-start the mic when `navigator.permissions` reports that the
 * microphone is already `granted`, so we never surprise the user with a
 * prompt.
 */

const STORAGE_KEY = 'scales-audio-prefs';

export interface AudioPrefs {
  /** Whether the user had the microphone enabled when they last left. */
  microphoneRequested: boolean;
  /** IDs of MIDI devices the user has explicitly disabled. */
  disabledMidiDeviceIds: string[];
}

const DEFAULT_PREFS: AudioPrefs = {
  microphoneRequested: false,
  disabledMidiDeviceIds: [],
};

export function loadAudioPrefs(): AudioPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<AudioPrefs>;
    return {
      microphoneRequested: Boolean(parsed.microphoneRequested),
      disabledMidiDeviceIds: Array.isArray(parsed.disabledMidiDeviceIds)
        ? parsed.disabledMidiDeviceIds.filter((v): v is string => typeof v === 'string')
        : [],
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function saveAudioPrefs(prefs: AudioPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* storage full / privacy mode — silently ignore */
  }
}

export function updateAudioPrefs(patch: Partial<AudioPrefs>): void {
  saveAudioPrefs({ ...loadAudioPrefs(), ...patch });
}

/**
 * Returns true when the browser reports microphone access is already granted
 * (so we can auto-start without prompting). Returns false when the API is
 * unavailable or the permission state is `prompt` / `denied`.
 */
export async function isMicrophonePermissionGranted(): Promise<boolean> {
  // `navigator.permissions` is undefined in some WebViews; the 'microphone'
  // descriptor is also missing from older Permissions typings.
  const permissions = (navigator as Navigator).permissions;
  if (!permissions || typeof permissions.query !== 'function') return false;
  try {
    const status = await permissions.query({
      name: 'microphone' as PermissionName,
    });
    return status.state === 'granted';
  } catch {
    return false;
  }
}
