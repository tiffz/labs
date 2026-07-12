import { describe, expect, it } from 'vitest';

import type { ComicArtVersion, ComicProject, PageNode, PageRevision } from '../types';
import {
  artVersionSourceLabel,
  buildPageRevisionMapFromNodes,
  inferArtVersionCompletedAt,
  resolveExportRevisionMap,
} from './artVersionUtils';

describe('artVersionUtils', () => {
  it('builds a revision map from active page picks', () => {
    const nodes: PageNode[] = [
      {
        id: 'p1',
        projectId: 'proj',
        isSpread: false,
        activeRevisionId: 'r1',
        revisionIds: ['r1'],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'p2',
        projectId: 'proj',
        isSpread: false,
        activeRevisionId: null,
        revisionIds: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ];
    expect(buildPageRevisionMapFromNodes(nodes)).toEqual({ p1: 'r1' });
  });

  it('infers completed date from the latest revision timestamp', () => {
    const revisions: PageRevision[] = [
      {
        id: 'r1',
        pageNodeId: 'p1',
        label: 'v1',
        stage: 'other',
        fileName: 'a.png',
        mimeType: 'image/png',
        width: 0,
        height: 0,
        importedAt: '2024-03-01T12:00:00.000Z',
        createdAt: '2024-03-01T12:00:00.000Z',
      },
      {
        id: 'r2',
        pageNodeId: 'p2',
        label: 'v1',
        stage: 'other',
        fileName: 'b.png',
        mimeType: 'image/png',
        width: 0,
        height: 0,
        importedAt: '2024-06-15T12:00:00.000Z',
        createdAt: '2024-06-10T12:00:00.000Z',
      },
    ];
    expect(inferArtVersionCompletedAt({ p1: 'r1', p2: 'r2' }, revisions)).toBe('2024-06-15T12:00:00.000Z');
  });

  it('resolves export revision map from the final art version', () => {
    const project = { finalArtVersionId: 'v-final' } as ComicProject;
    const versions: ComicArtVersion[] = [
      {
        id: 'v-final',
        projectId: 'proj',
        label: 'Final',
        pageRevisions: { p1: 'r-final' },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ];
    expect(resolveExportRevisionMap(project, versions)).toEqual({ p1: 'r-final' });
    expect(resolveExportRevisionMap({} as ComicProject, versions)).toBeUndefined();
  });

  it('labels version source for display', () => {
    expect(artVersionSourceLabel('upload')).toBe('Uploaded set');
    expect(artVersionSourceLabel('snapshot')).toBe('Snapshot');
    expect(artVersionSourceLabel(undefined)).toBe('Snapshot');
  });
});
