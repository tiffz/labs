import { describe, expect, it } from 'vitest';
import {
  allAudioFilesFromDataTransfer,
  buildLocalAudioStanzaSong,
  firstAudioFileFromDataTransfer,
  isAudioFileForStanza,
  isPracticeableStanzaDriveMime,
  isStanzaBlobLikeVideo,
  stanzaSongTitleFromFileName,
} from './stanzaLocalAudioImport';

/**
 * jsdom in this repo doesn't provide `File.prototype.arrayBuffer` or `DataTransfer`, so we
 * build minimal type-shaped stubs that only need to satisfy the surface the helpers actually
 * touch (`name`, `type`, `arrayBuffer()` for files; `files.length` + `files.item(i)` for DT).
 */

interface FileLikeStub {
  name: string;
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
}

function fileLike(name: string, type: string, bytes = new Uint8Array([1, 2, 3])): FileLikeStub {
  return {
    name,
    type,
    size: bytes.byteLength,
    arrayBuffer: async () => bytes.slice().buffer,
  };
}

function dataTransferLike(files: FileLikeStub[]): DataTransfer {
  return {
    files: {
      length: files.length,
      item: (i: number) => files[i] ?? null,
    },
  } as unknown as DataTransfer;
}

describe('isAudioFileForStanza', () => {
  it('accepts audio MIME types', () => {
    expect(isAudioFileForStanza(fileLike('a.mp3', 'audio/mpeg') as unknown as File)).toBe(true);
    expect(isAudioFileForStanza(fileLike('a.wav', 'audio/wav') as unknown as File)).toBe(true);
    expect(isAudioFileForStanza(fileLike('a.ogg', 'audio/ogg') as unknown as File)).toBe(true);
  });

  it('falls back to extension when MIME is missing', () => {
    expect(isAudioFileForStanza(fileLike('song.flac', '') as unknown as File)).toBe(true);
    expect(isAudioFileForStanza(fileLike('song.m4a', '') as unknown as File)).toBe(true);
    expect(isAudioFileForStanza(fileLike('song.opus', '') as unknown as File)).toBe(true);
  });

  it('rejects video and document files', () => {
    expect(isAudioFileForStanza(fileLike('clip.mov', 'video/quicktime') as unknown as File)).toBe(false);
    expect(isAudioFileForStanza(fileLike('clip.mp4', 'video/mp4') as unknown as File)).toBe(false);
    expect(isAudioFileForStanza(fileLike('notes.txt', 'text/plain') as unknown as File)).toBe(false);
    expect(isAudioFileForStanza(fileLike('image.png', 'image/png') as unknown as File)).toBe(false);
  });
});

describe('isStanzaBlobLikeVideo', () => {
  it('accepts video MIME types', () => {
    expect(isStanzaBlobLikeVideo(new Blob([], { type: 'video/mp4' }), null)).toBe(true);
    expect(isStanzaBlobLikeVideo(new Blob([], { type: 'video/webm' }), null)).toBe(true);
  });

  it('treats octet-stream as video when filename hint has a video extension', () => {
    expect(isStanzaBlobLikeVideo(new Blob([], { type: 'application/octet-stream' }), 'take.mp4')).toBe(true);
    expect(isStanzaBlobLikeVideo(new Blob([], { type: 'application/octet-stream' }), 'clip.mov')).toBe(true);
  });

  it('rejects octet-stream without a video-like hint', () => {
    expect(isStanzaBlobLikeVideo(new Blob([], { type: 'application/octet-stream' }), 'song.mp3')).toBe(false);
    expect(isStanzaBlobLikeVideo(new Blob([], { type: 'application/octet-stream' }), null)).toBe(false);
  });
});

describe('isPracticeableStanzaDriveMime', () => {
  it('accepts audio and common Drive recording containers', () => {
    expect(isPracticeableStanzaDriveMime('audio/mpeg', 'x.mp3')).toBe(true);
    expect(isPracticeableStanzaDriveMime('video/mp4', 'take.mp4')).toBe(true);
    expect(isPracticeableStanzaDriveMime('video/webm', null)).toBe(true);
    expect(isPracticeableStanzaDriveMime('video/quicktime', 'clip.mov')).toBe(true);
  });

  it('rejects unrelated video and non-media types', () => {
    expect(isPracticeableStanzaDriveMime('video/mpeg', null)).toBe(false);
    expect(isPracticeableStanzaDriveMime('text/plain', 'x.txt')).toBe(false);
  });
});

