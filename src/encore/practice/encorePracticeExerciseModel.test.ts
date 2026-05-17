import { describe, expect, it } from 'vitest';
import type { EncoreLyricsInOwnWordsExerciseRun, EncoreSong } from '../types';
import {
  characterNineAnswerPlainText,
  characterNineAnswerToEditorHtml,
  effectiveLyricsSections,
  effectiveGeniusLyricsSource,
  formatExerciseRunSummary,
  getSingleRunForKind,
  lyricsExerciseSectionDisplayLabel,
  lyricsExerciseSectionExportHeading,
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

  it('treats unlabeled, blank-free lines as a single anonymous section', () => {
    const out = parseGeniusLyricsIntoSections('first\nsecond\nthird');
    expect(out).toHaveLength(1);
    expect(out[0]?.title).toBe('');
    expect(out[0]?.lines.map((l) => l.original)).toEqual(['first', 'second', 'third']);
    expect(out[0]?.lines.every((l) => l.rewrite === '')).toBe(true);
  });

  it('splits unlabeled paragraphs separated by blank lines into anonymous sections', () => {
    // A plain lyrics paste with no [Section] markers is the canonical use case for the implicit
    // paragraph-as-section rule. Each blank line becomes a section boundary and every section
    // keeps an empty title so the UI assigns "Section 1", "Section 2", ….
    const raw = 'First stanza line one\nFirst stanza line two\n\nSecond stanza line one\n\nThird';
    const out = parseGeniusLyricsIntoSections(raw);
    expect(out).toHaveLength(3);
    expect(out.every((s) => s.title === '')).toBe(true);
    expect(out[0]?.lines.map((l) => l.original)).toEqual([
      'First stanza line one',
      'First stanza line two',
    ]);
    expect(out[1]?.lines.map((l) => l.original)).toEqual(['Second stanza line one']);
    expect(out[2]?.lines.map((l) => l.original)).toEqual(['Third']);
  });

  it('collapses multiple consecutive blank lines into one split', () => {
    const out = parseGeniusLyricsIntoSections('A\n\n\n\nB');
    expect(out).toHaveLength(2);
    expect(out[0]?.lines.map((l) => l.original)).toEqual(['A']);
    expect(out[1]?.lines.map((l) => l.original)).toEqual(['B']);
  });

  it('does not insert an empty section between a blank line and a [Header]', () => {
    // Without the pendingBlank deferral, `…\n\n[Chorus]` would produce a stray untitled section
    // between the previous one and Chorus. The Genius round-trip relies on this skipping.
    const raw = `[Verse 1]
A
B

[Chorus]
C`;
    const out = parseGeniusLyricsIntoSections(raw);
    expect(out.map((s) => s.title)).toEqual(['Verse 1', 'Chorus']);
    expect(out[0]?.lines).toHaveLength(2);
    expect(out[1]?.lines).toHaveLength(1);
  });

  it('splits on blank lines inside an explicit-header span (paragraphs become Section N siblings)', () => {
    // After the user labels the first paragraph, the remaining untitled paragraphs must keep
    // their own boundaries instead of merging into the now-titled section. This is also the
    // round-trip case for an inline-blur re-parse after a title edit.
    const raw = `[Intro]
X

Y

Z`;
    const out = parseGeniusLyricsIntoSections(raw);
    expect(out.map((s) => s.title)).toEqual(['Intro', '', '']);
    expect(out[0]?.lines.map((l) => l.original)).toEqual(['X']);
    expect(out[1]?.lines.map((l) => l.original)).toEqual(['Y']);
    expect(out[2]?.lines.map((l) => l.original)).toEqual(['Z']);
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

  it('round-trips paragraph-form pastes (untitled sections survive serialization)', () => {
    // The blank-line separator the serializer now emits is the only way the parser can recover
    // the section boundaries for untitled paragraphs.
    const parsed = parseGeniusLyricsIntoSections('A1\nA2\n\nB1\n\nC1');
    const raw = serializeLyricsSectionsToRaw(parsed);
    expect(raw).toBe('A1\nA2\n\nB1\n\nC1');
    expect(parseGeniusLyricsIntoSections(raw)).toEqual(parsed);
  });

  it('round-trips a mix of titled and untitled sections (post-rename state)', () => {
    const sections = [
      { title: 'Intro', lines: [{ original: 'x', rewrite: '' }] },
      { title: '', lines: [{ original: 'y', rewrite: '' }] },
      { title: '', lines: [{ original: 'z', rewrite: '' }] },
    ];
    const raw = serializeLyricsSectionsToRaw(sections);
    expect(parseGeniusLyricsIntoSections(raw)).toEqual(sections);
  });
});

describe('lyricsExerciseSectionDisplayLabel', () => {
  it('returns the explicit title when set, ignoring the auto-naming rule', () => {
    const sec = { title: 'Verse 1', lines: [] };
    expect(lyricsExerciseSectionDisplayLabel(sec, 0, 4)).toBe('Verse 1');
  });

  it('falls back to "Lyrics" for a single untitled section so one-paragraph pastes keep that label', () => {
    expect(lyricsExerciseSectionDisplayLabel({ title: '', lines: [] }, 0, 1)).toBe('Lyrics');
  });

  it('numbers multiple untitled sections positionally (1-indexed)', () => {
    expect(lyricsExerciseSectionDisplayLabel({ title: '', lines: [] }, 0, 3)).toBe('Section 1');
    expect(lyricsExerciseSectionDisplayLabel({ title: '', lines: [] }, 2, 3)).toBe('Section 3');
  });

  it('uses the positional index in mixed states (custom titles do not shift the count)', () => {
    expect(lyricsExerciseSectionDisplayLabel({ title: '', lines: [] }, 1, 2)).toBe('Section 2');
  });
});

describe('lyricsExerciseSectionExportHeading', () => {
  it('brackets explicit titles for export', () => {
    expect(lyricsExerciseSectionExportHeading({ title: 'Verse 1', lines: [] }, 0, 1)).toBe('[Verse 1]');
  });

  it('does not bracket auto-generated labels (they would read as lyrics in the export)', () => {
    expect(lyricsExerciseSectionExportHeading({ title: '', lines: [] }, 0, 1)).toBe('Lyrics');
    expect(lyricsExerciseSectionExportHeading({ title: '', lines: [] }, 1, 3)).toBe('Section 2');
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

  it('preserves user-renamed titles on untitled paragraphs through a re-sync', () => {
    // User pasted three untitled paragraphs, then renamed the middle one to "Outro" inside
    // the narrative editor. A subsequent re-sync from the unchanged plain-paragraph lyrics
    // source must keep that rename — index-fallback for empty parsed titles is what makes
    // this work.
    const parsed = parseGeniusLyricsIntoSections('A\n\nB\n\nC');
    const existing = [
      { title: '', narrative: 'n1' },
      { title: 'Outro', narrative: 'n2' },
      { title: '', narrative: 'n3' },
    ];
    const merged = mergeParsedNarrativeSectionsWithExisting(parsed, existing);
    expect(merged.map((s) => s.title)).toEqual(['', 'Outro', '']);
    expect(merged.map((s) => s.narrative)).toEqual(['n1', 'n2', 'n3']);
  });

  it('keeps untitled narratives aligned positionally even when an explicit [Header] is added', () => {
    // User had two untitled paragraphs (narratives n1, n2) and adds a [Chorus] header
    // between them in the lyrics source. The chorus is brand new (no narrative yet); n1 and
    // n2 stay aligned to their original index slots.
    const parsed = parseGeniusLyricsIntoSections('A\n\n[Chorus]\nB');
    const existing = [
      { title: '', narrative: 'n1' },
      { title: '', narrative: 'n2' },
    ];
    const merged = mergeParsedNarrativeSectionsWithExisting(parsed, existing);
    expect(merged).toHaveLength(2);
    expect(merged[0]).toEqual({ title: '', narrative: 'n1' });
    expect(merged[1]).toEqual({ title: 'Chorus', narrative: '' });
  });

  it('returns blank entries for parsed sections beyond existing length', () => {
    const parsed = parseGeniusLyricsIntoSections('A\n\nB');
    const existing = [{ title: 'Renamed', narrative: 'n1' }];
    const merged = mergeParsedNarrativeSectionsWithExisting(parsed, existing);
    expect(merged).toEqual([
      { title: 'Renamed', narrative: 'n1' },
      { title: '', narrative: '' },
    ]);
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
