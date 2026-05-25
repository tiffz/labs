import { describe, expect, it } from 'vitest';
import { getStanzaLocalMainMediaElement } from './stanzaLocalMainMediaElement';

describe('getStanzaLocalMainMediaElement', () => {
  it('prefers video when the song is a local video', () => {
    const audio = document.createElement('audio');
    const video = document.createElement('video');
    const audioRef = { current: audio };
    const videoRef = { current: video };
    expect(getStanzaLocalMainMediaElement(true, audioRef, videoRef)).toBe(video);
  });

  it('prefers audio when the song is not a local video', () => {
    const audio = document.createElement('audio');
    const video = document.createElement('video');
    const audioRef = { current: audio };
    const videoRef = { current: video };
    expect(getStanzaLocalMainMediaElement(false, audioRef, videoRef)).toBe(audio);
  });
});
