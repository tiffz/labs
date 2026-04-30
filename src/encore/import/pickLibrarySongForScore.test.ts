import { describe, expect, it } from 'vitest';
import { parseScoreFilename } from './parseScoreFilename';
import { pickLibrarySongForScore } from './pickLibrarySongForScore';
import { SCORE_FILENAME_GOLDEN_FIXTURES } from './scoreFilenameFixtures';
import type { EncoreSong } from '../types';

function lib(items: ReadonlyArray<{ id: string; title: string; artist?: string }>): EncoreSong[] {
  return items.map(({ id, title, artist }) => ({
    id,
    title,
    artist: artist ?? '',
    journalMarkdown: '',
    createdAt: '',
    updatedAt: '',
  }));
}

describe('pickLibrarySongForScore — auto-pair via parsed score', () => {
  const library = lib([
    { id: 'song-aiyou', title: 'All I Ask of You' },
    { id: 'song-arutw', title: 'Always Remember Us This Way', artist: 'Lady Gaga' },
    { id: 'song-fast-car', title: 'Fast Car', artist: 'Tracy Chapman' },
    { id: 'song-blank-space', title: 'Blank Space', artist: 'Taylor Swift' },
    { id: 'song-burn', title: 'Burn', artist: 'Hamilton' },
    { id: 'song-memory', title: 'Memory' },
    { id: 'song-defying-gravity', title: 'Defying Gravity' },
    { id: 'song-for-good', title: 'For Good' },
    { id: 'song-on-my-own', title: 'On My Own' },
    { id: 'song-shallow', title: 'Shallow' },
    { id: 'song-she-used', title: 'She Used to Be Mine' },
    { id: 'song-some-like-you', title: 'Someone Like You', artist: 'Adele' },
    { id: 'song-vampire', title: 'vampire', artist: 'Olivia Rodrigo' },
    { id: 'song-pink-pony-club', title: 'Pink Pony Club', artist: 'Chappell Roan' },
    { id: 'song-kaleidoscope', title: 'Kaleidoscope', artist: 'Chappell Roan' },
    { id: 'song-back-to-black', title: 'Back to Black', artist: 'Amy Winehouse' },
    { id: 'song-because-of-you', title: 'Because of You', artist: 'Kelly Clarkson' },
    { id: 'song-drivers-license', title: 'drivers license', artist: 'Olivia Rodrigo' },
    { id: 'song-exile', title: 'exile', artist: 'Taylor Swift' },
    { id: 'song-let-it-go', title: 'Let It Go', artist: 'Idina Menzel' },
    { id: 'song-make-you-feel', title: 'Make You Feel My Love', artist: 'Adele' },
    { id: 'song-jar-of-hearts', title: 'Jar of Hearts', artist: 'Christina Perri' },
    { id: 'song-i-dreamed', title: 'I Dreamed a Dream' },
    { id: 'song-heart-of-stone', title: 'Heart of Stone' },
    { id: 'song-reflection', title: 'Reflection' },
    { id: 'song-what-was-i', title: 'What Was I Made For', artist: 'Billie Eilish' },
    { id: 'song-next-right-thing', title: 'The Next Right Thing' },
    { id: 'song-iloveyou-more', title: "I'll Only Love You More" },
    { id: 'song-sister-rosetta', title: 'Sister Rosetta Goes Before Us' },
    { id: 'song-dontcry', title: "Don't Cry for Me Argentina" },
    { id: 'song-my-immortal', title: 'My Immortal', artist: 'Evanescence' },
  ]);

  for (const fx of SCORE_FILENAME_GOLDEN_FIXTURES) {
    /* Skip generic, non-library-aware fixtures (no library counterpart in the fake table). */
    const expectedTitleLc = fx.expectedTitle.toLowerCase();
    const target = library.find((s) => s.title.toLowerCase() === expectedTitleLc);
    if (!target) continue;

    it(`auto-pairs "${fx.raw}" → "${target.title}"`, () => {
      const parsed = parseScoreFilename(fx.raw);
      const picked = pickLibrarySongForScore(library, parsed);
      expect(picked?.id).toBe(target.id);
    });
  }

  it('returns null when nothing in the library is similar enough', () => {
    const parsed = parseScoreFilename('Random Obscure B-Side - C Major - MN0099999.pdf');
    const picked = pickLibrarySongForScore(library, parsed);
    expect(picked).toBeNull();
  });

  it('does not over-pair on a single-token-name collision', () => {
    /* "Burn" parsed should match "Burn" (Hamilton) over "Back to Black"; this
       checks the substring + dice + boost combo. */
    const parsed = parseScoreFilename('Burn - B Minor - MN0161860.pdf');
    const picked = pickLibrarySongForScore(library, parsed);
    expect(picked?.id).toBe('song-burn');
  });

  it('uses the artist segment as a tiebreaker', () => {
    /* Two "Kaleidoscope"-titled hypothetical songs would be rare, but if our
       library had two close matches, the artist boost helps. */
    const localLib = lib([
      { id: 'a', title: 'Kaleidoscope', artist: 'Coldplay' },
      { id: 'b', title: 'Kaleidoscope', artist: 'Chappell Roan' },
    ]);
    const parsed = parseScoreFilename('Kaleidoscope - Chappell Roan - B Major - MN0292352.pdf');
    const picked = pickLibrarySongForScore(localLib, parsed);
    expect(picked?.id).toBe('b');
  });
});
