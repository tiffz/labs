import {
  MAQAM_ACCIDENTALS,
  microtonalCentsOf,
  midiNoteOf,
  pitchClassOf,
  spellingLabel,
  type MaqamNoteSpelling,
} from '../notation/maqamAccidentals';

/**
 * A scale degree as written: a spelling plus how many octaves above the maqam's
 * written tonic it sits. The octave lets a maqam close on its upper tonic.
 */
export interface MaqamScaleDegree extends MaqamNoteSpelling {
  octaveOffset: number;
}

/**
 * A jins — the three-, four-, or five-note building block a maqam is assembled
 * from. `intervalsInCents` is authored independently of `scaleDegrees`, and
 * `maqamPresets.test.ts` checks the two agree; a typo in either is caught by
 * the disagreement rather than by someone noticing the app sounds wrong.
 */
/**
 * Every musical claim in this file is checked against maqamworld.com, and says
 * where. The app credits it on screen; see `MaqamCredit`.
 *
 * This is not politeness. The first version of this data was wrong in a way
 * nobody could audit — pentachords stored as tetrachords — and the reason it
 * survived review is that there was nowhere to go and check.
 */
const MAQAM_WORLD_JINS = 'https://www.maqamworld.com/en/jins/';
const MAQAM_WORLD_MAQAM = 'https://www.maqamworld.com/en/maqam/';

export interface Jins {
  id: string;
  name: string;
  /** Where in the maqam this jins is rooted, as written. */
  root: MaqamNoteSpelling;
  /** Cents above the root, ascending, starting at 0. */
  intervalsInCents: number[];
  /**
   * Where this cell's size and intervals were checked. Required, because the
   * app teaches theory off a screen that looks authoritative and the first
   * version of this data was wrong in a way nobody could audit: every root
   * jins that is a 5-note pentachord was authored as a 4-note tetrachord.
   */
  source: string;
}

export interface MaqamPreset {
  id: string;
  /** Short name used in the picker, e.g. "Rast on C". */
  name: string;
  /** Transliterated Arabic name, e.g. "Maqam Rast". */
  transliteration: string;
  /**
   * The name in Arabic script.
   *
   * Not decoration: these are the names the music is actually taught under, and
   * showing them alongside the transliteration is the difference between an app
   * about a tradition and an app that has borrowed from one.
   */
  arabicName: string;
  /** The tonic, as written. */
  tonic: MaqamNoteSpelling;
  description: string;
  /**
   * This maqam's page on maqamworld.com, shown in the app as a credit and a
   * way for a reader to check anything the app claims.
   */
  source: string;
  /**
   * The ascending scale. The detune matrix and the keyboard colouring are both
   * DERIVED from this — it is the one place a maqam's pitches are written down.
   *
   * Ends on the upper tonic when `repeatsAtOctave`; otherwise it stops at the
   * seventh degree.
   */
  scaleDegrees: MaqamScaleDegree[];
  /**
   * Whether the maqam returns to its tonic an octave up.
   *
   * True for eight of the nine families. **Saba does not** — its upper tonic is
   * flattened, so the scale never closes at 1200 cents. An earlier version of
   * this module asserted every maqam spanned exactly an octave, which is a
   * Western assumption, not a fact about maqamat; Saba is the counterexample
   * that made it visible.
   */
  repeatsAtOctave: boolean;
  primaryAjnas: Jins[];
}

/** Pitch-class names in the order the 12 detune slots appear, C first. */
export const PITCH_CLASS_NAMES = [
  'C',
  'C♯',
  'D',
  'D♯',
  'E',
  'F',
  'F♯',
  'G',
  'G♯',
  'A',
  'A♯',
  'B',
] as const;

/** Cents by pitch class, 0..11, applied on top of 12-TET. */
export type DetuneMatrix = number[];

export const NEUTRAL_DETUNE_MATRIX: DetuneMatrix = Object.freeze(
  new Array<number>(12).fill(0),
) as DetuneMatrix;

/**
 * Two scale degrees that want the same piano key bent by different amounts. A
 * 12-key board physically cannot play both, so this is surfaced rather than
 * resolved by last-write-wins — a silently dropped degree is a maqam that
 * sounds wrong with no indication why.
 */
