import { describe, expect, it } from 'vitest';
import type { EncoreMilestoneDefinition, EncoreSong } from '../types';
import { milestoneProgressSummary } from './repertoireMilestoneSummary';

function song(partial: Partial<EncoreSong> & Pick<EncoreSong, 'id' | 'title' | 'artist' | 'journalMarkdown' | 'createdAt' | 'updatedAt'>): EncoreSong {
  return {
    journalMarkdown: '',
    ...partial,
  };
}

describe('milestoneProgressSummary', () => {
  const template: EncoreMilestoneDefinition[] = [
    { id: 'a', label: 'A', sortOrder: 0 },
    { id: 'b', label: 'B', sortOrder: 1 },
  ];

  it('returns em dash when no active template rows and no song-only rows', () => {
    const s = song({
      id: '1',
      title: 'T',
      artist: 'A',
      createdAt: 'x',
      updatedAt: 'x',
    });
    expect(milestoneProgressSummary(s, []).labelShort).toBe('None');
  });

  it('counts template rows with defaults as todo', () => {
    const s = song({
      id: '1',
      title: 'T',
      artist: 'A',
      createdAt: 'x',
      updatedAt: 'x',
    });
    const r = milestoneProgressSummary(s, template);
    expect(r.total).toBe(2);
    expect(r.todo).toBe(2);
    expect(r.labelShort).toBe('0/2');
  });

  it('includes N/A in short label when present', () => {
    const s = song({
      id: '1',
      title: 'T',
      artist: 'A',
      createdAt: 'x',
      updatedAt: 'x',
      milestoneProgress: { a: { state: 'done' }, b: { state: 'na' } },
    });
    const r = milestoneProgressSummary(s, template);
    expect(r.done).toBe(1);
    expect(r.na).toBe(1);
    expect(r.todo).toBe(0);
    expect(r.labelShort).toBe('1/2 · 1 N/A');
  });

  it('counts song-only milestones', () => {
    const s = song({
      id: '1',
      title: 'T',
      artist: 'A',
      createdAt: 'x',
      updatedAt: 'x',
      milestoneProgress: { a: { state: 'done' }, b: { state: 'done' } },
      songOnlyMilestones: [{ id: 'x', label: 'Extra', state: 'todo' }],
    });
    const r = milestoneProgressSummary(s, template);
    expect(r.total).toBe(3);
    expect(r.done).toBe(2);
    expect(r.todo).toBe(1);
  });
});
