import { describe, expect, it } from 'vitest';

import {
  buildConceptShelfCreateInput,
  conceptShelfOpenUrl,
  inferConceptLabelFromUrl,
  isConceptGalleryVisual,
  partitionConceptShelfAssets,
} from './conceptShelfUtils';
import type { VisualDevAsset } from '../types';

describe('conceptShelfUtils', () => {
  it('builds url-only references without notes', () => {
    const input = buildConceptShelfCreateInput('https://example.com/mood.pdf', '', '');
    expect(input).toEqual({
      kind: 'reference',
      title: 'example.com',
      url: 'https://example.com/mood.pdf',
    });
  });

  it('builds file-only references', () => {
    const file = new File(['notes'], 'beats.txt', { type: 'text/plain' });
    const input = buildConceptShelfCreateInput('', '', '', file);
    expect(input?.kind).toBe('reference');
    expect(input?.title).toBe('beats');
    expect(input?.file).toBe(file);
  });

  it('builds note-only references', () => {
    const input = buildConceptShelfCreateInput('', '', 'Character wears a red scarf');
    expect(input).toEqual({
      kind: 'note',
      title: 'Idea note',
      markdown: 'Character wears a red scarf',
    });
  });

  it('parses Google Docs links with notes', () => {
    const input = buildConceptShelfCreateInput(
      'https://docs.google.com/document/d/abc123/edit',
      '',
      'Tone reference',
    );
    expect(input?.kind).toBe('reference');
    expect(input?.url).toContain('docs.google.com');
    expect(input?.markdown).toBe('Tone reference');
    expect(input?.title).toBe('Google Doc');
  });

  it('parses Drive file ids', () => {
    const input = buildConceptShelfCreateInput(
      'https://drive.google.com/file/d/1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p/view',
      'Mood photo',
      '',
    );
    expect(input?.driveFileId).toBe('1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p');
    expect(input?.title).toBe('Mood photo');
    expect(conceptShelfOpenUrl({ ...input!, id: 'x', projectId: 'p', tags: [], createdAt: '', updatedAt: '' })).toContain(
      'drive.google.com',
    );
  });

  it('labels YouTube links', () => {
    expect(inferConceptLabelFromUrl('https://www.youtube.com/watch?v=abc')).toBe('YouTube video');
  });

  it('partitions gallery visuals from link and note references', () => {
    const base = { projectId: 'p', tags: [], createdAt: '', updatedAt: '' };
    const image: VisualDevAsset = { ...base, id: '1', kind: 'image', title: 'Hero' };
    const sketch: VisualDevAsset = { ...base, id: '2', kind: 'sketch', title: 'Rough' };
    const link: VisualDevAsset = { ...base, id: '3', kind: 'link', title: 'Mood', url: 'https://x.test' };
    const note: VisualDevAsset = { ...base, id: '4', kind: 'note', title: 'Idea' };
    const refWithFile: VisualDevAsset = {
      ...base,
      id: '5',
      kind: 'reference',
      title: 'Scan',
      fileName: 'scan.png',
    };

    expect(isConceptGalleryVisual(image)).toBe(true);
    expect(isConceptGalleryVisual(link)).toBe(false);
    expect(partitionConceptShelfAssets([image, sketch, link, note, refWithFile])).toEqual({
      gallery: [image, sketch, refWithFile],
      references: [link, note],
    });
  });
});