export interface DetuneConflict {
  pitchClass: number;
  cents: number[];
}

export interface DerivedDetune {
  matrix: DetuneMatrix;
  conflicts: DetuneConflict[];
}

/**
 * Build the 12-slot retuning a maqam needs from the notes it is written with.
 *
 * Authoring the matrix separately from the scale — as the original spec did —
 * makes the same fact true in two places, and nothing keeps them true together.
 * Deriving it means a maqam's pitches are edited once.
 */
export function deriveDetuneMatrix(degrees: MaqamScaleDegree[]): DerivedDetune {
  const centsByPitchClass = new Map<number, Set<number>>();
  for (const degree of degrees) {
    const pc = pitchClassOf(degree);
    const cents = microtonalCentsOf(degree);
    const seen = centsByPitchClass.get(pc) ?? new Set<number>();
    seen.add(cents);
    centsByPitchClass.set(pc, seen);
  }

  const matrix = new Array<number>(12).fill(0);
  const conflicts: DetuneConflict[] = [];
  for (const [pitchClass, centsSet] of centsByPitchClass) {
    const cents = [...centsSet].sort((a, b) => a - b);
    // Pick the bent reading so a conflicted key at least plays the microtone
    // the maqam is named for; the conflict is reported either way.
    matrix[pitchClass] = cents.find((c) => c !== 0) ?? 0;
    if (cents.length > 1) conflicts.push({ pitchClass, cents });
  }
  return { matrix, conflicts };
}

/** Pitch classes a maqam uses at all, bent or not — the "in the scale" set. */
export function scalePitchClasses(degrees: MaqamScaleDegree[]): Set<number> {
  return new Set(degrees.map((degree) => pitchClassOf(degree)));
}

/**
 * Absolute cents above MIDI 0 for a degree of a maqam written from
 * `tonicOctave`. Used to compare a jins against the scale it came from.
 */
export function degreeAbsoluteCents(degree: MaqamScaleDegree, tonicOctave: number): number {
  const midi = midiNoteOf(degree, tonicOctave + degree.octaveOffset);
  return midi * 100 + microtonalCentsOf(degree);
}

/**
 * The family a maqam belongs to, derived from its root jins.
 *
 * maqamworld.com: "Maqamat are classified into families based on sharing the
 * same first (root) jins. The root jins plays the largest role in defining the
 * maqam's character."
 *
 * So the family is not a field to author and keep in step. It is a reading of
 * the root jins, which means a new maqam files itself, and a family can never
 * disagree with the cell it is named for. Given "Jins Rast on C" this is
 * "Rast"; given "Jins Upper Rast on G" it would be "Upper Rast", which is why
 * only the ROOT jins is consulted.
 */
export function maqamFamily(preset: MaqamPreset): string {
  const root = preset.primaryAjnas[0];
  if (!root) return 'Other';
  // "Jins Nahawand on C" -> "Nahawand".
  const withoutPrefix = root.name.replace(/^Jins\s+/, '');
  const withoutRoot = withoutPrefix.replace(/\s+on\s+.+$/, '');
  return withoutRoot.trim() || 'Other';
}

/** Every family present, and the maqamat in each, for a two-tier picker. */
export function maqamatByFamily(
  presets: readonly MaqamPreset[] = MAQAM_PRESETS,
): { family: string; maqamat: MaqamPreset[] }[] {
  const families = new Map<string, MaqamPreset[]>();
  for (const preset of presets) {
    const family = maqamFamily(preset);
    const members = families.get(family) ?? [];
    members.push(preset);
    families.set(family, members);
  }
  return [...families.entries()]
    .map(([family, maqamat]) => ({ family, maqamat }))
    .sort((a, b) => a.family.localeCompare(b.family));
}

/** Scale index a spelling sits at, or -1. */
function degreeIndexOf(preset: MaqamPreset, spelling: MaqamNoteSpelling): number {
  return preset.scaleDegrees.findIndex(
    (degree) => degree.letter === spelling.letter && degree.accidental === spelling.accidental,
  );
}

