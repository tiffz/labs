import { describe, expect, it } from 'vitest';
import { inferMediaMimeType } from './inferMediaMimeType';

describe('inferMediaMimeType', () => {
  it('trusts browser audio/video MIME types', () => {
    expect(inferMediaMimeType({ name: 'x.m4a', type: 'audio/mp4' })).toBe('audio/mp4');
    expect(inferMediaMimeType({ name: 'x.mp4', type: 'video/mp4' })).toBe('video/mp4');
  });

  it('infers Logic-style .m4a when type is empty or octet-stream', () => {
    expect(inferMediaMimeType({ name: 'Bounce 1.m4a', type: '' })).toBe('audio/mp4');
    expect(inferMediaMimeType({ name: 'Bounce 1.m4a', type: 'application/octet-stream' })).toBe('audio/mp4');
  });

  it('covers common DAW / lossless exports', () => {
    expect(inferMediaMimeType({ name: 'take.aif', type: '' })).toBe('audio/aiff');
    expect(inferMediaMimeType({ name: 'take.aiff', type: '' })).toBe('audio/aiff');
    expect(inferMediaMimeType({ name: 'take.wav', type: '' })).toBe('audio/wav');
    expect(inferMediaMimeType({ name: 'take.caf', type: '' })).toBe('audio/x-caf');
    expect(inferMediaMimeType({ name: 'take.flac', type: '' })).toBe('audio/flac');
  });
});
