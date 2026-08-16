import type { RhythmDefinition } from './presetDatabase';

/**
 * Middle Eastern and Kurdish rhythms.
 *
 * Kept apart from the rest of the database because these entries carry the weight: transliterated
 * alternate names in three scripts, citations to a specific printed source, and comments recording
 * how each pattern was decoded. Editing one of these means checking a source, not just a pattern.
 *
 * Every `name` here is CANONICAL and matches the owner's teachers' books. Descriptions refer to
 * rhythms by those canonical names only; other spellings belong in `alternateNames`, never in prose.
 */
export const MIDDLE_EASTERN_RHYTHMS: Record<string, RhythmDefinition> = {
  maqsum: {
    id: 'maqsum',
    name: 'Maqsum',
    description: 'One of the most common Middle Eastern rhythms.',
    alternateNames: [
      { name: 'Maqsoum', context: 'common transliteration', script: 'مقسوم' },
      { name: 'Maksum', context: 'common transliteration' },
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
    description: 'An Egyptian rhythm from the Sa\'id, in Upper Egypt.',
    alternateNames: [
      { name: "Sa'idi", context: 'common transliteration', script: 'صعيدي' },
      { name: 'Saidi', context: 'common transliteration' },
    ],
    usedIn: 'Egyptian song, baladi dance',
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
    description: 'A common Egyptian rhythm.',
    alternateNames: [
      { name: 'Masmudi Saghir', context: 'the little Masmudi, vs Masmudi Kabir' },
      { name: 'Beledi', context: 'common transliteration' },
    ],
    usedIn: 'Near Eastern Arabic vocal repertoire',
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
    description: 'Played across the Middle East.',
    alternateNames: [
      { name: 'Iqa Ayyub', context: 'Arabic iqa naming', script: 'إيقاع أيوب' },
      { name: 'Zar', context: 'Egypt, after the healing ceremony' },
      { name: 'Ayyub', context: 'common transliteration' },
    ],
    usedIn: 'Sufi music, Egyptian zar ceremonies, fast dance sections',
    learnMoreLinks: [
      { title: 'Iqa Ayyub 2/4 — Maqam World', url: 'https://www.maqamworld.com/en/iqaa/ayyub.php' },
      { title: '30 Pieces For Daf and Frame Drum — Amir School of Music', url: 'https://www.amirschoolofmusic.com/store/p/pdf-30-pieces-book-1' },
    ],
    basePattern: 'D--KD-T-',
    timeSignature: { numerator: 2, denominator: 4 },
    sixEightPattern: 'D--K--D-T---',
    variations: [
      { notation: 'D--KD-T-' },
      { notation: 'D-TKD-T-' },
      { notation: 'D-TKT-D-', note: 'La Bass Fe Eyne variation' },
      { notation: 'D-KKD-T-', note: 'Variation from 30 Pieces For Daf and Frame Drum (Amir School of Music)' },
    ],
    relatedRhythmIds: ['daem', 'helgertin'],
  },
  daem: {
    id: 'daem',
    name: 'Da-em',
    description: 'A daf maqam. Played slow for zikr, fast for dance.',
    alternateNames: [
      { name: "Da'em", context: 'Persian sources', script: 'دائم' },
      { name: 'Dayim', context: 'Kurdish sources', script: 'دایم' },
    ],
    usedIn: 'Kurdish Sufi daf, Persian daf schools',
    learnMoreLinks: [
      { title: 'Daff: A Sacred Symbol of Kurdish Culture and Spirituality — Kurdish Globe', url: 'https://kurdishglobe.krd/daff-a-sacred-symbol-of-kurdish-culture-and-spirituality/' },
      { title: 'مقام‌های دف (Daf maqams) — Persian Wikipedia', url: 'https://fa.wikipedia.org/wiki/%D9%85%D9%82%D8%A7%D9%85%E2%80%8C%D9%87%D8%A7%DB%8C_%D8%AF%D9%81' },
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
     * NOT a khanqah maqam, despite sitting beside them in the book. Kurdish Wikipedia lists
     * ھەڵگرتن under ڕیتمەکانی دەف (daf RHYTHMS) rather than مەقامەکان, and says outright that
     * calling these rhythms maqams is a mistake: "بەکارھێنانی وشەی مەقام بۆ ئەم ڕیتمانە ھەڵەیە".
     * They go with helperkê dance and weddings, not zikr.
     */
    description: 'A Kurdish daf rhythm. The name means to lift.',
    alternateNames: [
      { name: 'Helgirtin', context: 'Kurdish', script: 'ھەڵگرتن' },
      { name: 'Hal gertan', context: 'Persian sources, written as two words', script: 'هلگرتن' },
    ],
    usedIn: 'Kurdish helperkê dance, weddings',
    learnMoreLinks: [
      { title: 'مەقامەکانی دەف (Daf maqams) — Kurdish Wikipedia', url: 'https://ckb.wikipedia.org/wiki/%D9%85%DB%95%D9%82%D8%A7%D9%85%DB%95%DA%A9%D8%A7%D9%86%DB%8C_%D8%AF%DB%95%D9%81' },
      { title: '30 Pieces For Daf and Frame Drum — Amir School of Music', url: 'https://www.amirschoolofmusic.com/store/p/pdf-30-pieces-book-1' },
    ],
    /*
     * The book notates this as TWO 2/4 measures. The database represents a full cycle as ONE
     * measure — two invariants require it (`presetIntegrity`: variations must be exactly one
     * measure; `rhythmRecognition`: basePattern must appear among variations), and Maqsum already
     * follows the same convention for its 16-sixteenth cycle. The grid is identical either way:
     * 16 sixteenths is one 4/4 bar or two 2/4 bars. The felt pulse is still 2/4, which the
     * description says.
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
     * Distinct from Ghawsi (غەوسی, 2/8), which one widely-copied cassette of Seyid Ata Salamiya
     * mislabelled as Haddadi. Kurdish Wikipedia footnotes the error: "مەقامی غەوسی بە حەدادی ناو
     * ھێنراوە کە ئەم دوانە جیان لەیەک".
     */
    description: 'A daf maqam. Its two halves answer each other, low then high.',
    alternateNames: [{ name: 'Hedadi', context: 'Kurdish sources', script: 'حەدادی' }],
    usedIn: 'Kurdish Sufi daf, khanqah zikr',
    learnMoreLinks: [
      { title: 'مەقامەکانی دەف (Daf maqams) — Kurdish Wikipedia', url: 'https://ckb.wikipedia.org/wiki/%D9%85%DB%95%D9%82%D8%A7%D9%85%DB%95%DA%A9%D8%A7%D9%86%DB%8C_%D8%AF%DB%95%D9%81' },
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
    description: 'An additive rhythm grouped 3+3+2.',
    alternateNames: [
      { name: 'Malfouf', context: 'common transliteration', script: 'ملفوف' },
      { name: 'Laff', context: 'same root, to wrap', script: 'لفّ' },
    ],
    usedIn: 'Entrances and exits in Arabic dance, Turkish and Balkan 3+3+2 dances',
    learnMoreLinks: [
      { title: 'Iqa Malfuf 2/4 — Maqam World', url: 'https://www.maqamworld.com/en/iqaa/malfuf.php' },
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
    description: 'A 3+3+2 rhythm paired with Malfuf. Two dums where Malfuf has one.',
    alternateNames: [
      { name: 'Khaleeji', context: 'common transliteration, of the Gulf', script: 'خليجي' },
      { name: 'Khaleegy', context: 'spelling used for the dance' },
    ],
    usedIn: 'Gulf khaleegy dance and song',
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