/**
 * How a maqam's two cells meet.
 *
 * Derived, never asserted. The panel used to print "Joined on G, where the
 * first cell ends and the second begins" for every maqam, directly under the
 * intervals that disprove it: Rast's lower jins is 0-200-350-500, which is
 * C D E½♭ F, so it ends on F and the upper jins starts a whole tone above on
 * G. Deriving it matters more than the answer: when the cell sizes were later
 * corrected against maqamworld.com, every maqam here turned out to be
 * conjunct, and the panel, the ghammaz and the melody patterns all corrected
 * themselves with no prose to chase.
 *
 * Separately, the ghammaz here is read from the upper jins's root rather than
 * guessed from the lower jins's note count. The guess was right only for the
 * conjunct maqamat, so in Rast the "jins by jins" pattern rested twice on F,
 * a note neither cell is rooted on.
 */
export interface AjnasJoin {
  /** Scale index the lower cell ends on. */
  lowerTopIndex: number;
  /** Scale index the upper cell is rooted on. This is the ghammaz. */
  ghammazIndex: number;
  /** True when one degree belongs to both cells. */
  shared: boolean;
}

/** `undefined` for a maqam with a single settled jins, which has no join. */
export function ajnasJoin(preset: MaqamPreset): AjnasJoin | undefined {
  const [lower, upper] = preset.primaryAjnas;
  if (!lower || !upper) return undefined;

  const lowerRootIndex = degreeIndexOf(preset, lower.root);
  const ghammazIndex = degreeIndexOf(preset, upper.root);
  if (lowerRootIndex < 0 || ghammazIndex < 0) return undefined;

  const lowerTopIndex = lowerRootIndex + lower.intervalsInCents.length - 1;
  return { lowerTopIndex, ghammazIndex, shared: lowerTopIndex === ghammazIndex };
}

/**
 * The degree a maqam's phrases rest on, as a scale index.
 *
 * For a two-jins maqam that is the upper cell's root. Saba has one settled
 * jins, so its phrases rest on the top of that cell instead.
 */
export function ghammazDegreeIndex(preset: MaqamPreset): number {
  const join = ajnasJoin(preset);
  if (join) return join.ghammazIndex;
  const cellLength = preset.primaryAjnas[0]?.intervalsInCents.length ?? 4;
  const lastIndex = preset.scaleDegrees.length - 1;
  return Math.min(Math.max(cellLength - 1, 1), lastIndex);
}

/** How a maqam's written spelling reads back, e.g. "C D E½♭ F G A B½♭ C". */
export function scaleDegreeLabels(degrees: MaqamScaleDegree[]): string[] {
  return degrees.map((degree) => spellingLabel(degree));
}

/** True when any degree of the maqam leaves 12-TET. */
export function hasMicrotones(degrees: MaqamScaleDegree[]): boolean {
  return degrees.some((degree) => MAQAM_ACCIDENTALS[degree.accidental].isMicrotonal);
}

const n = (letter: MaqamScaleDegree['letter'], octaveOffset = 0): MaqamScaleDegree => ({
  letter,
  accidental: 'n',
  octaveOffset,
});
const halfFlat = (
  letter: MaqamScaleDegree['letter'],
  octaveOffset = 0,
): MaqamScaleDegree => ({ letter, accidental: 'd', octaveOffset });
const flat = (letter: MaqamScaleDegree['letter'], octaveOffset = 0): MaqamScaleDegree => ({
  letter,
  accidental: 'b',
  octaveOffset,
});
const sharp = (letter: MaqamScaleDegree['letter'], octaveOffset = 0): MaqamScaleDegree => ({
  letter,
  accidental: '#',
  octaveOffset,
});

/**
 * The nine maqam families.
 *
 * Every other named maqam in common use is a member of one of these, so this is
 * the set that teaches the system rather than a catalogue.
 *
 * Each is authored twice over — once as written `scaleDegrees`, once as
 * `primaryAjnas` intervals — and `maqamPresets.test.ts` requires the two to
 * agree. That cross-check is what caught the original spec rooting Jins
 * Nahawand on A in Bayati, where the B-flat makes those intervals impossible.
 *
 * Four families use microtones (Rast, Bayati, Sikah, Saba); five sit entirely
 * in 12-TET (Ajam, Hijaz, Kurd, Nahawand, Nikriz). That spread is deliberate —
 * it shows that "maqam" is not a synonym for "quarter-tone".
 */
