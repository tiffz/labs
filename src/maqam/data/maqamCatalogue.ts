/**
 * The maqamat themselves, and nothing else.
 *
 * Split from `maqamPresets.ts` when that file passed 600 lines: this is data
 * that grows every time a family is imported, and the derivation beside it was
 * not growing at all. Types and every function that reads them live in
 * `maqamPresets.ts`; this file only ever gains rows.
 *
 * Every interval here is checked against maqamworld.com and says where. The
 * first version of this data was wrong in a way nobody could audit — 5-note
 * pentachords stored as 4-note tetrachords — and it survived review because
 * there was nowhere to go and check.
 */
import type { MaqamPreset, MaqamScaleDegree } from './maqamPresets';

/** Reference for every musical claim about a jins in this file. */
const MAQAM_WORLD_JINS = 'https://www.maqamworld.com/en/jins/';
const MAQAM_WORLD_MAQAM = 'https://www.maqamworld.com/en/maqam/';

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
        alternatives: [
          {
            id: 'rast_c__jins_nahawand_g',
            name: 'Jins Nahawand on G',
            root: { letter: 'G', accidental: 'n' },
            intervalsInCents: [0, 200, 300, 500, 700],
            source: `${MAQAM_WORLD_JINS}nahawand.php`,
          },
        ],
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
    id: 'ajam_c',
    name: 'Ajam on C',
    transliteration: 'Maqam Ajam',
    source: `${MAQAM_WORLD_MAQAM}ajam.php`,
    arabicName: 'عجم',
    tonic: { letter: 'C', accidental: 'n' },
    description:
      'The major scale, by another name and another route. Its second cell repeats the shape of the first, which is what makes it sound settled.',
    repeatsAtOctave: true,
    // Jins 'Ajam on C, then Jins Upper 'Ajam from G: G, A, B, C.
    scaleDegrees: [n('C'), n('D'), n('E'), n('F'), n('G'), n('A'), n('B'), n('C', 1)],
    primaryAjnas: [
      {
        id: 'ajam_c__jins_ajam_c',
        name: "Jins 'Ajam on C",
        root: { letter: 'C', accidental: 'n' },
        // "The 5-note version of Jins 'Ajam is the most common version",
        // notated "with its tonic on C and its ghammaz on G".
        intervalsInCents: [0, 200, 400, 500, 700],
        source: `${MAQAM_WORLD_JINS}ajam.php`,
      },
      {
        /*
         * Not a second Jins 'Ajam, which is what this data used to claim.
         * maqamworld: Maqam 'Ajam starts with "the root Jins 'Ajam on the
         * tonic, followed by either Jins Upper 'Ajam on the 5th degree (with
         * its tonic up on the 8th degree) or Jins Nahawand on the 5th degree."
         *
         * `root` here means where the cell SITS in the scale, which is the 5th
         * degree. Its tonic is a different note: Jins Upper 'Ajam is "notated
         * here with its ghammaz on G and its tonic on C" — tonic above,
         * ghammaz below. This app does not model that inversion, and storing G
         * draws the span correctly; it just does not know which end the cell
         * leans on.
         */
        id: 'ajam_c__jins_upper_ajam_g',
        name: "Jins Upper 'Ajam on G",
        root: { letter: 'G', accidental: 'n' },
        intervalsInCents: [0, 200, 400, 500],
        source: `${MAQAM_WORLD_JINS}upper_ajam.php`,
        alternatives: [
          {
            id: 'ajam_c__jins_nahawand_g',
            name: 'Jins Nahawand on G',
            root: { letter: 'G', accidental: 'n' },
            intervalsInCents: [0, 200, 300, 500, 700],
            source: `${MAQAM_WORLD_JINS}nahawand.php`,
          },
        ],
      },
    ],
  },
];
