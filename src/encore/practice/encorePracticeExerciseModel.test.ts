import { describe, expect, it } from 'vitest';
import type { EncoreLyricsInOwnWordsExerciseRun, EncoreSong } from '../types';
import {
  characterNineAnswerPlainText,
  characterNineAnswerToEditorHtml,
  effectiveLyricsSections,
  effectiveGeniusLyricsSource,
  formatExerciseRunSummary,
  getSingleRunForKind,
  lyricsRewriteProgressFromSections,
  markExerciseRunCompleted,
  applyPositionalLyricsFallback,
  mergeParsedNarrativeSectionsWithExisting,
  mergeParsedSectionsWithExisting,
  newLyricsInOwnWordsRun,
  newLyricsSectionNarrativeRun,
  nineQuestionsProgress,
  parseGeniusLyricsIntoSections,
  removeRunForKind,
  serializeLyricsSectionsToRaw,
  setSingleRunForKind,
  touchExerciseRun,
} from './encorePracticeExerciseModel';

function blankSong(): EncoreSong {
  return {
    id: 's1',
    title: 'My Immortal',
    artist: 'Evanescence',
    journalMarkdown: '',
    createdAt: '1',
    updatedAt: '1',
  };
}

describe('parseGeniusLyricsIntoSections', () => {
  it('returns empty array for empty / whitespace input', () => {
    expect(parseGeniusLyricsIntoSections('')).toEqual([]);
    expect(parseGeniusLyricsIntoSections('   \n\n  ')).toEqual([]);
  });

  it('treats unlabeled lines as a single anonymous section', () => {
    const out = parseGeniusLyricsIntoSections('first\nsecond\n\nthird');
    expect(out).toHaveLength(1);
    expect(out[0]?.title).toBe('');
    expect(out[0]?.lines.map((l) => l.original)).toEqual(['first', 'second', 'third']);
    expect(out[0]?.lines.every((l) => l.rewrite === '')).toBe(true);
  });

  it('parses Genius-format headers and groups lines under them', () => {
    const raw = `[Verse 1]
I'm so tired of being here
And it won't leave me alone

[Pre-Chorus]
These wounds won't seem to heal
This pain is just too real

[Chorus]
When you cried, I'd wipe away all of your tears
But you still have all of me`;
    const out = parseGeniusLyricsIntoSections(raw);
    expect(out.map((s) => s.title)).toEqual(['Verse 1', 'Pre-Chorus', 'Chorus']);
    expect(out[0]?.lines.map((l) => l.original)).toEqual([
      "I'm so tired of being here",
      "And it won't leave me alone",
    ]);
    expect(out[1]?.lines).toHaveLength(2);
    expect(out[2]?.lines).toHaveLength(2);
  });

  it('keeps duplicate-titled sections as separate ordered entries', () => {
    const raw = `[Chorus]
A
B
[Bridge]
C
[Chorus]
A
B`;
    const out = parseGeniusLyricsIntoSections(raw);
    expect(out.map((s) => s.title)).toEqual(['Chorus', 'Bridge', 'Chorus']);
    expect(out[0]?.lines).toHaveLength(2);
    expect(out[2]?.lines).toHaveLength(2);
  });

  it('preserves complex labels like "[Verse 1: feat. Amy Lee]"', () => {
    const out = parseGeniusLyricsIntoSections('[Verse 1: feat. Amy Lee]\nhi');
    expect(out[0]?.title).toBe('Verse 1: feat. Amy Lee');
  });

  it('does not treat a lyric line containing brackets as a header', () => {
    const out = parseGeniusLyricsIntoSections('[Chorus]\nshe said [whispered] goodbye');
    expect(out[0]?.title).toBe('Chorus');
    expect(out[0]?.lines[0]?.original).toBe('she said [whispered] goodbye');
  });

  it('handles consecutive headers with no blank line between them', () => {
    const raw = `[Pre-Chorus]
hi
[Chorus]
yo`;
    const out = parseGeniusLyricsIntoSections(raw);
    expect(out).toHaveLength(2);
    expect(out[0]?.title).toBe('Pre-Chorus');
    expect(out[1]?.title).toBe('Chorus');
  });
});

