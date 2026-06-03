import { describe, expect, it, vi } from 'vitest';
import {
  allAudioFilesFromDataTransfer,
  buildLocalAudioStanzaSong,
  firstAudioFileFromDataTransfer,
  isAudioFileForStanza,
  isLocalMediaFileForStanza,
  isPracticeableStanzaDriveMime,
  isStanzaBlobLikeVideo,
  stanzaSongTitleFromFileName,
} from './stanzaLocalAudioImport';

vi.mock('../utils/probeFileAudioDuration', () => ({
  probeFileAudioDurationSeconds: vi.fn(async () => 180.5),
}));

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

  it('rejects video and document files for audio-only sniff', () => {
    expect(isAudioFileForStanza(fileLike('clip.mov', 'video/quicktime') as unknown as File)).toBe(false);
    expect(isAudioFileForStanza(fileLike('clip.mp4', 'video/mp4') as unknown as File)).toBe(false);
    expect(isAudioFileForStanza(fileLike('notes.txt', 'text/plain') as unknown as File)).toBe(false);
    expect(isAudioFileForStanza(fileLike('image.png', 'image/png') as unknown as File)).toBe(false);
    expect(isAudioFileForStanza(fileLike('shot.png', 'image/png') as unknown as File)).toBe(false);
  });
});

describe('isLocalMediaFileForStanza', () => {
  it('accepts practiceable local video containers', () => {
    expect(isLocalMediaFileForStanza(fileLike('clip.mp4', 'video/mp4') as unknown as File)).toBe(true);
    expect(isLocalMediaFileForStanza(fileLike('clip.mov', 'video/quicktime') as unknown as File)).toBe(true);
  });

  it('still rejects unrelated files', () => {
    expect(isLocalMediaFileForStanza(fileLike('notes.txt', 'text/plain') as unknown as File)).toBe(false);
    expect(isLocalMediaFileForStanza(fileLike('shot.png', 'image/png') as unknown as File)).toBe(false);
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

  it('picks the first practiceable entry from a mixed payload', () => {
    const dt = dataTransferLike([
      fileLike('clip.mov', 'video/quicktime'),
      fileLike('song.mp3', 'audio/mpeg'),
      fileLike('also.flac', 'audio/flac'),
    ]);
    const picked = firstAudioFileFromDataTransfer(dt);
    expect(picked?.name).toBe('clip.mov');
  });

  it('accepts video when no audio sibling is present', () => {
    const dt = dataTransferLike([fileLike('take.mp4', 'video/mp4')]);
    expect(firstAudioFileFromDataTransfer(dt)?.name).toBe('take.mp4');
  });

  it('returns null when nothing in the payload is practiceable', () => {
    const dt = dataTransferLike([
      fileLike('img.png', 'image/png'),
      fileLike('x.txt', 'text/plain'),
    ]);
    expect(firstAudioFileFromDataTransfer(dt)).toBeNull();
  });
});

describe('allAudioFilesFromDataTransfer', () => {
  it('returns every practiceable entry in order, skipping non-media', () => {
    const dt = dataTransferLike([
      fileLike('clip.mov', 'video/quicktime'),
      fileLike('song.mp3', 'audio/mpeg'),
      fileLike('also.flac', 'audio/flac'),
      fileLike('x.txt', 'text/plain'),
    ]);
    const all = allAudioFilesFromDataTransfer(dt);
    expect(all.map((f) => f.name)).toEqual(['clip.mov', 'song.mp3', 'also.flac']);
  });

  it('returns an empty array when there is no practiceable media', () => {
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

  it('throws when handed an unsupported file type', async () => {
    await expect(
      buildLocalAudioStanzaSong(fileLike('notes.txt', 'text/plain') as unknown as File),
    ).rejects.toThrow(/Not a supported recording/);
  });

  it('accepts local mp4 video uploads', async () => {
    const row = await buildLocalAudioStanzaSong(fileLike('take.mp4', 'video/mp4') as unknown as File);
    expect(row.localAudioBlob?.type).toBe('video/mp4');
    expect(row.title).toBe('take');
  });

  it('throws when the browser cannot decode the file as audio', async () => {
    const { probeFileAudioDurationSeconds } = await import('../utils/probeFileAudioDuration');
    vi.mocked(probeFileAudioDurationSeconds).mockResolvedValueOnce(null);
    await expect(
      buildLocalAudioStanzaSong(fileLike('fake.mp3', 'audio/mpeg') as unknown as File),
    ).rejects.toThrow(/Could not read audio/);
  });
});