describe('stanzaSongTitleFromFileName', () => {
  it('strips trailing extensions', () => {
    expect(stanzaSongTitleFromFileName('Bach Prelude.mp3')).toBe('Bach Prelude');
    expect(stanzaSongTitleFromFileName('My Take.recorded.wav')).toBe('My Take.recorded');
  });

  it('falls back to a default when name is empty or only an extension', () => {
    expect(stanzaSongTitleFromFileName('')).toBe('Local audio');
    expect(stanzaSongTitleFromFileName('.mp3')).toBe('.mp3');
  });

  it('preserves names without extensions', () => {
    expect(stanzaSongTitleFromFileName('Etude no 1')).toBe('Etude no 1');
  });
});

describe('firstAudioFileFromDataTransfer', () => {
  it('returns null when payload is missing or empty', () => {
    expect(firstAudioFileFromDataTransfer(null)).toBeNull();
    expect(firstAudioFileFromDataTransfer(undefined)).toBeNull();
    expect(firstAudioFileFromDataTransfer(dataTransferLike([]))).toBeNull();
  });

  it('picks the first audio entry from a mixed payload', () => {
    const dt = dataTransferLike([
      fileLike('clip.mov', 'video/quicktime'),
      fileLike('song.mp3', 'audio/mpeg'),
      fileLike('also.flac', 'audio/flac'),
    ]);
    const picked = firstAudioFileFromDataTransfer(dt);
    expect(picked?.name).toBe('song.mp3');
  });

  it('returns null when nothing in the payload is audio', () => {
    const dt = dataTransferLike([
      fileLike('clip.mp4', 'video/mp4'),
      fileLike('img.png', 'image/png'),
    ]);
    expect(firstAudioFileFromDataTransfer(dt)).toBeNull();
  });
});

describe('allAudioFilesFromDataTransfer', () => {
  it('returns every audio entry in order, skipping non-audio', () => {
    const dt = dataTransferLike([
      fileLike('clip.mov', 'video/quicktime'),
      fileLike('song.mp3', 'audio/mpeg'),
      fileLike('also.flac', 'audio/flac'),
      fileLike('x.txt', 'text/plain'),
    ]);
    const all = allAudioFilesFromDataTransfer(dt);
    expect(all.map((f) => f.name)).toEqual(['song.mp3', 'also.flac']);
  });

  it('returns an empty array when there is no audio', () => {
    expect(allAudioFilesFromDataTransfer(dataTransferLike([fileLike('x.png', 'image/png')]))).toEqual([]);
  });
});

describe('buildLocalAudioStanzaSong', () => {
  it('returns a Stanza-shaped row whose blob owns the bytes', async () => {
    const file = fileLike('Etude.mp3', 'audio/mpeg', new Uint8Array([10, 20, 30, 40]));
    const row = await buildLocalAudioStanzaSong(file as unknown as File);
    expect(row.id).toMatch(/^[0-9a-fA-F-]{36}$/);
    expect(row.ytId).toBeNull();
    expect(row.title).toBe('Etude');
    expect(row.markers).toEqual([]);
    expect(row.stats).toEqual({});
    expect(row.localAudioBlob).toBeInstanceOf(Blob);
    expect(row.localAudioBlob?.size).toBe(4);
    expect(row.localAudioBlob?.type).toBe('audio/mpeg');
  });

  it('falls back to audio/mpeg when the file has no MIME', async () => {
    const file = fileLike('Track.flac', '');
    const row = await buildLocalAudioStanzaSong(file as unknown as File);
    expect(row.localAudioBlob?.type).toBe('audio/mpeg');
    expect(row.title).toBe('Track');
  });

  it('throws when handed a non-audio file (drop sanity check)', async () => {
    await expect(
      buildLocalAudioStanzaSong(fileLike('clip.mp4', 'video/mp4') as unknown as File),
    ).rejects.toThrow(/Not an audio file/);
  });
});
