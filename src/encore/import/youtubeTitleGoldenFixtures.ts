/**
 * Shared golden strings for YouTube title parsing tests and get-artist-title spike.
 * @see parseYoutubeTitleGetArtistTitleSpike.test.ts for third-party library comparison notes.
 */
export interface YoutubeTitleGoldenFixture {
  id: string;
  raw: string;
  channel: string;
  encoreArtist: string;
  encoreSong: string;
}

export const YOUTUBE_TITLE_GOLDEN_FIXTURES: YoutubeTitleGoldenFixture[] = [
  {
    id: 'double-pipe',
    raw: "I'll Only Love You More (instrumental)||Death Note:The Musical",
    channel: 'Ch',
    encoreArtist: 'Death Note:The Musical',
    encoreSong: "I'll Only Love You More",
  },
  {
    id: 'wicked-karaoke-piano',
    raw: 'Wicked Defying Gravity karaoke piano',
    channel: 'Singer Buddy',
    encoreArtist: '',
    encoreSong: 'Wicked Defying Gravity',
  },
  {
    id: 'waitress-pipe',
    raw: 'She Used To Be Mine (Waitress) | Piano Accompaniment in F#/Gb | Broadway Key [Karaoke Lyrics in CC]',
    channel: 'The Accompanist',
    encoreArtist: 'Waitress',
    encoreSong: 'She Used To Be Mine',
  },
  {
    id: 'les-mis-karaoke',
    raw: 'Les Miserables - I Dreamed A Dream (Karaoke Version)',
    channel: 'Sing King',
    encoreArtist: 'Les Miserables',
    encoreSong: 'I Dreamed A Dream',
  },
  {
    id: 'phantom-quoted-from',
    raw: '"Wishing You Were Somehow Here Again" from The Phantom of the Opera - Karaoke Track with Lyrics',
    channel: 'CurtainUp Karaoke',
    encoreArtist: 'The Phantom of the Opera',
    encoreSong: 'Wishing You Were Somehow Here Again',
  },
  {
    id: 'on-my-own-smart-quotes',
    raw: '\u201cOn My Own\u201d (Karaoke) – Les Misérables | Lyrics on Screen',
    channel: 'CurtainUp Karaoke',
    encoreArtist: 'Les Misérables',
    encoreSong: 'On My Own',
  },
  {
    id: 'slash-karaoke-webber',
    raw: "Don't Cry for Me Argentina / Karaoke / Lloyd Webber / Original key",
    channel: 'Singer Buddy',
    encoreArtist: 'Lloyd Webber',
    encoreSong: "Don't Cry for Me Argentina",
  },
  {
    id: 'bracket-instrumental-reflection',
    raw: '[Original Key/ Instrumental] Reflection (From the movie "Mulan") Piano Instrumental/ with ENG lyrics',
    channel: 'Musical Theater Accompanist',
    encoreArtist: '',
    encoreSong: 'Reflection (From the movie "Mulan") Piano Instrumental/ with ENG lyrics',
  },
  {
    id: 'fun-home-quoted',
    raw: '"Days and Days" - Fun Home [Karaoke/Instrumental w/ Lyrics]',
    channel: 'EJM Instrumentals',
    encoreArtist: 'Fun Home',
    encoreSong: 'Days and Days',
  },
  {
    id: 'shallow-comma-artists',
    raw: 'Lady Gaga, Bradley Cooper - Shallow (A Star Is Born) (Karaoke Version)',
    channel: 'Sing King',
    encoreArtist: 'Lady Gaga, Bradley Cooper',
    encoreSong: 'Shallow (A Star Is Born)',
  },
  {
    id: 'tracy-chapman',
    raw: 'Tracy Chapman - Fast Car (Karaoke Version)',
    channel: 'Sing King',
    encoreArtist: 'Tracy Chapman',
    encoreSong: 'Fast Car',
  },
  {
    id: 'jekyll-quoted',
    raw: '"Someone Like You" from Jekyll and Hyde - Karaoke Track with Lyrics on Screen',
    channel: 'CurtainUp Karaoke',
    encoreArtist: 'Jekyll and Hyde',
    encoreSong: 'Someone Like You',
  },
  {
    id: 'adele-sing-king',
    raw: 'Adele - Someone Like You (Karaoke Version)',
    channel: 'Sing King',
    encoreArtist: 'Adele',
    encoreSong: 'Someone Like You',
  },
  {
    id: 'six-heart-of-stone',
    raw: '"Heart of Stone" (Karaoke) – Six: The Musical | Lyrics on Screen',
    channel: 'CurtainUp Karaoke',
    encoreArtist: 'Six: The Musical',
    encoreSong: 'Heart of Stone',
  },
  {
    id: 'karaoke-memory-unknown',
    raw: 'Karaoke Memory YouTube 2',
    channel: 'Roland Soh',
    encoreArtist: '',
    encoreSong: 'Karaoke Memory YouTube 2',
  },
];