describe('serializeLyricsSectionsToRaw', () => {
  it('round-trips parse → serialize → parse for a typical Genius paste', () => {
    const raw = `[Verse 1]
I'm so tired of being here
And it won't leave me alone

[Chorus]
When you cried, I'd wipe away all of your tears`;
    const parsed = parseGeniusLyricsIntoSections(raw);
    const again = parseGeniusLyricsIntoSections(serializeLyricsSectionsToRaw(parsed));
    expect(again).toEqual(parsed);
  });

  it('keeps duplicate-titled sections in order through serialize', () => {
    const raw = `[Chorus]
A
B
[Bridge]
C
[Chorus]
A
B`;
    const parsed = parseGeniusLyricsIntoSections(raw);
    expect(parseGeniusLyricsIntoSections(serializeLyricsSectionsToRaw(parsed))).toEqual(parsed);
  });

  it('returns empty string for empty sections', () => {
    expect(serializeLyricsSectionsToRaw([])).toBe('');
  });

  it('emits a header line only for titled sections', () => {
    const sections = [{ title: '', lines: [{ original: 'one', rewrite: '' }, { original: 'two', rewrite: '' }] }];
    expect(serializeLyricsSectionsToRaw(sections)).toBe('one\ntwo');
  });
});

describe('mergeParsedSectionsWithExisting', () => {
  it('preserves rewrites when re-parsing the same lyrics', () => {
    const existing = [
      {
        title: 'Verse 1',
        lines: [
          { original: "I'm so tired of being here", rewrite: 'exhausted' },
          { original: "And it won't leave me alone", rewrite: '' },
        ],
      },
    ];
    const parsed = parseGeniusLyricsIntoSections(
      "[Verse 1]\nI'm so tired of being here\nAnd it won't leave me alone",
    );
    const merged = mergeParsedSectionsWithExisting(parsed, existing);
    expect(merged[0]?.lines[0]?.rewrite).toBe('exhausted');
    expect(merged[0]?.lines[1]?.rewrite).toBe('');
  });

  it('aligns repeated sections by occurrence index, not just title', () => {
    const existing = [
      { title: 'Chorus', lines: [{ original: 'A', rewrite: 'first-A' }] },
      { title: 'Chorus', lines: [{ original: 'A', rewrite: 'second-A' }] },
    ];
    const parsed = [
      { title: 'Chorus', lines: [{ original: 'A', rewrite: '' }] },
      { title: 'Chorus', lines: [{ original: 'A', rewrite: '' }] },
    ];
    const merged = mergeParsedSectionsWithExisting(parsed, existing);
    expect(merged[0]?.lines[0]?.rewrite).toBe('first-A');
    expect(merged[1]?.lines[0]?.rewrite).toBe('second-A');
  });

  it('drops rewrites whose original line no longer exists', () => {
    const existing = [
      {
        title: 'Verse 1',
        lines: [{ original: 'old line', rewrite: 'old rewrite' }],
      },
    ];
    const parsed = [
      { title: 'Verse 1', lines: [{ original: 'new line', rewrite: '' }] },
    ];
    const merged = mergeParsedSectionsWithExisting(parsed, existing);
    expect(merged[0]?.lines[0]?.rewrite).toBe('');
  });

  it('returns empty array when parsed is empty even if existing has content', () => {
    const existing = [{ title: 'Verse 1', lines: [{ original: 'x', rewrite: 'y' }] }];
    expect(mergeParsedSectionsWithExisting([], existing)).toEqual([]);
  });
});

describe('mergeParsedNarrativeSectionsWithExisting', () => {
  it('aligns narratives by section title occurrence', () => {
    const parsed = parseGeniusLyricsIntoSections('[A]\nx\n[B]\ny\n[A]\nz');
    const existing = [
      { title: 'A', narrative: 'first-a' },
      { title: 'B', narrative: 'b' },
      { title: 'A', narrative: 'second-a' },
    ];
    const merged = mergeParsedNarrativeSectionsWithExisting(parsed, existing);
    expect(merged).toHaveLength(3);
    expect(merged[0]?.narrative).toBe('first-a');
    expect(merged[1]?.narrative).toBe('b');
    expect(merged[2]?.narrative).toBe('second-a');
  });
});

