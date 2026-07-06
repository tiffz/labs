import {
  defaultMetronomePreferences,
  type MetronomePreferences,
} from '../shared/audio/platform/metronome/preferences';

/** Latest advanced metronome prefs from Midi MetronomeRail (engine lives in store). */
let midiMetronomePreferences: MetronomePreferences = defaultMetronomePreferences();

export function setMidiMetronomePreferences(prefs: MetronomePreferences): void {
  midiMetronomePreferences = prefs;
}

export function getMidiMetronomePreferences(): MetronomePreferences {
  return midiMetronomePreferences;
}
