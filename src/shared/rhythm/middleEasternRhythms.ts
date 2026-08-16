import type { RhythmDefinition } from './presetDatabase';

/**
 * Middle Eastern and Kurdish rhythms.
 *
 * Kept apart from the rest of the database because these entries carry the weight: alternate names
 * across several traditions, citations to a specific printed source, and comments recording how
 * each pattern was decoded. Editing one of these means checking a source, not just a pattern.
 *
 * Four rules for the user-facing text here:
 *
 * 1. **English only.** No Arabic, Persian or Kurdish script anywhere the reader sees it — the owner
 *    does not read those scripts and will not publish text she cannot verify. Script belongs in
 *    these comments, where it is provenance for the next editor, and it is glossed every time.
 * 2. **Assume no background.** The reader has never heard of a daf, a zikr or a maqam. Any term
 *    that is not plain English gets explained in the same sentence, or is cut.
 * 3. **Claim only what is checkable.** Every sentence must be either arithmetic anyone can do
 *    against the pattern above it, or a near-paraphrase of a source in `learnMoreLinks`. The owner
 *    is a student of this music, not an authority on it, and would rather the app say less than
 *    say something she cannot stand behind. When a fact is interesting but unverified, it goes in
 *    a comment here, not in the copy. Cut, do not hedge.
 * 4. **No usage in the description.** `usedIn` carries it. The two render one under the other, so
 *    saying it twice is visible at a glance.
 *
 * Every `name` is CANONICAL and matches the owner's teachers' books. Descriptions refer to rhythms
 * by those names only; other spellings belong in `alternateNames`, never in prose. Where a source
 * disagrees with the books, the books win in the copy and the disagreement is recorded here.
 */
