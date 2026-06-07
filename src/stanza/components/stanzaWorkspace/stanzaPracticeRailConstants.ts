import type { TimeSignature } from '../../../shared/rhythm/types';
import { getRhythmTemplatePresets } from '../../../shared/rhythm/presetDatabase';
import { getInlineDrumUxProps } from '../../../shared/components/music/inlineDrumUxDefaults';

/** 4/4 default for the shared drum panel. Stanza does not yet track per-song time signature. */
export const STANZA_DRUMS_DEFAULT_TIME_SIGNATURE: TimeSignature = { numerator: 4, denominator: 4 };

/** Fallback BPM when the metronome isn't calibrated yet. keeps the drum preview UI usable. */
export const STANZA_DRUMS_DEFAULT_BPM = 120;

/** Notation render footprint inside the practice rail. compact so Key shift stays in view. */
export const STANZA_DRUMS_NOTATION_WIDTH = 236;

/** Minimum host height; {@link computeMiniNotationLayout} may grow the SVG to fit the staff. */
export const STANZA_DRUMS_NOTATION_HEIGHT = 68;

/** Stanza-tinted notation palette so the staff matches `--stanza-ink` ink and the active note
 *  flashes the rose accent (`--stanza-rose`) instead of Beat Finder's green. */
export const STANZA_DRUMS_NOTATION_STYLE = {
  inkColor: '#2a2622',
  highlightColor: '#e848a0',
  backgroundColor: 'transparent',
} as const;

/** Fallback Darbuka notation when the song has no saved pattern (first 4/4 preset). */
export const STANZA_DRUMS_DEFAULT_PATTERN =
  getRhythmTemplatePresets(STANZA_DRUMS_DEFAULT_TIME_SIGNATURE)[0]?.notation ?? 'D---D---D---D---';

/** Stanza drum panel — {@link getInlineDrumUxProps}('practice-rail'). */
export const STANZA_DRUM_PANEL_UX = getInlineDrumUxProps('practice-rail');
