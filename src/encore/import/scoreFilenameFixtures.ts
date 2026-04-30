/**
 * Golden fixtures for score (PDF / MusicXML / MIDI) filename parsing.
 *
 * Drawn from real-world filenames the user collects: MusicNotes exports,
 * Tunescribers exports, generic publisher exports, common karaoke / lead-sheet
 * naming conventions, and a few defensive edge cases. Add new entries here
 * when a real upload demonstrates a parser miss; the parser test enforces
 * stable behavior against the table.
 */
export interface ScoreFilenameGoldenFixture {
  id: string;
  raw: string;
  expectedTitle: string;
  /** Empty when the filename truly contains no artist signal. */
  expectedArtist?: string;
  /** Either "<root> major" or "<root> minor" matching ENCORE_PERFORMANCE_KEY_OPTIONS, or undefined. */
  expectedKey?: string;
  /** Optional show / source name for musical-theatre files. */
  expectedSourceShow?: string;
}

export const SCORE_FILENAME_GOLDEN_FIXTURES: ScoreFilenameGoldenFixture[] = [
  // ────────────────────────────────────────────────────────────────────────
  // MusicNotes exports — the dominant pattern in the user's library:
  //   "<Title> - <Key> [Major|Minor] - MN<id>[_U<n>].pdf"
  // and an artist-aware variant:
  //   "<Title> - <Artist> - <Key> [Major|Minor] - MN<id>.pdf"
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'musicnotes-basic-major',
    raw: 'All I Ask of You - Db Major - MN0118439.pdf',
    expectedTitle: 'All I Ask of You',
    expectedKey: 'Db major',
  },
  {
    id: 'musicnotes-basic-minor',
    raw: 'Always Remember Us This Way - A Minor - MN0190017.pdf',
    expectedTitle: 'Always Remember Us This Way',
    expectedKey: 'A minor',
  },
  {
    id: 'musicnotes-d-minor',
    raw: 'Back to Black - D Minor - MN0063919.pdf',
    expectedTitle: 'Back to Black',
    expectedKey: 'D minor',
  },
  {
    id: 'musicnotes-e-minor',
    raw: 'Because of You - E Minor - MN0050322.pdf',
    expectedTitle: 'Because of You',
    expectedKey: 'E minor',
  },
  {
    id: 'musicnotes-f-major',
    raw: 'Blank Space - F Major - MN0142241.pdf',
    expectedTitle: 'Blank Space',
    expectedKey: 'F major',
  },
  {
    id: 'musicnotes-b-minor',
    raw: 'Burn - B Minor - MN0161860.pdf',
    expectedTitle: 'Burn',
    expectedKey: 'B minor',
  },
  {
    id: 'musicnotes-flat-major',
    raw: "Don't Cry for Me Argentina - Db Major - MN0109540.pdf",
    expectedTitle: "Don't Cry for Me Argentina",
    expectedKey: 'Db major',
  },
  {
    id: 'musicnotes-bb-major',
    raw: 'drivers license - Bb Major - MN0225974.pdf',
    expectedTitle: 'drivers license',
    expectedKey: 'Bb major',
  },
  {
    id: 'musicnotes-gb-major',
    raw: 'exile - Gb Major - MN0214755.pdf',
    expectedTitle: 'exile',
    expectedKey: 'Gb major',
  },
  {
    id: 'musicnotes-a-major',
    raw: 'Fast Car - A Major - MN0063567.pdf',
    expectedTitle: 'Fast Car',
    expectedKey: 'A major',
  },
  {
    id: 'musicnotes-eb-major',
    raw: 'I Dreamed a Dream - Eb Major - MN0198086.pdf',
    expectedTitle: 'I Dreamed a Dream',
    expectedKey: 'Eb major',
  },
  {
    id: 'musicnotes-with-artist-segment',
    raw: 'Kaleidoscope - Chappell Roan - B Major - MN0292352.pdf',
    expectedTitle: 'Kaleidoscope',
    expectedArtist: 'Chappell Roan',
    expectedKey: 'B major',
  },
  {
    id: 'musicnotes-f-minor',
    raw: 'Let It Go - F Minor - MN0133533.pdf',
    expectedTitle: 'Let It Go',
    expectedKey: 'F minor',
  },
  {
    id: 'musicnotes-bb-major-make-you-feel',
    raw: 'Make You Feel My Love - Bb Major - MN0076745.pdf',
    expectedTitle: 'Make You Feel My Love',
    expectedKey: 'Bb major',
  },
  {
    id: 'musicnotes-sharp-key',
    raw: 'Pink Pony Club - F# Major - MN0289853.pdf',
    expectedTitle: 'Pink Pony Club',
    expectedKey: 'F# major',
  },
  {
    id: 'musicnotes-revision-suffix',
    raw: 'She Used to Be Mine - F# Major - MN0157299_U1.pdf',
    expectedTitle: 'She Used to Be Mine',
    expectedKey: 'F# major',
  },
  {
    id: 'musicnotes-c-minor',
    raw: 'Sister Rosetta Goes Before Us - C Minor - MN0065485.pdf',
    expectedTitle: 'Sister Rosetta Goes Before Us',
    expectedKey: 'C minor',
  },
  {
    id: 'musicnotes-eb-major-next-right-thing',
    raw: 'The Next Right Thing - Eb Major - MN0204412.pdf',
    expectedTitle: 'The Next Right Thing',
    expectedKey: 'Eb major',
  },
  {
    id: 'musicnotes-vampire',
    raw: 'vampire - F Major - MN0276799.pdf',
    expectedTitle: 'vampire',
    expectedKey: 'F major',
  },
  {
    id: 'musicnotes-c-major-what-was-i-made-for',
    raw: 'What Was I Made For - C Major - MN0277382.pdf',
    expectedTitle: 'What Was I Made For',
    expectedKey: 'C major',
  },

  // ────────────────────────────────────────────────────────────────────────
  // Tunescribers — heavy underscore convention, "from <Show> Arr. Tunescribers - <Composer> <Voicing>"
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'tunescribers-death-note',
    raw:
      'Ill_Only_Love_You_More_from_Death_Note_The_Musical_Arr._Tunescribers_-_Jack_Murphy_Frank_N_Wildhorn_Piano_Vocal.pdf',
    expectedTitle: "Ill Only Love You More",
    expectedArtist: 'Jack Murphy, Frank N Wildhorn',
    expectedSourceShow: 'Death Note The Musical',
  },

  // ────────────────────────────────────────────────────────────────────────
  // Show / source after a dash:  "<Title> - <Show or Artist>.pdf"
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'show-after-dash',
    raw: 'Someone Like You - Jekyll & Hyde.pdf',
    expectedTitle: 'Someone Like You',
    expectedSourceShow: 'Jekyll & Hyde',
  },

  // ────────────────────────────────────────────────────────────────────────
  // Generic descriptor suffixes — strip "sheet music", "with Lyrics and Chords", etc.
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'sheet-music-suffix',
    raw: 'Someone Like You - sheet music.pdf',
    expectedTitle: 'Someone Like You',
  },
  {
    id: 'lyrics-and-chords-suffix',
    raw: 'Wish My Life Away with Lyrics and Chords.pdf',
    expectedTitle: 'Wish My Life Away',
  },
  {
    id: 'lead-sheet-suffix',
    raw: 'Defying Gravity - Lead Sheet.pdf',
    expectedTitle: 'Defying Gravity',
  },
  {
    id: 'piano-vocal-suffix',
    raw: 'Memory - Piano Vocal.pdf',
    expectedTitle: 'Memory',
  },
  {
    id: 'piano-solo-suffix',
    raw: 'Gravity - Piano Solo.pdf',
    expectedTitle: 'Gravity',
  },
  {
    id: 'pvg-suffix',
    raw: "Reflection (PVG).pdf",
    expectedTitle: 'Reflection',
  },

  // ────────────────────────────────────────────────────────────────────────
  // Defying Gravity / For Good / Memory / Heart of Stone — bare MusicNotes
  // (more samples to keep coverage broad on common keys)
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'musicnotes-defying-gravity',
    raw: 'Defying Gravity - Db Major - MN0104246.pdf',
    expectedTitle: 'Defying Gravity',
    expectedKey: 'Db major',
  },
  {
    id: 'musicnotes-for-good',
    raw: 'For Good - C Major - MN0152825.pdf',
    expectedTitle: 'For Good',
    expectedKey: 'C major',
  },
  {
    id: 'musicnotes-memory',
    raw: 'Memory - Bb Major - MN0066559.pdf',
    expectedTitle: 'Memory',
    expectedKey: 'Bb major',
  },
  {
    id: 'musicnotes-heart-of-stone',
    raw: 'Heart of Stone - F Major - MN0206856.pdf',
    expectedTitle: 'Heart of Stone',
    expectedKey: 'F major',
  },

  // ────────────────────────────────────────────────────────────────────────
  // Edge cases
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'underscores-only',
    raw: 'Make_You_Feel_My_Love.pdf',
    expectedTitle: 'Make You Feel My Love',
  },
  {
    id: 'bare-title',
    raw: 'Bare Title.pdf',
    expectedTitle: 'Bare Title',
  },
  {
    id: 'musicxml-extension',
    raw: 'On My Own - G Minor - MN0104325.musicxml',
    expectedTitle: 'On My Own',
    expectedKey: 'G minor',
  },
  {
    id: 'mxl-extension',
    raw: 'Reflection - A Major - MN0057034.mxl',
    expectedTitle: 'Reflection',
    expectedKey: 'A major',
  },
  {
    id: 'midi-extension',
    raw: 'Shallow - G Major - MN0189819.mid',
    expectedTitle: 'Shallow',
    expectedKey: 'G major',
  },
];