export const MIDDLE_EASTERN_RHYTHMS: Record<string, RhythmDefinition> = {
  maqsum: {
    id: 'maqsum',
    name: 'Maqsum',
    // Near-quote of Maqam World: "by far the most widely used iqa' in Arabic music."
    description: 'The most widely used rhythm in Arabic music.',
    alternateNames: [
      { name: 'Maqsoum', context: 'common spelling' },
      { name: 'Maksum', context: 'common spelling' },
    ],
    usedIn: 'Egyptian and Arabic pop, belly dance',
    learnMoreLinks: [
      { title: 'Maqam World: Maqsum 4/4', url: 'https://www.maqamworld.com/en/iqaa/maqsum.php' },
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
    /*
     * Both sentences are checkable: Maqam World calls it "quintessentially Egyptian, from the
     * Sa'id region", English Wikipedia defines Upper Egypt as the Nile valley south of the delta,
     * and the stroke contrast is arithmetic — Saeidi has D at ticks 7 and 9 where Maqsum has T
     * then D.
     */
    description:
      'A rhythm from Upper Egypt, the southern stretch of the Nile valley. Two low strokes in ' +
      'the middle of the bar, where Maqsum has one.',
    alternateNames: [
      { name: "Sa'idi", context: 'common spelling' },
      { name: 'Saidi', context: 'common spelling' },
    ],
    usedIn: 'Egyptian folk song, belly dance',
    learnMoreLinks: [
      { title: "Maqam World: Sa'idi 4/4", url: 'https://www.maqamworld.com/en/iqaa/saidi.php' },
    ],
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
    /*
     * "Of the homeland" was cut: Wikipedia glosses the adjective as "of town, local, comparable to
     * English folk", and notes a rural, lower-class connotation. "Homeland" reads patriotic, which
     * is close to the opposite register.
     */
    description:
      'An Egyptian rhythm whose name means "local". It opens with two low strokes where Maqsum ' +
      'opens with a low and a high.',
    alternateNames: [
      // Maqam World: saghir is "little", distinguishing it from the longer Masmudi Kabir. A size
      // contrast, not an age one - no source calls this the older name.
      { name: 'Masmudi Saghir', context: 'the small Masmudi, beside the longer Masmudi Kabir' },
      { name: 'Beledi', context: 'common spelling' },
    ],
    usedIn: 'Egyptian song, belly dance',
    learnMoreLinks: [
      { title: 'Maqam World: Baladi 4/4', url: 'https://www.maqamworld.com/en/iqaa/baladi.php' },
      { title: 'Wikipedia: Baladi', url: 'https://en.wikipedia.org/wiki/Baladi' },
    ],
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
    /*
     * This entry used to say: "Slow, it accompanies an Egyptian ceremony held to heal illness.
     * Fast, it drives the peak of a dance." Every clause of that was wrong, and the source it
     * cited says so:
     *
     * - Maqam World: "Ayyub's feel is RAPID, short and cyclical." There is no slow/fast split.
     * - Maqam World: Ayyub "is sometimes called Zar in Egypt, AFTER a folk healing ceremony led by
     *   women." The rhythm is named after the ceremony; it is not the ceremony's rhythm, and other
     *   sources note the zar uses many rhythms.
     * - The zar is not Egyptian. English Wikipedia places it across the Horn of Africa and the
     *   Middle East - Ethiopia, Egypt, Sudan, Somalia, Iran, Oman, Yemen.
     * - It does not "heal illness". Wikipedia calls the rite adorcism, says exorcism is "falsely
     *   attributed", describes it as reconciling the possessing spirit with the possessed, and
     *   notes possession is often lifelong.
     *
     * The description now paraphrases only the Maqam World sentence on usage. The Zar connection
     * survives as what it actually is: a nickname, in `alternateNames`.
     */
    description: 'A short two-beat rhythm that cycles quickly.',
    alternateNames: [
      { name: 'Ayyub', context: 'common spelling' },
      { name: 'Zar', context: 'a nickname in Egypt, after a ceremony of that name' },
    ],
    usedIn: 'Sufi music, folk music, belly dance',
    learnMoreLinks: [
      { title: 'Maqam World: Ayyub 2/4', url: 'https://www.maqamworld.com/en/iqaa/ayyub.php' },
      { title: 'Amir School of Music: 30 Pieces For Daf and Frame Drum', url: 'https://www.amirschoolofmusic.com/store/p/pdf-30-pieces-book-1' },
    ],
    basePattern: 'D--KD-T-',
    timeSignature: { numerator: 2, denominator: 4 },
    sixEightPattern: 'D--K--D-T---',
    variations: [
      { notation: 'D--KD-T-' },
      { notation: 'D-TKD-T-' },
      { notation: 'D-TKT-D-', note: 'From the song "La Bass Fe Eyne"' },
      { notation: 'D-KKD-T-', note: 'From 30 Pieces For Daf and Frame Drum (Amir School of Music)' },
    ],
    relatedRhythmIds: ['daem', 'helgertin'],
  },
  daem: {
    id: 'daem',
    name: 'Da-em',
    /*
     * Two changes made for accuracy:
     *
     * - The daf is no longer called only Kurdish. English Wikipedia opens "the daf is an Iranian
     *   frame drum"; Kurdish Globe claims it as Kurdish. This entry's own `usedIn` and alternate
     *   names already named both, so the description was the one place contradicting them.
     * - Cut "played slow for zikr, fast for dance". No source at any tier could be found for it.
     *   It may well be how the book teaches it, but the book is not to hand to quote.
     *
     * The etymology is Tier-1 for the WORD (Wiktionary: lasting, enduring, perpetual, constant).
     * No source ties the word to the rhythm name, so the copy says the name comes from a word
     * meaning that, which is exactly what is known.
     */
    description:
      'A traditional piece for the daf, the large frame drum of Kurdish and Iranian music, ' +
      'strung with metal rings. The name comes from a word meaning "constant".',
    alternateNames: [
      { name: "Da'em", context: 'also spelled' },
      { name: 'Dayim', context: 'also spelled' },
    ],
    usedIn: 'Kurdish and Iranian frame drumming, Sufi gatherings',
    learnMoreLinks: [
      { title: 'Kurdish Globe: Daff, a sacred symbol of Kurdish culture', url: 'https://kurdishglobe.krd/daff-a-sacred-symbol-of-kurdish-culture-and-spirituality/' },
      { title: 'Persian Wikipedia: daf pieces', url: 'https://fa.wikipedia.org/wiki/%D9%85%D9%82%D8%A7%D9%85%E2%80%8C%D9%87%D8%A7%DB%8C_%D8%AF%D9%81' },
      { title: 'Amir School of Music: 30 Pieces For Daf and Frame Drum', url: 'https://www.amirschoolofmusic.com/store/p/pdf-30-pieces-book-1' },
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
     * The dance link comes from that same Kurdish Wikipedia article and is attributed in the copy
     * rather than asserted, because a second research pass could not corroborate it anywhere else.
     * "Line dance" was wrong: English Wikipedia describes Kurdish dance as "a form of a circle
     * dance". Sources also differ on whether helperke names one dance or Kurdish communal dancing
     * generally, so the copy commits to neither. The wedding claim was cut for the same reason.
     *
     * The etymology is solid - Kurdish Wiktionary gives hilgirtin as "to lift, to raise".
     */
    description:
      'A daf piece whose name comes from a word meaning "to lift". Kurdish sources connect it to ' +
      'helperke, a form of circle dancing.',
    alternateNames: [
      { name: 'Helgirtin', context: 'Kurdish spelling' },
      { name: 'Hal gerten', context: 'Persian spelling, written as two words' },
    ],
    usedIn: 'Kurdish frame drumming, circle dancing',
    learnMoreLinks: [
      { title: 'Kurdish Wikipedia: daf pieces', url: 'https://ckb.wikipedia.org/wiki/%D9%85%DB%95%D9%82%D8%A7%D9%85%DB%95%DA%A9%D8%A7%D9%86%DB%8C_%D8%AF%DB%95%D9%81' },
      { title: 'Wikipedia: Kurdish dance', url: 'https://en.wikipedia.org/wiki/Kurdish_dance' },
      { title: 'Amir School of Music: 30 Pieces For Daf and Frame Drum', url: 'https://www.amirschoolofmusic.com/store/p/pdf-30-pieces-book-1' },
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
    variations: [{ notation: 'D-TKD-T-TTK-D-T-' }],
    relatedRhythmIds: ['daem', 'haddadi', 'ayoub'],
  },
  haddadi: {
    id: 'haddadi',
    name: 'Haddadi',
    /*
     * Distinct from Ghawsi (2/8), which one widely-copied cassette of Seyid Ata Salamiya
     * mislabelled as Haddadi. Kurdish Wikipedia footnotes the error, glossing to: "the Ghawsi
     * maqam has been called Haddadi, but the two are separate".
     *
     * The description says "led by" rather than "low then high" because the halves are DDK and
     * TTK - each ends on the same light rim stroke, so only the leading strokes differ.
     *
     * No etymology is claimed. Haddad means blacksmith, but nothing found connects that to the
     * rhythm, so the copy stays quiet about it.
     */
    description: 'A daf piece in two halves: the first led by low strokes, the second by high.',
    alternateNames: [{ name: 'Hedadi', context: 'Kurdish spelling' }],
    usedIn: 'Kurdish frame drumming, Sufi gatherings',
    learnMoreLinks: [
      { title: 'Kurdish Wikipedia: daf pieces', url: 'https://ckb.wikipedia.org/wiki/%D9%85%DB%95%D9%82%D8%A7%D9%85%DB%95%DA%A9%D8%A7%D9%86%DB%8C_%D8%AF%DB%95%D9%81' },
      { title: 'Kurdish Globe: Daff, a sacred symbol of Kurdish culture', url: 'https://kurdishglobe.krd/daff-a-sacred-symbol-of-kurdish-culture-and-spirituality/' },
      { title: 'Amir School of Music: 30 Pieces For Daf and Frame Drum', url: 'https://www.amirschoolofmusic.com/store/p/pdf-30-pieces-book-1' },
    ],
    basePattern: 'DDK-TTK-',
    timeSignature: { numerator: 2, denominator: 4 },
    variations: [{ notation: 'DDK-TTK-' }],
    relatedRhythmIds: ['daem', 'helgertin'],
  },
  malfuf: {
    id: 'malfuf',
    name: 'Malfuf',
    /*
     * Etymology is Tier-1: Wiktionary derives malfuf from the passive participle of laffa, "to
     * wrap". Not folk etymology.
     *
     * NOTE ON METER: every source consulted labels Malfuf 2/4, not 8/8 - Maqam World, taqs.im,
     * oudforguitarists and three others. The 3+3+2 is a subdivision inside an even duple meter,
     * not an additive meter. This entry keeps 8/8 because `timeSignature` drives playback,
     * variation filtering and the picker, so changing it is a behaviour change rather than a copy
     * fix. Raised with the owner; not changed unilaterally.
     */
    description:
      'An Arabic rhythm of eight counts grouped 3+3+2. The name comes from a word meaning ' +
      '"wrapped".',
    alternateNames: [
      { name: 'Malfouf', context: 'common spelling' },
      { name: 'Laff', context: 'from the same root, meaning to wrap' },
    ],
    usedIn: 'Arabic dance entrances and exits',
    learnMoreLinks: [
      { title: 'Maqam World: Malfuf 2/4', url: 'https://www.maqamworld.com/en/iqaa/malfuf.php' },
    ],
    basePattern: 'D-----T-----T---',
    timeSignature: { numerator: 8, denominator: 8 },
    fourFourMappingPattern: 'D--T--T-',
    sixEightPattern: 'D---T-D---T-',
    variations: [
      { notation: 'D-----T-----T---', timeSignature: { numerator: 8, denominator: 8 } },
      { notation: 'D-K-K-T-K-K-T-K-', note: 'With extra light strokes', preservesReferenceBackbone: true, timeSignature: { numerator: 8, denominator: 8 } },
      { notation: 'D---K-T---K-T---', note: 'On the quarter notes', preservesReferenceBackbone: true, timeSignature: { numerator: 8, denominator: 8 } },
      { notation: 'D--T--T-', note: 'In 2/4', timeSignature: { numerator: 2, denominator: 4 } },
      { notation: 'D-KT-KT-', note: 'In 2/4, ornamented', timeSignature: { numerator: 2, denominator: 4 } },
      { notation: 'DKKTKKTK', note: 'In 2/4, dense', timeSignature: { numerator: 2, denominator: 4 } },
    ],
    relatedRhythmIds: ['kahleegi'],
  },
  kahleegi: {
    id: 'kahleegi',
    name: 'Kahleegi',
    /*
     * "Persian Gulf" was cut twice over. Wiktionary gives khalij as "gulf, bay" generically, and
     * English Wikipedia glosses the dance name as literally "gulf" - so "of the Gulf" is the
     * translation and "Persian" is an addition. It also drags a live naming dispute into a
     * description of an Arab tradition, where speakers say the Arab Gulf.
     *
     * "One of several" is deliberate: Maqam World's index of 47 iqa'at has no Khaleeji entry, and
     * sources say each Gulf region has its own. Claiming a single canonical Kahleegi rhythm would
     * be more than is known.
     *
     * Same meter note as Malfuf - sources say 2/4; 8/8 kept because it drives behaviour.
     */
    description:
      'One of several rhythms from the Gulf. It uses the same 3+3+2 grouping as Malfuf, with two ' +
      'low strokes where Malfuf has one.',
    alternateNames: [
      { name: 'Khaleeji', context: 'common spelling; means "of the Gulf"' },
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
      { notation: 'D-K-K-D-K-K-T-K-', note: 'With extra light strokes', preservesReferenceBackbone: true, timeSignature: { numerator: 8, denominator: 8 } },
      { notation: 'D---K-D---K-T---', note: 'On the quarter notes', preservesReferenceBackbone: true, timeSignature: { numerator: 8, denominator: 8 } },
      { notation: 'D--D--T-', note: 'In 2/4', timeSignature: { numerator: 2, denominator: 4 } },
      { notation: 'DK-D--K-', note: 'In 2/4, ornamented', timeSignature: { numerator: 2, denominator: 4 } },
    ],
    relatedRhythmIds: ['malfuf'],
  },
};
