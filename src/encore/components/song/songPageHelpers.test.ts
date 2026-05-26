import { describe, expect, it } from 'vitest';
import { appendMiscResource, createResourceFromUrl } from '../../repertoire/encoreResourceLinks';
import { newSong, songAutosaveDirty } from './songPageHelpers';

describe('songAutosaveDirty', () => {
  it('detects miscResources changes', () => {
    const base = newSong();
    const resource = createResourceFromUrl('https://example.com/ref', 'My ref');
    expect(resource).not.toBeNull();
    const withMisc = appendMiscResource(base, resource!);
    expect(songAutosaveDirty(base, withMisc)).toBe(true);
    expect(songAutosaveDirty(withMisc, withMisc)).toBe(false);
  });

  it('detects miscResources nickname edits', () => {
    const base = newSong();
    const resource = createResourceFromUrl('https://example.com/ref', 'Before')!;
    const withMisc = appendMiscResource(base, resource);
    const renamed = {
      ...withMisc,
      miscResources: [{ ...withMisc.miscResources![0]!, label: 'After' }],
    };
    expect(songAutosaveDirty(withMisc, renamed)).toBe(true);
  });
});