describe('applyPositionalLyricsFallback', () => {
  it('copies rewrites by line index when originals change but section shape matches', () => {
    const existing = [
      {
        title: 'Verse 1',
        lines: [
          { original: 'old one', rewrite: 'r1' },
          { original: 'old two', rewrite: 'r2' },
        ],
      },
    ];
    const parsed = parseGeniusLyricsIntoSections('[Verse 1]\nnew one\nnew two');
    const merged = mergeParsedSectionsWithExisting(parsed, existing);
    expect(merged[0]?.lines[0]?.rewrite).toBe('');
    const withF = applyPositionalLyricsFallback(merged, existing);
    expect(withF[0]?.lines[0]?.rewrite).toBe('r1');
    expect(withF[0]?.lines[1]?.rewrite).toBe('r2');
  });

  it('does not apply when line counts differ', () => {
    const existing = [{ title: 'V', lines: [{ original: 'a', rewrite: 'x' }] }];
    const parsed = [{ title: 'V', lines: [{ original: 'b', rewrite: '' }, { original: 'c', rewrite: '' }] }];
    const merged = mergeParsedSectionsWithExisting(parsed, existing);
    const withF = applyPositionalLyricsFallback(merged, existing);
    expect(withF[0]?.lines[0]?.rewrite).toBe('');
  });
});

describe('effectiveLyricsSections', () => {
  it('returns sections directly when present', () => {
    const run: EncoreLyricsInOwnWordsExerciseRun = {
      ...newLyricsInOwnWordsRun(),
      sections: [{ title: 'Verse 1', lines: [{ original: 'a', rewrite: 'b' }] }],
    };
    expect(effectiveLyricsSections(run)[0]?.title).toBe('Verse 1');
  });

  it('normalizes legacy `lines`-only runs into one anonymous section', () => {
    const run: EncoreLyricsInOwnWordsExerciseRun = {
      ...newLyricsInOwnWordsRun(),
      sections: undefined,
      lines: [{ original: 'legacy line', rewrite: 'legacy rewrite' }],
    };
    const out = effectiveLyricsSections(run);
    expect(out).toHaveLength(1);
    expect(out[0]?.title).toBe('');
    expect(out[0]?.lines[0]?.rewrite).toBe('legacy rewrite');
  });

  it('returns empty array for fresh / empty runs', () => {
    expect(effectiveLyricsSections(newLyricsInOwnWordsRun())).toEqual([]);
  });
});

describe('lyricsRewriteProgressFromSections', () => {
  it('counts non-empty rewrites across all sections', () => {
    const sections = [
      {
        title: 'Verse 1',
        lines: [
          { original: 'a', rewrite: 'x' },
          { original: 'b', rewrite: '' },
        ],
      },
      {
        title: 'Chorus',
        lines: [{ original: 'c', rewrite: 'y' }],
      },
    ];
    expect(lyricsRewriteProgressFromSections(sections)).toEqual({ done: 2, total: 3 });
  });

  it('treats whitespace-only rewrites as not-done', () => {
    const sections = [{ title: '', lines: [{ original: 'a', rewrite: '   ' }] }];
    expect(lyricsRewriteProgressFromSections(sections)).toEqual({ done: 0, total: 1 });
  });
});

describe('nineQuestionsProgress', () => {
  it('counts nine-question answers', () => {
    expect(nineQuestionsProgress(['a', '', 'c', '', '', '', '', '', ''])).toEqual({
      done: 2,
      total: 9,
    });
  });

  it('treats empty TipTap HTML as unanswered', () => {
    expect(nineQuestionsProgress(['<p></p>', '<p><br></p>', '', '', '', '', '', '', ''])).toEqual({
      done: 0,
      total: 9,
    });
  });

  it('counts TipTap paragraphs as answered', () => {
    expect(nineQuestionsProgress(['<p>Hello world</p>', '', '', '', '', '', '', '', ''])).toEqual({
      done: 1,
      total: 9,
    });
  });
});

describe('characterNineAnswerPlainText', () => {
  it('returns plain strings unchanged', () => {
    expect(characterNineAnswerPlainText('  hi  ')).toBe('hi');
  });

  it('strips simple HTML', () => {
    expect(characterNineAnswerPlainText('<p>One</p>')).toBe('One');
  });
});