export const MAQAM_PRESETS: MaqamPreset[] = [
  {
    id: 'rast_c',
    name: 'Rast on C',
    transliteration: 'Maqam Rast',
    source: `${MAQAM_WORLD_MAQAM}rast.php`,
    arabicName: 'راست',
    tonic: { letter: 'C', accidental: 'n' },
    description:
      'The foundational maqam, and the one others are measured against. Its third and seventh sit half-flat, between the major and minor you already know.',
    repeatsAtOctave: true,
    scaleDegrees: [n('C'), n('D'), halfFlat('E'), n('F'), n('G'), n('A'), halfFlat('B'), n('C', 1)],
    primaryAjnas: [
      {
        id: 'rast_c__jins_rast_c',
        name: 'Jins Rast on C',
        root: { letter: 'C', accidental: 'n' },
        // "Jins Rast is a widely popular 5-note jins ... notated here with its
        // tonic on C and its ghammaz on G." Authored here as a tetrachord
        // ending on F, which made Rast read as disjunct when it is not.
        intervalsInCents: [0, 200, 350, 500, 700],
        source: `${MAQAM_WORLD_JINS}rast.php`,
      },
      {
        id: 'rast_c__jins_upper_rast_g',
        // Not "Jins Rast on G": Maqam Rast's scale "starts with the root Jins
        // Rast on the tonic, followed on the 5th degree by either Jins Upper
        // Rast (with its tonic up on the 8th degree) or Jins Nahawand".
        name: 'Jins Upper Rast on G',
        root: { letter: 'G', accidental: 'n' },
        intervalsInCents: [0, 200, 350, 500],
        source: `${MAQAM_WORLD_JINS}upper-rast.php`,
      },
    ],
  },
  {
    id: 'bayati_d',
    name: 'Bayati on D',
    transliteration: 'Maqam Bayati',
    source: `${MAQAM_WORLD_MAQAM}bayati.php`,
    arabicName: 'بياتي',
    tonic: { letter: 'D', accidental: 'n' },
    description:
      'Everywhere in Arabic song. The half-flat second gives it a pull toward the tonic that no Western mode has.',
    repeatsAtOctave: true,
    scaleDegrees: [n('D'), halfFlat('E'), n('F'), n('G'), n('A'), flat('B'), n('C', 1), n('D', 1)],
    primaryAjnas: [
      {
        id: 'bayati_d__jins_bayati_d',
        name: 'Jins Bayati on D',
        root: { letter: 'D', accidental: 'n' },
        intervalsInCents: [0, 150, 300, 500],
        source: `${MAQAM_WORLD_JINS}bayati.php`,
      },
      {
        // The spec rooted this on A, where Bayati's B-flat makes the authored
        // 0-200-300-500 impossible (it would be Jins Kurd). Nahawand sits on
        // the fifth degree, G — where those intervals are exactly right.
        id: 'bayati_d__jins_nahawand_g',
        name: 'Jins Nahawand on G',
        root: { letter: 'G', accidental: 'n' },
        intervalsInCents: [0, 200, 300, 500, 700],
        source: `${MAQAM_WORLD_JINS}nahawand.php`,
      },
    ],
  },
  /*
   * Bayati Shuri and Muhayyar: the rest of the Bayati family.
   *
   * Both share Jins Bayati on D as their root jins, which is what puts them in
   * this family — "Maqamat are classified into families based on sharing the
   * same first (root) jins" — and both are notated on D because Jins Bayati
   * itself is "notated here with its tonic on D".
   *
   * What differs is the cell on the 4th degree, and that is the whole lesson
   * of a family: same opening, different continuation. Bayati takes Nahawand
   * (or Rast), Bayati Shuri takes Hijaz, Muhayyar takes Rast.
   */
  {
    id: 'bayati_shuri_d',
    name: 'Bayati Shuri on D',
    transliteration: 'Maqam Bayati Shuri',
    source: `${MAQAM_WORLD_MAQAM}bayati_shuri.php`,
    arabicName: 'بياتي شوري',
    tonic: { letter: 'D', accidental: 'n' },
    description:
      'Bayati with Hijaz on top. The leap from A flat to B is what you hear, and it arrives exactly where Bayati would have gone somewhere gentler.',
    repeatsAtOctave: true,
    // Jins Bayati on D, then Jins Hijaz from G: G, A flat, B, C.
    scaleDegrees: [n('D'), halfFlat('E'), n('F'), n('G'), flat('A'), n('B'), n('C', 1), n('D', 1)],
    primaryAjnas: [
      {
        id: 'bayati_shuri_d__jins_bayati_d',
        name: 'Jins Bayati on D',
        root: { letter: 'D', accidental: 'n' },
        intervalsInCents: [0, 150, 300, 500],
        source: `${MAQAM_WORLD_JINS}bayati.php`,
      },
      {
        // "starts with the root Jins Bayati on the tonic followed by Jins
        // Hijaz on the 4th degree."
        id: 'bayati_shuri_d__jins_hijaz_g',
        name: 'Jins Hijaz on G',
        root: { letter: 'G', accidental: 'n' },
        intervalsInCents: [0, 100, 400, 500],
        source: `${MAQAM_WORLD_JINS}hijaz.php`,
      },
    ],
  },
  {
    id: 'muhayyar_d',
    name: 'Muhayyar on D',
    transliteration: 'Maqam Muhayyar',
    source: `${MAQAM_WORLD_MAQAM}bayati.php`,
    arabicName: 'محير',
    tonic: { letter: 'D', accidental: 'n' },
    /*
     * Said plainly, because the thing that makes Muhayyar itself is the one
     * thing this app does not model: it "is a version of Maqam Bayati whose
     * sayr starts at the octave note", descending through Bayati's ajnas.
     * The pitches here are right; the path is not shown, and claiming
     * otherwise would be the kind of quiet falsehood this data set has
     * already been caught in once.
     */
    description:
      'Bayati approached from the top. Its scale is Bayati with Rast above, but what makes it Muhayyar is where the melody starts and how it comes down, which this app does not show.',
    repeatsAtOctave: true,
    // Jins Bayati on D, then Jins Rast from G: G, A, B half-flat, C, D.
    scaleDegrees: [
      n('D'),
      halfFlat('E'),
      n('F'),
      n('G'),
      n('A'),
      halfFlat('B'),
      n('C', 1),
      n('D', 1),
    ],
    primaryAjnas: [
      {
        id: 'muhayyar_d__jins_bayati_d',
        name: 'Jins Bayati on D',
        root: { letter: 'D', accidental: 'n' },
        intervalsInCents: [0, 150, 300, 500],
        source: `${MAQAM_WORLD_JINS}bayati.php`,
      },
      {
        // "often uses Jins Rast on the 4th degree to ascend".
        id: 'muhayyar_d__jins_rast_g',
        name: 'Jins Rast on G',
        root: { letter: 'G', accidental: 'n' },
        intervalsInCents: [0, 200, 350, 500, 700],
        source: `${MAQAM_WORLD_JINS}rast.php`,
      },
    ],
  },
  {
    id: 'sikah_e',
    name: 'Sikah on E½♭',
    transliteration: 'Maqam Sikah',
    source: `${MAQAM_WORLD_MAQAM}sikah.php`,
    arabicName: 'سيكاه',
    tonic: { letter: 'E', accidental: 'd' },
    description:
      'Rooted on a half-flat, so the home note itself is one an untouched piano cannot play. Its first jins is only three notes.',
    repeatsAtOctave: true,
    scaleDegrees: [
      halfFlat('E'),
      n('F'),
      n('G'),
      n('A'),
      halfFlat('B'),
      n('C', 1),
      n('D', 1),
      halfFlat('E', 1),
    ],
    primaryAjnas: [
      {
        id: 'sikah_e__jins_sikah_e',
        name: 'Jins Sikah on E½♭',
        root: { letter: 'E', accidental: 'd' },
        intervalsInCents: [0, 150, 350],
        source: `${MAQAM_WORLD_JINS}sikah.php`,
      },
      {
        id: 'sikah_e__jins_rast_g',
        name: 'Jins Rast on G',
        root: { letter: 'G', accidental: 'n' },
        intervalsInCents: [0, 200, 350, 500],
        source: `${MAQAM_WORLD_JINS}rast.php`,
      },
    ],
  },
  {
    id: 'saba_d',
    name: 'Saba on D',
    transliteration: 'Maqam Saba',
    source: `${MAQAM_WORLD_MAQAM}saba.php`,
    arabicName: 'صبا',
    tonic: { letter: 'D', accidental: 'n' },
    description:
      'The sound of lament. Saba is the one family that never comes home: its upper tonic is flattened, so the scale does not close at the octave.',
    // The exception the `repeatsAtOctave` flag exists for.
    repeatsAtOctave: false,
    scaleDegrees: [
      n('D'),
      halfFlat('E'),
      n('F'),
      flat('G'),
      n('A'),
      flat('B'),
      n('C', 1),
    ],
    primaryAjnas: [
      {
        // Only the lower jins is listed. Jins Saba — with its diminished fourth
        // from D to G-flat — is the uncontested, defining cell. Saba's upper
        // region is analysed differently across sources, and guessing at it
        // would be inventing content (docs/CONTENT_ACCURACY.md).
        id: 'saba_d__jins_saba_d',
        name: 'Jins Saba on D',
        root: { letter: 'D', accidental: 'n' },
        intervalsInCents: [0, 150, 300, 400],
        source: `${MAQAM_WORLD_JINS}saba.php`,
      },
    ],
  },
  {
    id: 'hijaz_d',
    name: 'Hijaz on D',
    transliteration: 'Maqam Hijaz',
    source: `${MAQAM_WORLD_MAQAM}hijaz.php`,
    arabicName: 'حجاز',
    tonic: { letter: 'D', accidental: 'n' },
    description:
      'No microtones at all. The drama is the step-and-a-half leap from E♭ to F♯. A good place to start if the half-flats are not landing yet.',
    repeatsAtOctave: true,
    scaleDegrees: [n('D'), flat('E'), sharp('F'), n('G'), n('A'), flat('B'), n('C', 1), n('D', 1)],
    primaryAjnas: [
      {
        id: 'hijaz_d__jins_hijaz_d',
        name: 'Jins Hijaz on D',
        root: { letter: 'D', accidental: 'n' },
        intervalsInCents: [0, 100, 400, 500],
        source: `${MAQAM_WORLD_JINS}hijaz.php`,
      },
      {
        id: 'hijaz_d__jins_nahawand_g',
        name: 'Jins Nahawand on G',
        root: { letter: 'G', accidental: 'n' },
        intervalsInCents: [0, 200, 300, 500, 700],
        source: `${MAQAM_WORLD_JINS}nahawand.php`,
      },
    ],
  },
  {
    id: 'kurd_d',
    name: 'Kurd on D',
    transliteration: 'Maqam Kurd',
    source: `${MAQAM_WORLD_MAQAM}kurd.php`,
    arabicName: 'كرد',
    tonic: { letter: 'D', accidental: 'n' },
    description:
      'A flattened second and nothing else exotic. Western ears hear Phrygian; the difference is where the melody rests, not which notes exist.',
    repeatsAtOctave: true,
    scaleDegrees: [n('D'), flat('E'), n('F'), n('G'), n('A'), flat('B'), n('C', 1), n('D', 1)],
    primaryAjnas: [
      {
        id: 'kurd_d__jins_kurd_d',
        name: 'Jins Kurd on D',
        root: { letter: 'D', accidental: 'n' },
        intervalsInCents: [0, 100, 300, 500],
        source: `${MAQAM_WORLD_JINS}kurd.php`,
      },
      {
        id: 'kurd_d__jins_nahawand_g',
        name: 'Jins Nahawand on G',
        root: { letter: 'G', accidental: 'n' },
        intervalsInCents: [0, 200, 300, 500],
        source: `${MAQAM_WORLD_JINS}nahawand.php`,
      },
    ],
  },
  {
    id: 'nahawand_c',
    name: 'Nahawand on C',
    transliteration: 'Maqam Nahawand',
    source: `${MAQAM_WORLD_MAQAM}nahawand.php`,
    arabicName: 'نهاوند',
    tonic: { letter: 'C', accidental: 'n' },
    description:
      'The closest thing to a Western minor. Useful as a control: if Nahawand sounds ordinary to you, the strangeness in the others really is the tuning.',
    repeatsAtOctave: true,
    scaleDegrees: [n('C'), n('D'), flat('E'), n('F'), n('G'), flat('A'), flat('B'), n('C', 1)],
    primaryAjnas: [
      {
        id: 'nahawand_c__jins_nahawand_c',
        name: 'Jins Nahawand on C',
        root: { letter: 'C', accidental: 'n' },
        // "Jins Nahawand is a 5-note jins ... tonic on C and its ghammaz on G."
        intervalsInCents: [0, 200, 300, 500, 700],
        source: `${MAQAM_WORLD_JINS}nahawand.php`,
      },
      {
        id: 'nahawand_c__jins_kurd_g',
        name: 'Jins Kurd on G',
        root: { letter: 'G', accidental: 'n' },
        intervalsInCents: [0, 100, 300, 500],
        source: `${MAQAM_WORLD_JINS}kurd.php`,
      },
    ],
  },
  {
    id: 'nikriz_c',
    name: 'Nikriz on C',
    transliteration: 'Maqam Nikriz',
    source: `${MAQAM_WORLD_MAQAM}nikriz.php`,
    arabicName: 'نكريز',
    tonic: { letter: 'C', accidental: 'n' },
    description:
      'Built on a five-note jins rather than a four-note one, with a raised fourth. The extra note is why its lower cell reaches all the way to the fifth.',
    repeatsAtOctave: true,
    scaleDegrees: [n('C'), n('D'), flat('E'), sharp('F'), n('G'), n('A'), flat('B'), n('C', 1)],
    primaryAjnas: [
      {
        id: 'nikriz_c__jins_nikriz_c',
        name: 'Jins Nikriz on C',
        root: { letter: 'C', accidental: 'n' },
        intervalsInCents: [0, 200, 300, 600, 700],
        source: `${MAQAM_WORLD_JINS}nikriz.php`,
      },
      {
        id: 'nikriz_c__jins_nahawand_g',
        name: 'Jins Nahawand on G',
        root: { letter: 'G', accidental: 'n' },
        intervalsInCents: [0, 200, 300, 500],
        source: `${MAQAM_WORLD_JINS}nahawand.php`,
      },
    ],
  },
  {
    id: 'ajam_bb',
    name: 'Ajam on B♭',
    transliteration: 'Maqam Ajam',
    source: `${MAQAM_WORLD_MAQAM}ajam.php`,
    arabicName: 'عجم',
    tonic: { letter: 'B', accidental: 'b' },
    description:
      'The major scale, by another name and another route. Its two ajnas are identical, which is exactly what makes it sound settled.',
    repeatsAtOctave: true,
    scaleDegrees: [
      flat('B'),
      n('C', 1),
      n('D', 1),
      flat('E', 1),
      n('F', 1),
      n('G', 1),
      n('A', 1),
      flat('B', 1),
    ],
    primaryAjnas: [
      {
        id: 'ajam_bb__jins_ajam_bb',
        name: 'Jins Ajam on B♭',
        root: { letter: 'B', accidental: 'b' },
        // "The 5-note version of Jins 'Ajam is the most common version",
        // ghammaz on the 5th.
        intervalsInCents: [0, 200, 400, 500, 700],
        source: `${MAQAM_WORLD_JINS}ajam.php`,
      },
      {
        id: 'ajam_bb__jins_ajam_f',
        name: 'Jins Ajam on F',
        root: { letter: 'F', accidental: 'n' },
        intervalsInCents: [0, 200, 400, 500],
        source: `${MAQAM_WORLD_JINS}ajam.php`,
      },
    ],
  },
];

export const MAQAM_PRESETS_BY_ID: Record<string, MaqamPreset> = Object.fromEntries(
  MAQAM_PRESETS.map((preset) => [preset.id, preset]),
);

export const DEFAULT_MAQAM_ID = 'rast_c';

/**
 * Look up a preset. Returns `undefined` for an unknown id rather than falling
 * back to Rast — a stale URL should not silently look like a deliberate choice
 * of the default maqam.
 */
export function findMaqamPreset(id: string | null | undefined): MaqamPreset | undefined {
  if (!id) return undefined;
  return MAQAM_PRESETS_BY_ID[id];
}
