import { act, renderHook, waitFor } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useStanzaLocalStemMixer } from './useStanzaLocalStemMixer';

const hoisted = vi.hoisted(() => {
  const ensureRunning = vi.fn().mockResolvedValue(true);
  const rebuild = vi.fn();
  const dispose = vi.fn();
  const kickResumeSync = vi.fn();
  const setPrimaryMix = vi.fn();
  const setStemMix = vi.fn();
  const createInstance = () => ({
    rebuild,
    dispose,
    kickResumeSync,
    setPrimaryMix,
    setStemMix,
    isActive: () => true,
    ensureRunning,
  });
  return { ensureRunning, rebuild, dispose, kickResumeSync, createInstance };
});

vi.mock('../audio/stanzaLocalStemMixer', () => ({
  // Vitest 4: constructor mocks must use the `function` keyword — the hook
  // calls `new StanzaLocalStemMixer()`, and arrow fns are "not a constructor".
  StanzaLocalStemMixer: vi.fn(function () {
    return hoisted.createInstance();
  }),
}));

import { StanzaLocalStemMixer } from '../audio/stanzaLocalStemMixer';

describe('useStanzaLocalStemMixer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.ensureRunning.mockReset();
    hoisted.ensureRunning.mockResolvedValue(true);
    hoisted.rebuild.mockReset();
    hoisted.dispose.mockReset();
    hoisted.rebuild.mockImplementation(() => {});
  });

  it('returns true from prepare when stem Web Audio is disabled (no stems)', () => {
    const { result } = renderHook(() => {
      const localVideoRef = useRef<HTMLVideoElement | null>(null);
      const localAudioRef = useRef<HTMLAudioElement | null>(null);
      const stemAudioRefs = useRef(new Map<string, HTMLAudioElement>());
      return useStanzaLocalStemMixer({
        enabled: false,
        stemUrlKey: '',
        expectedStemCount: 0,
        primaryMuted: false,
        primaryGain: 1,
        stems: [],
        isLocalVideo: false,
        localVideoRef,
        localAudioRef,
        stemAudioRefs,
      });
    });
    expect(result.current.prepareStemMixerForPlaySync()).toBe(true);
    expect(StanzaLocalStemMixer).not.toHaveBeenCalled();
  });

  it('returns false from prepare when stem elements are not mounted yet', () => {
    const main = document.createElement('audio');
    const localVideoRef = { current: null as HTMLVideoElement | null };
    const localAudioRef = { current: main };
    const stemAudioRefs = { current: new Map<string, HTMLAudioElement>() };

    const { result } = renderHook(() =>
      useStanzaLocalStemMixer({
        enabled: true,
        stemUrlKey: 'song\0stem:1',
        expectedStemCount: 1,
        primaryMuted: false,
        primaryGain: 1,
        stems: [{ id: 'stem-a' }],
        isLocalVideo: false,
        localVideoRef,
        localAudioRef,
        stemAudioRefs,
      }),
    );

    expect(result.current.prepareStemMixerForPlaySync()).toBe(false);
    expect(hoisted.rebuild).not.toHaveBeenCalled();
  });

  it('calls onMixResumeFailed and clears webAudioMixReady when ensureRunning resolves false', async () => {
    hoisted.ensureRunning.mockResolvedValue(false);
    const onMixResumeFailed = vi.fn();

    const main = document.createElement('audio');
    const stem = document.createElement('audio');
    const localVideoRef = { current: null as HTMLVideoElement | null };
    const localAudioRef = { current: main };
    const stemAudioRefs = { current: new Map<string, HTMLAudioElement>([['stem-a', stem]]) };

    const { result } = renderHook(() =>
      useStanzaLocalStemMixer({
        enabled: true,
        stemUrlKey: 'song\0stem-a:1',
        expectedStemCount: 1,
        primaryMuted: false,
        primaryGain: 1,
        stems: [{ id: 'stem-a', muted: false, gain: 1 }],
        isLocalVideo: false,
        localVideoRef,
        localAudioRef,
        stemAudioRefs,
        onMixResumeFailed,
      }),
    );

    act(() => {
      expect(result.current.prepareStemMixerForPlaySync()).toBe(true);
    });
    expect(result.current.webAudioMixReady).toBe(true);

    act(() => {
      result.current.finalizeStemMixerResume();
    });

    await waitFor(() => {
      expect(onMixResumeFailed).toHaveBeenCalledTimes(1);
    });
    expect(result.current.webAudioMixReady).toBe(false);
  });

  it('calls onMixGraphReleased when an active mixer is torn down', () => {
    const onMixGraphReleased = vi.fn();
    const main = document.createElement('audio');
    const stem = document.createElement('audio');
    const localVideoRef = { current: null as HTMLVideoElement | null };
    const localAudioRef = { current: main };
    const stemAudioRefs = { current: new Map<string, HTMLAudioElement>([['stem-a', stem]]) };

    const { result } = renderHook(() =>
      useStanzaLocalStemMixer({
        enabled: true,
        stemUrlKey: 'song\0stem-a:1',
        expectedStemCount: 1,
        primaryMuted: false,
        primaryGain: 1,
        stems: [{ id: 'stem-a', muted: false, gain: 1 }],
        isLocalVideo: false,
        localVideoRef,
        localAudioRef,
        stemAudioRefs,
        onMixGraphReleased,
      }),
    );

    act(() => {
      expect(result.current.prepareStemMixerForPlaySync()).toBe(true);
    });
    expect(onMixGraphReleased).not.toHaveBeenCalled();

    act(() => {
      result.current.abandonWebAudioMix();
    });
    expect(onMixGraphReleased).toHaveBeenCalledTimes(1);
  });
});