describe('characterNineAnswerToEditorHtml', () => {
  it('wraps legacy plain text in paragraphs', () => {
    expect(characterNineAnswerToEditorHtml('Hello')).toBe('<p>Hello</p>');
  });

  it('passes through stored HTML', () => {
    const html = '<p><strong>Bold</strong></p>';
    expect(characterNineAnswerToEditorHtml(html)).toBe(html);
  });
});

describe('single-run-per-kind helpers', () => {
  it('getSingleRunForKind prefers a draft over a completed run', () => {
    const r1 = newLyricsInOwnWordsRun();
    const r2 = markExerciseRunCompleted({ ...newLyricsInOwnWordsRun(), updatedAt: '2999-01-01T00:00:00Z' });
    const song = setSingleRunForKind(blankSong(), r1);
    const songWithBoth = { ...song, practiceExerciseRuns: [...(song.practiceExerciseRuns ?? []), r2] };
    const picked = getSingleRunForKind(songWithBoth, 'lyricsInOwnWords');
    expect(picked?.id).toBe(r1.id);
  });

  it('setSingleRunForKind replaces all existing runs of that kind', () => {
    const r1 = newLyricsInOwnWordsRun();
    const r2 = newLyricsInOwnWordsRun();
    const song = blankSong();
    const after1 = setSingleRunForKind(song, r1);
    const after2 = setSingleRunForKind(after1, r2);
    expect(after2.practiceExerciseRuns?.filter((r) => r.kind === 'lyricsInOwnWords')).toHaveLength(1);
    expect(after2.practiceExerciseRuns?.[0]?.id).toBe(r2.id);
  });

  it('setSingleRunForKind does not touch runs of other kinds', () => {
    const lyrics = newLyricsInOwnWordsRun();
    const seed: EncoreSong = {
      ...blankSong(),
      practiceExerciseRuns: [{
        id: 'nq-1',
        kind: 'characterNineQuestions',
        status: 'draft',
        startedAt: '1',
        updatedAt: '1',
        answers: [],
      }],
    };
    const after = setSingleRunForKind(seed, lyrics);
    const kinds = (after.practiceExerciseRuns ?? []).map((r) => r.kind).sort();
    expect(kinds).toEqual(['characterNineQuestions', 'lyricsInOwnWords']);
  });

  it('removeRunForKind clears all runs of that kind', () => {
    const r = newLyricsInOwnWordsRun();
    const song = setSingleRunForKind(blankSong(), r);
    const cleared = removeRunForKind(song, 'lyricsInOwnWords');
    expect(getSingleRunForKind(cleared, 'lyricsInOwnWords')).toBeUndefined();
  });
});

describe('effectiveGeniusLyricsSource', () => {
  it('prefers song.lyricsSourceGenius over pasted lyrics', () => {
    const song = { ...blankSong(), lyricsSourceGenius: '[A]\nhi' };
    const run = { ...newLyricsInOwnWordsRun(), pastedLyrics: '[B]\nno' };
    expect(effectiveGeniusLyricsSource(song, run)).toBe('[A]\nhi');
  });
});

describe('formatExerciseRunSummary', () => {
  it('reports lyric progress from sections', () => {
    const run: EncoreLyricsInOwnWordsExerciseRun = {
      ...newLyricsInOwnWordsRun(),
      sections: [
        {
          title: 'Verse 1',
          lines: [
            { original: 'a', rewrite: 'x' },
            { original: 'b', rewrite: '' },
          ],
        },
      ],
    };
    expect(formatExerciseRunSummary(run)).toBe('1 of 2 lines');
  });

  it('returns empty summary when no lyric lines have been parsed yet', () => {
    expect(formatExerciseRunSummary(newLyricsInOwnWordsRun())).toBe('');
  });

  it('reports section narrative progress', () => {
    const song = { ...blankSong(), lyricsSourceGenius: '[Verse 1]\na\n[Chorus]\nb' };
    const run = newLyricsSectionNarrativeRun(song);
    const withOne = {
      ...run,
      sections: [{ title: 'Verse 1', narrative: 'x' }, { title: 'Chorus', narrative: '' }],
    };
    expect(formatExerciseRunSummary(withOne)).toBe('1 of 2 sections');
  });
});

describe('touchExerciseRun', () => {
  it('bumps updatedAt', () => {
    const r = newLyricsInOwnWordsRun();
    const t = touchExerciseRun(r);
    expect(t.updatedAt >= r.updatedAt).toBe(true);
  });
});
