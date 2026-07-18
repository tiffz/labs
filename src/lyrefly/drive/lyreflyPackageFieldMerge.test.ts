import { describe, expect, it } from 'vitest';
import {
  mergeLyreflyPageNode,
  mergeLyreflyScriptDocument,
  mergeLyreflyVisualDevAsset,
} from './lyreflyPackageFieldMerge';
import type { PageNode, ScriptDocument, VisualDevAsset } from '../types';

describe('lyreflyPackageFieldMerge', () => {
  it('keeps newer page displayName and unions revision ids', () => {
    const local: PageNode = {
      id: 'p1',
      projectId: 'c1',
      displayName: 'Local',
      isSpread: false,
      activeRevisionId: 'r1',
      revisionIds: ['r1'],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    };
    const remote: PageNode = {
      ...local,
      displayName: 'Remote',
      revisionIds: ['r2'],
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const merged = mergeLyreflyPageNode(local, remote);
    expect(merged.displayName).toBe('Local');
    expect(merged.revisionIds).toEqual(['r1', 'r2']);
  });

  it('script: filled beats empty regardless of clock; else newer wins', () => {
    const filled: ScriptDocument = {
      id: 's1',
      projectId: 'c1',
      markdown: 'filled',
      blocks: [],
      pacingWarnings: [],
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const emptyNewer: ScriptDocument = {
      ...filled,
      markdown: '',
      updatedAt: '2026-01-03T00:00:00.000Z',
    };
    expect(mergeLyreflyScriptDocument(filled, emptyNewer).markdown).toBe('filled');

    const remoteNewer: ScriptDocument = {
      ...filled,
      markdown: 'remote edit',
      updatedAt: '2026-01-03T00:00:00.000Z',
    };
    expect(mergeLyreflyScriptDocument(filled, remoteNewer).markdown).toBe('remote edit');
  });

  it('visual-dev: unions tags and prefers non-empty title', () => {
    const local: VisualDevAsset = {
      id: 'a1',
      projectId: 'c1',
      kind: 'note',
      title: 'Local title',
      tags: ['a'],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    };
    const remote: VisualDevAsset = {
      ...local,
      title: '',
      tags: ['b'],
      caption: 'from remote',
      updatedAt: '2026-01-03T00:00:00.000Z',
    };
    const merged = mergeLyreflyVisualDevAsset(local, remote);
    expect(merged.title).toBe('Local title');
    expect(merged.tags).toEqual(['a', 'b']);
    expect(merged.caption).toBe('from remote');
  });
});
