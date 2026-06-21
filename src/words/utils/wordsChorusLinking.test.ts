import { describe, expect, it } from 'vitest';
import type { SongSection } from '../../shared/music/songSections';
import { DEFAULT_SECTIONS } from './wordsAppDefaults';
import { buildEffectiveSections } from './wordsSectionPlans';
import {
  applyLinkAllChorusLyrics,
  applyLinkAllChorusTemplates,
  applyUnlinkAllChorusLyrics,
  applyUnlinkAllChorusTemplates,
  countChorusSections,
  getChorusLyricsLinkAggregate,
  getChorusTemplateLinkAggregate,
} from './wordsChorusLinking';

function chorusSection(
  id: string,
  overrides: Partial<SongSection> = {}
): SongSection {
  return {
    ...DEFAULT_SECTIONS[1],
    id,
    type: 'chorus',
    linkedToPreviousChorusLyrics: true,
    linkedToPreviousChorusTemplate: true,
    ...overrides,
  };
}

describe('wordsChorusLinking', () => {
  it('counts chorus sections', () => {
    const sections = [
      { ...DEFAULT_SECTIONS[0], id: 'v1', type: 'verse' as const },
      chorusSection('c1'),
      chorusSection('c2'),
    ];
    expect(countChorusSections(sections)).toBe(2);
  });

  it('reports mixed lyrics link state', () => {
    const sections = [
      chorusSection('c1', { linkedToPreviousChorusLyrics: true }),
      chorusSection('c2', { linkedToPreviousChorusLyrics: false }),
    ];
    expect(getChorusLyricsLinkAggregate(sections)).toBe('mixed');
  });

  it('link all chorus lyrics copies first chorus lyrics', () => {
    const sections = [
      chorusSection('c1', { lyrics: 'Hook line', linkedToPreviousChorusLyrics: true }),
      chorusSection('c2', {
        lyrics: 'Different',
        linkedToPreviousChorusLyrics: false,
      }),
    ];
    const next = applyLinkAllChorusLyrics(sections);
    expect(next[0]?.lyrics).toBe('Hook line');
    expect(next[1]?.lyrics).toBe('Hook line');
    expect(next.every((section) => section.linkedToPreviousChorusLyrics)).toBe(true);
  });

  it('unlink all chorus lyrics preserves effective lyrics', () => {
    const sections = [
      chorusSection('c1', { lyrics: 'Shared hook', linkedToPreviousChorusLyrics: true }),
      chorusSection('c2', { lyrics: '', linkedToPreviousChorusLyrics: true }),
    ];
    const next = applyUnlinkAllChorusLyrics(sections);
    expect(next[1]?.lyrics).toBe('Shared hook');
    expect(next.every((section) => !section.linkedToPreviousChorusLyrics)).toBe(true);
    const effective = buildEffectiveSections(next);
    expect(effective[1]?.effectiveLyrics).toBe('Shared hook');
  });

  it('link all chorus templates copies first chorus template', () => {
    const sections = [
      chorusSection('c1', {
        templateNotation: 'D---D---',
        linkedToPreviousChorusTemplate: true,
      }),
      chorusSection('c2', {
        templateNotation: 'D-T-D-T-',
        linkedToPreviousChorusTemplate: false,
      }),
    ];
    const next = applyLinkAllChorusTemplates(sections);
    expect(next[1]?.templateNotation).toBe('D---D---');
    expect(next.every((section) => section.linkedToPreviousChorusTemplate)).toBe(true);
  });

  it('unlink all chorus templates preserves effective template notation', () => {
    const sections = [
      chorusSection('c1', {
        templateNotation: 'D---D---',
        linkedToPreviousChorusTemplate: true,
      }),
      chorusSection('c2', {
        templateNotation: '',
        linkedToPreviousChorusTemplate: true,
      }),
    ];
    const next = applyUnlinkAllChorusTemplates(sections);
    expect(next[1]?.templateNotation).toBe('D---D---');
    expect(getChorusTemplateLinkAggregate(next)).toBe('all-unlinked');
  });
});
