import { useCallback, useMemo, useState } from 'react';
import {
  DEFAULT_AUDIO_MIX,
  LabsAudioMixBus,
  mergeAudioMix,
  type AudioMixChannels,
  type AudioMixChannelsPatch,
} from './LabsAudioMixBus';

export type UseAudioMixBusOptions = {
  initial?: AudioMixChannelsPatch;
  storageKey?: string;
  onPersist?: (channels: AudioMixChannels) => void;
};

function loadStoredMix(key: string | undefined): AudioMixChannelsPatch | undefined {
  if (!key || typeof localStorage === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    return JSON.parse(raw) as AudioMixChannelsPatch;
  } catch {
    return undefined;
  }
}

export function useAudioMixBus(options: UseAudioMixBusOptions = {}) {
  const { storageKey, onPersist } = options;
  const [channels, setChannelsState] = useState<AudioMixChannels>(() =>
    mergeAudioMix(DEFAULT_AUDIO_MIX, {
      ...loadStoredMix(storageKey),
      ...options.initial,
    }),
  );

  const bus = useMemo(() => new LabsAudioMixBus(channels), [channels]);

  const setChannels = useCallback(
    (updater: AudioMixChannels | ((prev: AudioMixChannels) => AudioMixChannels)) => {
      setChannelsState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        if (storageKey && typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem(storageKey, JSON.stringify(next));
          } catch {
            /* quota */
          }
        }
        onPersist?.(next);
        return next;
      });
    },
    [storageKey, onPersist],
  );

  const patchChannels = useCallback(
    (patch: AudioMixChannelsPatch) => {
      setChannels((prev) => mergeAudioMix(prev, patch));
    },
    [setChannels],
  );

  const bindMetronomeVolume = useCallback(
    (volume: number) => patchChannels({ metronome: { ...channels.metronome, volume } }),
    [channels.metronome, patchChannels],
  );

  const bindDrumsVolume = useCallback(
    (volume: number) => patchChannels({ drums: { ...channels.drums, volume } }),
    [channels.drums, patchChannels],
  );

  return {
    channels,
    bus,
    setChannels,
    patchChannels,
    bindMetronomeVolume,
    bindDrumsVolume,
  };
}
