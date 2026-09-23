import { describe, expect, it } from 'vitest';

import { defaultSpellingFor, referenceStaffNotes, spellMidiNote } from './maqamSpelling';
import { MAQAM_PRESETS, MAQAM_PRESETS_BY_ID, deriveDetuneMatrix } from '../data/maqamPresets';
import { detuneForMidiNote } from '../audio/maqamSynth';
import { pitchClassOf, spellingLabel } from './maqamAccidentals';

const rast = MAQAM_PRESETS_BY_ID.rast_c;
const hijaz = MAQAM_PRESETS_BY_ID.hijaz_d;
const bayati = MAQAM_PRESETS_BY_ID.bayati_d;

const label = (note: { letter: string; accidental: string }) =>
  spellingLabel(note as Parameters<typeof spellingLabel>[0]);

describe('spellMidiNote', () => {
  it('writes a key the maqam names the way the maqam names it', () => {
    // E4 in Rast is the half-flat third, not an E natural.
    expect(label(spellMidiNote(64, -50, rast))).toBe('E½♭');
  });

  it('writes the same key plainly in a maqam with no microtones', () => {
    // E-flat is Hijaz's second; MIDI 63 is that key.
    expect(label(spellMidiNote(63, 0, hijaz))).toBe('E♭');
  });

  it('keeps Bayati’s B-flat a plain flat, not a microtone', () => {
    expect(label(spellMidiNote(70, 0, bayati))).toBe('B♭');
  });

  it('carries the octave through', () => {
    expect(spellMidiNote(60, 0, rast).octave).toBe(4);
    expect(spellMidiNote(72, 0, rast).octave).toBe(5);
    expect(spellMidiNote(48, 0, rast).octave).toBe(3);
  });

  it('falls back to a flat spelling for a black key outside the maqam', () => {
    // F# is not in Rast.
    expect(label(spellMidiNote(66, 0, rast))).toBe('G♭');
  });

  it('falls back to a natural for a white key outside the maqam', () => {
    // Every white key is in Rast, so use Hijaz, which omits C#... and E natural.
    expect(label(spellMidiNote(64, 0, hijaz))).toBe('E');
  });

  it('bends a fallback spelling when the user has retuned that key by hand', () => {
    // A is in Rast but unbent; bending it by hand must still write a microtone.
    const bentA = spellMidiNote(69, -50, undefined);
    expect(label(bentA)).toBe('A½♭');
  });

  it('writes a hand-bent black key as a three-quarter-flat', () => {
    expect(label(spellMidiNote(70, -50, undefined))).toBe('B¾♭');
  });

  it('works with no maqam loaded at all', () => {
    expect(label(spellMidiNote(60, 0, undefined))).toBe('C');
    expect(label(spellMidiNote(61, 0, undefined))).toBe('D♭');
  });

  it('rounds a fractional MIDI note rather than producing a broken octave', () => {
    expect(spellMidiNote(60.4, 0, rast).octave).toBe(4);
    expect(label(spellMidiNote(60.4, 0, rast))).toBe('C');
  });

  /**
   * The written note and the key it is played on must never disagree — that is
   * the failure the accidental table exists to prevent, checked here end to end
   * through the spelling path the live staff actually uses.
   */
  it.each(MAQAM_PRESETS.map((p) => [p.id, p] as const))(
    '%s spells every key onto the key it is played on',
    (_id, preset) => {
      const { matrix } = deriveDetuneMatrix(preset.scaleDegrees);
      for (let midi = 60; midi < 72; midi += 1) {
        const cents = detuneForMidiNote(midi, matrix);
        const spelled = spellMidiNote(midi, cents, preset);
        expect(pitchClassOf(spelled), `midi ${midi}`).toBe(midi % 12);
      }
    },
  );
});

describe('defaultSpellingFor', () => {
  it('names the five black keys as flats', () => {
    expect([1, 3, 6, 8, 10].map((pc) => label(defaultSpellingFor(pc)))).toEqual([
      'D♭',
      'E♭',
      'G♭',
      'A♭',
      'B♭',
    ]);
  });

  it('names the seven white keys as naturals', () => {
    expect([0, 2, 4, 5, 7, 9, 11].map((pc) => label(defaultSpellingFor(pc)))).toEqual([
      'C',
      'D',
      'E',
      'F',
      'G',
      'A',
      'B',
    ]);
  });

  it('lands each default spelling on its own pitch class', () => {
    for (let pc = 0; pc < 12; pc += 1) {
      expect(pitchClassOf(defaultSpellingFor(pc)), `pc ${pc}`).toBe(pc);
    }
  });

  it('wraps out-of-range input', () => {
    expect(defaultSpellingFor(12)).toEqual(defaultSpellingFor(0));
    expect(defaultSpellingFor(-1)).toEqual(defaultSpellingFor(11));
  });
});

describe('referenceStaffNotes', () => {
  it('writes Rast from C4 up to C5', () => {
    const notes = referenceStaffNotes(rast, 4);
    expect(notes).toHaveLength(8);
    expect(notes[0]).toEqual({ letter: 'C', accidental: 'n', octave: 4 });
    expect(notes[7]).toEqual({ letter: 'C', accidental: 'n', octave: 5 });
  });

  it('keeps the half-flats', () => {
    expect(referenceStaffNotes(rast, 4).map(label).join(' ')).toBe(
      'C D E½♭ F G A B½♭ C',
    );
  });

  it('is empty with no maqam', () => {
    expect(referenceStaffNotes(undefined, 4)).toEqual([]);
  });
});
