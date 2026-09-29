/**
 * The Maqam Rast family.
 *
 * "Maqam Rast Family is made of maqamat that start with Jins Rast"
 * (maqamworld, `maqam/f_rast.php`). The app derives a maqam's family from its
 * root jins rather than storing it, so these file themselves into the Rast
 * group by having Jins Rast on the tonic. Maqam Sazkar reaches it through
 * `variationOf`, because its root is Jins Sazkar — which the source calls "a
 * variation of Jins Rast with a raised 2nd" and files here.
 *
 * ONE MEMBER IS MISSING ON PURPOSE. Maqam Dalanshin starts with Jins Saba
 * Dalanshin, which maqamworld calls "a special case of Jins Saba which has no
 * ghammaz, and therefore NO DEFINED SIZE", with intervals only "more or less
 * identical to Jins Hijaz". `Jins` requires a definite `intervalsInCents`, and
 * `maqamPresets.test.ts` checks every jins's size against maqamworld's own
 * 3/4/5-note index. Encoding a size the source explicitly declines to give
 * would invent the one thing this data exists to be checkable on.
 */
import type { MaqamPreset } from '../maqamPresets';
import { MAQAM_WORLD_JINS, MAQAM_WORLD_MAQAM, flat, halfFlat, n, sharp } from '../maqamScaleHelpers';

