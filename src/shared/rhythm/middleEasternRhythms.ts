import type { RhythmDefinition } from './presetDatabase';

/**
 * Middle Eastern and Kurdish rhythms.
 *
 * Kept apart from the rest of the database because these entries carry the weight: alternate names
 * across several traditions, citations to a specific printed source, and comments recording how
 * each pattern was decoded. Editing one of these means checking a source, not just a pattern.
 *
 * Two rules for the user-facing text here:
 *
 * 1. **English only.** No Arabic, Persian or Kurdish script anywhere the reader sees it — the owner
 *    does not read those scripts and will not publish text she cannot verify. Script belongs in
 *    these comments, where it is provenance for the next editor, and it is glossed every time.
 * 2. **Assume no background.** The reader has never heard of a daf, a zikr or a maqam. Any term
 *    that is not plain English gets explained in the same sentence, or is cut.
 *
 * Every `name` is CANONICAL and matches the owner's teachers' books. Descriptions refer to rhythms
 * by those names only; other spellings belong in `alternateNames`, never in prose. Where a source
 * disagrees with the books, the books win in the copy and the disagreement is recorded here.
 */
export const MIDDLE_EASTERN_RHYTHMS: Record<string, RhythmDefinition> = {
  maqsum: {
    id: 'maqsum',
    name: 'Maqsum',
    description:
      'The most common rhythm in Arabic music. It carries most Egyptian pop songs and most belly dance.',
    alternateNames: [
      { name: 'Maqsoum', context: 'common spelling' },
      { name: 'Maksum', context: 'common spelling' },
    ],
    usedIn: 'Egyptian and Arabic pop, belly dance',
    learnMoreLinks: [
      { title: 'Wikipedia: Maqsoum', url: 'https://en.wikipedia.org/wiki/Maqsoum' },
    ],
    basePattern: 'D-T-__T-D---T---',
    timeSignature: { numerator: 4, denominator: 4 },
    sixEightPattern: 'D-T-__D---T-',
    variations: [
      { notation: 'D-T-__T-D---T---' },
      { notation: 'D-T-__T-D-K-T---' },
      { notation: 'D-T-__T-D-K-T-K-' },
      { notation: 'D-T-K-T-D-K-T---' },
      { notation: 'D-T-K-T-D-K-T-K-' },
    ],
    relatedRhythmIds: ['saeidi', 'baladi'],
  },
  saeidi: {
    id: 'saeidi',
    name: 'Saeidi',
    description:
      'A rhythm from Upper Egypt, the southern stretch of the Nile valley. Two low strokes in the ' +
      'middle of the bar give it a heavier tread than Maqsum.',
    alternateNames: [
      { name: "Sa'idi", context: 'common spelling' },
      { name: 'Saidi', context: 'common spelling' },
    ],
    usedIn: 'Egyptian folk song, belly dance',
    learnMoreLinks: [],
    basePattern: 'D-T-__D-D---T---',
    timeSignature: { numerator: 4, denominator: 4 },
    sixEightPattern: 'D-T-__D-D-T-',
    variations: [
      { notation: 'D-T-__D-D---T---' },
      { notation: 'D-T-__D-D-K-T---' },
      { notation: 'D-T-__D-D-K-T-K-' },
      { notation: 'D-T-K-D-D-K-T---' },
      { notation: 'D-T-K-D-D-K-T-K-' },
    ],
    relatedRhythmIds: ['maqsum', 'baladi'],
  },
  baladi: {
    id: 'baladi',
    name: 'Baladi',
    description:
      'An Egyptian rhythm whose name means "local", or "of the homeland". It opens with two low ' +
      'strokes where Maqsum opens with a low and a high.',
    alternateNames: [
      { name: 'Masmudi Saghir', context: 'older, more formal name' },
      { name: 'Beledi', context: 'common spelling' },
    ],
    usedIn: 'Egyptian song, belly dance',
    learnMoreLinks: [{ title: 'Wikipedia: Baladi', url: 'https://en.wikipedia.org/wiki/Baladi' }],
    basePattern: 'D-D-__T-D---T---',
    timeSignature: { numerator: 4, denominator: 4 },
    sixEightPattern: 'D-D-__D---T-',
    variations: [
      { notation: 'D-D-__T-D---T---' },
      { notation: 'D-D-__T-D-K-T-K-' },
      { notation: 'D-D-K-T-D-K-T---' },
      { notation: 'D-D-K-T-D-K-T-K-' },
    ],
    relatedRhythmIds: ['maqsum', 'saeidi'],
  },
  ayoub: {
    id: 'ayoub',
    name: 'Ayoub',
    description:
      'A short, driving two-beat rhythm played across the Middle East. Slow, it accompanies an ' +
      'Egyptian ceremony held to heal illness. Fast, it drives the peak of a dance.',
    alternateNames: [
      { name: 'Ayyub', context: 'common spelling' },
      { name: 'Zar', context: 'in Egypt, after the healing ceremony' },
    ],
    usedIn: 'Sufi devotional music, Egyptian healing ceremonies, fast dance sections',
    learnMoreLinks: [
      { title: 'Ayyub 2/4 — Maqam World', url: 'https://www.maqamworld.com/en/iqaa/ayyub.php' },
      { title: '30 Pieces For Daf and Frame Drum — Amir School of Music', url: 'https://www.amirschoolofmusic.com/store/p/pdf-30-pieces-book-1' },
    ],
    basePattern: 'D--KD-T-',
    timeSignature: { numerator: 2, denominator: 4 },
    sixEightPattern: 'D--K--D-T---',
    variations: [
      { notation: 'D--KD-T-' },
      { notation: 'D-TKD-T-' },
      { notation: 'D-TKT-D-', note: 'From the song "La Bass Fe Eyne"' },
      { notation: 'D-KKD-T-', note: 'Variation from 30 Pieces For Daf and Frame Drum (Amir School of Music)' },
    ],
    relatedRhythmIds: ['daem', 'helgertin'],
  },
  daem: {
    id: 'daem',
    name: 'Da-em',
    description:
      'A traditional piece for the daf, the large Kurdish frame drum strung with metal rings. ' +
      'Played slowly it accompanies the repeated chanting of Sufi worship; played fast, dancing. ' +
      'The name means "constant".',
    alternateNames: [
      { name: "Da'em", context: 'Persian spelling' },
      { name: 'Dayim', context: 'Kurdish spelling' },
    ],
    usedIn: 'Kurdish and Persian frame drumming, Sufi ceremonies',
    learnMoreLinks: [
      { title: 'Daff: A Sacred Symbol of Kurdish Culture and Spirituality — Kurdish Globe', url: 'https://kurdishglobe.krd/daff-a-sacred-symbol-of-kurdish-culture-and-spirituality/' },
      { title: 'Daf pieces — Persian Wikipedia', url: 'https://fa.wikipedia.org/wiki/%D9%85%D9%82%D8%A7%D9%85%E2%80%8C%D9%87%D8%A7%DB%8C_%D8%AF%D9%81' },
      { title: '30 Pieces For Daf and Frame Drum — Amir School of Music', url: 'https://www.amirschoolofmusic.com/store/p/pdf-30-pieces-book-1' },
    ],
    basePattern: 'D-TKD-TK',
    timeSignature: { numerator: 2, denominator: 4 },
    variations: [{ notation: 'D-TKD-TK' }],
    relatedRhythmIds: ['ayoub', 'helgertin', 'haddadi'],
  },

  /*
   * Helgertin and Haddadi — transcribed from "30 Pieces For Daf and Frame Drum" (Amir School of Music),
   * https://www.amirschoolofmusic.com/store/p/pdf-30-pieces-book-1
   *
   * The book notates strokes as Ç / A / V above the noteheads. That maps to this app's Darbuka
   * notation as Ç -> D (dum), A -> T (tek), V -> K (ka). The mapping is not a guess: two rhythms
   * in the same figure decode to patterns ALREADY in this database —
   *
   *   book "Da-em"  Ç A V Ç A V  ->  D-TKD-TK  == the existing `daem` basePattern
   *   book "Ayoub"  Ç V Ç A      ->  D--KD-T-  == the existing `ayoub` basePattern
   *
   * — so the same reading applied to Helgertin and Haddadi is corroborated rather than invented.
   */
  helgertin: {
    id: 'helgertin',
    name: 'Helgertin',
    /*
     * Classification dispute, resolved in favour of the books.
     *
     * Kurdish Wikipedia lists this one under "daf rhythms" rather than "daf maqams" and says
     * outright that calling these rhythms maqams is a mistake. The owner's book groups it with the
     * other daf pieces, and the owner's rule is that her teachers' sources win a tie. So the copy
     * calls it a daf piece, like Da-em and Haddadi.
     *
     * The one place the Wikipedia reading is followed is the setting: it names helperke dance and
     * weddings rather than worship, and nothing in the book contradicts that.
     */
    description:
      'A daf piece played at Kurdish weddings and for helperke, a line dance in which people link ' +
      'hands and step together. The name means "to lift".',
    alternateNames: [
      { name: 'Helgirtin', context: 'Kurdish spelling' },
      { name: 'Hal gertan', context: 'Persian spelling, written as two words' },
    ],
    usedIn: 'Kurdish weddings, line dancing',
    learnMoreLinks: [
      { title: 'Daf pieces — Kurdish Wikipedia', url: 'https://ckb.wikipedia.org/wiki/%D9%85%DB%95%D9%82%D8%A7%D9%85%DB%95%DA%A9%D8%A7%D9%86%DB%8C_%D8%AF%DB%95%D9%81' },
      { title: '30 Pieces For Daf and Frame Drum — Amir School of Music', url: 'https://www.amirschoolofmusic.com/store/p/pdf-30-pieces-book-1' },
    ],
    /*
     * The book notates this as TWO 2/4 measures. The database represents a full cycle as ONE
     * measure — two invariants require it (`presetIntegrity`: variations must be exactly one
     * measure; `rhythmRecognition`: basePattern must appear among variations), and Maqsum already
     * follows the same convention for its 16-sixteenth cycle. The grid is identical either way:
     * 16 sixteenths is one 4/4 bar or two 2/4 bars.
     */
    basePattern: 'D-TKD-T-TTK-D-T-',
    timeSignature: { numerator: 4, denominator: 4 },
    variations: [
      { notation: 'D-TKD-T-TTK-D-T-', note: 'Full cycle — the book writes it as two 2/4 measures' },
    ],
    relatedRhythmIds: ['daem', 'haddadi', 'ayoub'],
  },
  haddadi: {
    id: 'haddadi',
    name: 'Haddadi',
    /*
     * Distinct from Ghawsi (2/8), which one widely-copied cassette of Seyid Ata Salamiya
     * mislabelled as Haddadi. Kurdish Wikipedia footnotes the error, glossing to: "the Ghawsi
     * maqam has been called Haddadi, but the two are separate".
     */
    description:
      'A daf piece in two halves that answer each other, the first low and the second high. ' +
      'Played in the lodge where a Sufi order gathers to worship.',
    alternateNames: [{ name: 'Hedadi', context: 'Kurdish spelling' }],
    usedIn: 'Kurdish frame drumming, Sufi ceremonies',
    learnMoreLinks: [
      { title: 'Daf pieces — Kurdish Wikipedia', url: 'https://ckb.wikipedia.org/wiki/%D9%85%DB%95%D9%82%D8%A7%D9%85%DB%95%DA%A9%D8%A7%D9%86%DB%8C_%D8%AF%DB%95%D9%81' },
      { title: 'Daff: A Sacred Symbol of Kurdish Culture and Spirituality — Kurdish Globe', url: 'https://kurdishglobe.krd/daff-a-sacred-symbol-of-kurdish-culture-and-spirituality/' },
      { title: '30 Pieces For Daf and Frame Drum — Amir School of Music', url: 'https://www.amirschoolofmusic.com/store/p/pdf-30-pieces-book-1' },
    ],
    basePattern: 'DDK-TTK-',
    timeSignature: { numerator: 2, denominator: 4 },
    variations: [{ notation: 'DDK-TTK-' }],
    relatedRhythmIds: ['daem', 'helgertin'],
  },
  malfuf: {
    id: 'malfuf',
    name: 'Malfuf',
    description:
      'Eight quick counts grouped 3–3–2, so the accents land unevenly. One low stroke opens each ' +
      'cycle. Often used to walk a dancer on or off stage.',
    alternateNames: [
      { name: 'Malfouf', context: 'common spelling' },
      { name: 'Laff', context: 'shorter form of the same word' },
    ],
    usedIn: 'Entrances and exits in Arabic dance',
    learnMoreLinks: [
      { title: 'Malfuf 2/4 — Maqam World', url: 'https://www.maqamworld.com/en/iqaa/malfuf.php' },
    ],
    basePattern: 'D-----T-----T---',
    timeSignature: { numerator: 8, denominator: 8 },
    fourFourMappingPattern: 'D--T--T-',
    sixEightPattern: 'D---T-D---T-',
    variations: [
      { notation: 'D-----T-----T---', timeSignature: { numerator: 8, denominator: 8 } },
      { notation: 'D-K-K-T-K-K-T-K-', note: '8/8 with ka ornaments', timeSignature: { numerator: 8, denominator: 8 } },
      { notation: 'D---K-T---K-T---', note: '8/8 quarter-note anchors', timeSignature: { numerator: 8, denominator: 8 } },
      { notation: 'D--T--T-', note: '2/4 variation', timeSignature: { numerator: 2, denominator: 4 } },
      { notation: 'D-KT-KT-', note: '2/4 ornamented variation', timeSignature: { numerator: 2, denominator: 4 } },
      { notation: 'DKKTKKTK', note: '2/4 dense variation', timeSignature: { numerator: 2, denominator: 4 } },
    ],
    relatedRhythmIds: ['kahleegi'],
  },
  kahleegi: {
    id: 'kahleegi',
    name: 'Kahleegi',
    description:
      'The same 3–3–2 grouping as Malfuf, but with two low strokes instead of one. Named for the ' +
      'Persian Gulf, and played for a Gulf dance built on swinging hair and long dresses.',
    alternateNames: [
      { name: 'Khaleeji', context: 'common spelling' },
      { name: 'Khaleegy', context: 'spelling used for the dance' },
    ],
    usedIn: 'Gulf dance and song',
    learnMoreLinks: [
      { title: 'Wikipedia: Khaleegy (dance)', url: 'https://en.wikipedia.org/wiki/Khaleegy_(dance)' },
    ],
    basePattern: 'D-----D-----T---',
    timeSignature: { numerator: 8, denominator: 8 },
    fourFourMappingPattern: 'D--D--T-',
    sixEightPattern: 'D---D-T-----',
    variations: [
      { notation: 'D-----D-----T---', timeSignature: { numerator: 8, denominator: 8 } },
      { notation: 'D-K-K-D-K-K-T-K-', note: '8/8 with ka ornaments', timeSignature: { numerator: 8, denominator: 8 } },
      { notation: 'D---K-D---K-T---', note: '8/8 quarter-note anchors', timeSignature: { numerator: 8, denominator: 8 } },
      { notation: 'D--D--T-', note: '2/4 variation', timeSignature: { numerator: 2, denominator: 4 } },
      { notation: 'DK-D--K-', note: '2/4 ornamented variation', timeSignature: { numerator: 2, denominator: 4 } },
    ],
    relatedRhythmIds: ['malfuf'],
  },
};
