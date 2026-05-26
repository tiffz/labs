import { describe, expect, it } from 'vitest';
import { appendMiscResourceFromUrl, resourceLinkOpenUrl } from './songMiscResources';
import type { EncoreSong } from '../types';

const baseSong = (): EncoreSong => ({
  id: 's1',
  title: 'Test',
  artist: 'Artist',
  journalMarkdown: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

describe('songMiscResources', () => {
  it('appends link and drive resources', () => {
    const withLink = appendMiscResourceFromUrl(baseSong(), 'https://example.com/doc', 'Doc');
    expect(withLink?.miscResources).toHaveLength(1);
    expect(withLink?.miscResources?.[0]?.url).toBe('https://example.com/doc');

    const withDrive = appendMiscResourceFromUrl(
      baseSong(),
      'https://drive.google.com/file/d/abc123/view',
      'PDF',
    );
    expect(withDrive?.miscResources?.[0]?.driveFileId).toBe('abc123');
  });

  it('opens drive or url', () => {
    expect(
      resourceLinkOpenUrl({
        id: '1',
        kind: 'link',
        label: 'x',
        url: 'https://a.com',
        createdAt: '',
      }),
    ).toBe('https://a.com');
    expect(
      resourceLinkOpenUrl({
        id: '2',
        kind: 'file',
        label: 'y',
        driveFileId: 'file99',
        createdAt: '',
      }),
    ).toContain('file99');
  });
});