export const RAST_FAMILY: MaqamPreset[] = [
  {
    id: 'rast_c',
    name: 'Rast on C',
    transliteration: 'Maqam Rast',
    source: `${MAQAM_WORLD_MAQAM}rast.php`,
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
    id: 'suznak_c',
    name: 'Suznak on C',
    transliteration: 'Maqam Suznak',
    source: `${MAQAM_WORLD_MAQAM}suznak.php`,
    tonic: { letter: 'C', accidental: 'n' },
    description:
      'Rast with a Hijaz cell on the 5th. maqamworld calls that modulation "practically obligatory" in any taqsim starting on Jins Rast, which makes this the most played of the family after Rast itself.',
    repeatsAtOctave: true,
    scaleDegrees: [n('C'), n('D'), halfFlat('E'), n('F'), n('G'), flat('A'), n('B'), n('C', 1)],
    primaryAjnas: [
      {
        id: 'suznak_c__jins_rast_c',
        name: 'Jins Rast on C',
        root: { letter: 'C', accidental: 'n' },
        intervalsInCents: [0, 200, 350, 500, 700],
        source: `${MAQAM_WORLD_JINS}rast.php`,
      },
      {
        id: 'suznak_c__jins_hijaz_g',
        name: 'Jins Hijaz on G',
        root: { letter: 'G', accidental: 'n' },
        intervalsInCents: [0, 100, 400, 500],
        source: `${MAQAM_WORLD_JINS}hijaz.php`,
      },
    ],
  },
  {
    id: 'nairuz_c',
    name: 'Nairuz on C',
    transliteration: 'Maqam Nairuz',
    source: `${MAQAM_WORLD_MAQAM}nairuz.php`,
    tonic: { letter: 'C', accidental: 'n' },
    description:
      'Rast below, Bayati above. Rare on its own, but it turns up constantly as a section inside Rast and Suznak.',
    repeatsAtOctave: true,
    scaleDegrees: [
      n('C'),
      n('D'),
      halfFlat('E'),
      n('F'),
      n('G'),
      halfFlat('A'),
      flat('B'),
      n('C', 1),
    ],
    primaryAjnas: [
      {
        id: 'nairuz_c__jins_rast_c',
        name: 'Jins Rast on C',
        root: { letter: 'C', accidental: 'n' },
        intervalsInCents: [0, 200, 350, 500, 700],
        source: `${MAQAM_WORLD_JINS}rast.php`,
      },
      {
        id: 'nairuz_c__jins_bayati_g',
        name: 'Jins Bayati on G',
        root: { letter: 'G', accidental: 'n' },
        intervalsInCents: [0, 150, 300, 500],
        source: `${MAQAM_WORLD_JINS}bayati.php`,
      },
    ],
  },
  {
    id: 'yakah_g',
    name: 'Yakah on G',
    transliteration: 'Maqam Yakah',
    source: `${MAQAM_WORLD_MAQAM}nairuz.php`,
    tonic: { letter: 'G', accidental: 'n' },
    /*
     * The one maqam here whose point is WHERE it sits, not what it is:
     * "an archaic version of Maqam Nairuz, based on note G3 in the Arabic
     * archaic 24-tone scale (named 'Yakah') rather than note C4". Same two
     * cells, moved. It earns its row because the app can actually show that —
     * the staff and the keyboard both move with it.
     */
    description:
      'Nairuz written a fourth lower, on the note the old Arabic scale calls Yakah. The cells are the same; where they sit on the instrument is the whole difference.',
    repeatsAtOctave: true,
    scaleDegrees: [
      n('G'),
      n('A'),
      halfFlat('B'),
      n('C', 1),
      n('D', 1),
      halfFlat('E', 1),
      n('F', 1),
      n('G', 1),
    ],
    primaryAjnas: [
      {
        id: 'yakah_g__jins_rast_g',
        name: 'Jins Rast on G',
        root: { letter: 'G', accidental: 'n' },
        intervalsInCents: [0, 200, 350, 500, 700],
        source: `${MAQAM_WORLD_JINS}rast.php`,
      },
      {
        id: 'yakah_g__jins_bayati_d',
        name: 'Jins Bayati on D',
        root: { letter: 'D', accidental: 'n' },
        intervalsInCents: [0, 150, 300, 500],
        source: `${MAQAM_WORLD_JINS}bayati.php`,
      },
    ],
  },
  {
    id: 'kirdan_c',
    name: 'Kirdan on C',
    transliteration: 'Maqam Kirdan',
    source: `${MAQAM_WORLD_MAQAM}kirdan.php`,
    tonic: { letter: 'C', accidental: 'n' },
    /*
     * SAME SCALE AS RAST, deliberately.
     *
     * "Maqam Kirdan is a version of Maqam Rast whose sayr starts on the octave
     * and eventually descends to the tonic." The difference is entirely in the
     * sayr — the melodic path — and this app models scales, not sayr. So the
     * staff, the keyboard and the ajnas chips are identical to Rast's, and the
     * description is the only place the difference exists.
     *
     * Kept rather than dropped because "the same notes, approached from the
     * other end" is a true and teachable fact about the repertoire, and a
     * reader who picks Kirdan and sees Rast's scale has learned it. Dropping
     * it would quietly assert that a maqam IS its scale, which is the
     * flattening this app's README warns against.
     */
    description:
      'The same notes as Rast, played from the top down. Its sayr starts on the octave and descends to the tonic, which is a difference of melodic path rather than of scale, so the staff here is Rast\'s.',
    repeatsAtOctave: true,
    scaleDegrees: [n('C'), n('D'), halfFlat('E'), n('F'), n('G'), n('A'), halfFlat('B'), n('C', 1)],
    primaryAjnas: [
      {
        id: 'kirdan_c__jins_rast_c',
        name: 'Jins Rast on C',
        root: { letter: 'C', accidental: 'n' },
        intervalsInCents: [0, 200, 350, 500, 700],
        source: `${MAQAM_WORLD_JINS}rast.php`,
      },
      {
        id: 'kirdan_c__jins_upper_rast_g',
        name: 'Jins Upper Rast on G',
        root: { letter: 'G', accidental: 'n' },
        intervalsInCents: [0, 200, 350, 500],
        source: `${MAQAM_WORLD_JINS}upper_rast.php`,
      },
    ],
  },
  {
    id: 'sazkar_c',
    name: 'Sazkar on C',
    transliteration: 'Maqam Sazkar',
    source: `${MAQAM_WORLD_MAQAM}kirdan.php`,
    tonic: { letter: 'C', accidental: 'n' },
    description:
      'Kirdan with a raised 2nd degree, which opens a gap of a step and a half at the bottom of the scale and then a very small one into the 3rd.',
    repeatsAtOctave: true,
    scaleDegrees: [n('C'), sharp('D'), halfFlat('E'), n('F'), n('G'), n('A'), halfFlat('B'), n('C', 1)],
    primaryAjnas: [
      {
        /*
         * THE ONE NEW CELL IN THIS FAMILY, and the one to check.
         *
         * maqamworld states its size and its ghammaz in prose — "a 5-note
         * jins", "its tonic on C and its ghammaz on G" — and describes it only
         * as "a variation of Jins Rast with a raised 2nd". The intervals
         * themselves are on that page as a notation image, not as text, so
         * the raised 2nd is written here as D sharp: Jins Rast's 200 becomes
         * 300, leaving 50 cents into the half-flat 3rd.
         *
         * Everything else about this cell is checkable against the source.
         * This one interval is the reading of a picture, so it is the line to
         * compare against maqamworld's notation before trusting it.
         */
        id: 'sazkar_c__jins_sazkar_c',
        name: 'Jins Sazkar on C',
        root: { letter: 'C', accidental: 'n' },
        intervalsInCents: [0, 300, 350, 500, 700],
        source: `${MAQAM_WORLD_JINS}sazkar.php`,
        /* maqamworld lists Maqam Sazkar under the Rast family even though its
           root is this cell, because this cell IS Jins Rast with a raised
           2nd. Without this the derived family would invent a "Sazkar
           family" the source does not have. */
        variationOf: 'Rast',
      },
      {
        id: 'sazkar_c__jins_upper_rast_g',
        name: 'Jins Upper Rast on G',
        root: { letter: 'G', accidental: 'n' },
        intervalsInCents: [0, 200, 350, 500],
        source: `${MAQAM_WORLD_JINS}upper_rast.php`,
      },
    ],
  },
  {
    id: 'mahur_c',
    name: 'Mahur on C',
    transliteration: 'Maqam Mahur',
    source: `${MAQAM_WORLD_MAQAM}mahur.php`,
    tonic: { letter: 'C', accidental: 'n' },
    description:
      'Rast below, and a plain major tetrachord above, so the 7th comes back up to natural. The half-flat 3rd is the only microtone left.',
    repeatsAtOctave: true,
    scaleDegrees: [n('C'), n('D'), halfFlat('E'), n('F'), n('G'), n('A'), n('B'), n('C', 1)],
    primaryAjnas: [
      {
        id: 'mahur_c__jins_rast_c',
        name: 'Jins Rast on C',
        root: { letter: 'C', accidental: 'n' },
        intervalsInCents: [0, 200, 350, 500, 700],
        source: `${MAQAM_WORLD_JINS}rast.php`,
      },
      {
        id: 'mahur_c__jins_upper_ajam_g',
        name: "Jins Upper 'Ajam on G",
        root: { letter: 'G', accidental: 'n' },
        intervalsInCents: [0, 200, 400, 500],
        source: `${MAQAM_WORLD_JINS}upper_ajam.php`,
      },
    ],
  },
  {
    id: 'suzdalara_c',
    name: 'Suzdalara on C',
    transliteration: 'Maqam Suzdalara',
    source: `${MAQAM_WORLD_MAQAM}suzdalara.php`,
    tonic: { letter: 'C', accidental: 'n' },
    /*
     * maqamworld: "quite archaic and almost non-existent as an independent
     * maqam, although its sayr is obligatory within nearly every performance
     * and song in every branch of Maqam Rast" — because "the Jins Nahawand on
     * the 5th degree of Maqam Rast is a universal transition device ...
     * signaling the return to the root Jins Rast on the tonic."
     *
     * Rast already lists this cell as an ALTERNATIVE on its 5th degree. Here
     * it is the primary, which is the difference between "Rast can go here"
     * and "this is the thing Rast goes to".
     */
    description:
      'Rast with Nahawand on the 5th. Barely a maqam on its own, but it is the standard way back: hearing this cell is how a listener knows a modulation is about to return home.',
    repeatsAtOctave: true,
    scaleDegrees: [n('C'), n('D'), halfFlat('E'), n('F'), n('G'), n('A'), flat('B'), n('C', 1)],
    primaryAjnas: [
      {
        id: 'suzdalara_c__jins_rast_c',
        name: 'Jins Rast on C',
        root: { letter: 'C', accidental: 'n' },
        intervalsInCents: [0, 200, 350, 500, 700],
        source: `${MAQAM_WORLD_JINS}rast.php`,
      },
      {
        id: 'suzdalara_c__jins_nahawand_g',
        name: 'Jins Nahawand on G',
        root: { letter: 'G', accidental: 'n' },
        intervalsInCents: [0, 200, 300, 500, 700],
        source: `${MAQAM_WORLD_JINS}nahawand.php`,
      },
    ],
  },
];
