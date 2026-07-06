import { useCallback, useMemo, useState } from 'react';
import type { PlaybackSettings } from '../../../rhythm/types';
import { playbackSettingsToMixPatch, mixChannelsToPlaybackSettings } from './playbackSettingsMixSync';
import { useAudioMixBus, type UseAudioMixBusOptions } from './useAudioMixBus';

/**
 * Binds PlaybackSettings sliders to {@link useAudioMixBus} so effective gain matches UI.
 * Use in Drums (and future apps) instead of duplicating metronome/accent channel state.
 */
export function usePlaybackSettingsMixSync(
  defaultSettings: PlaybackSettings,
  mixOptions: UseAudioMixBusOptions = {},
) {
  const { bus, channels, patchChannels } = useAudioMixBus(mixOptions);
  const [playbackSettingsOverride, setPlaybackSettingsOverride] = useState<PlaybackSettings | null>(
    null,
  );

  const playbackSettings =
    playbackSettingsOverride ??
    mixChannelsToPlaybackSettings(channels, defaultSettings);

  const setPlaybackSettings = useCallback(
    (next: PlaybackSettings) => {
      setPlaybackSettingsOverride(next);
      patchChannels(playbackSettingsToMixPatch(next));
    },
    [patchChannels],
  );

  const effectivePlaybackSettings = useMemo(
    () => bus.effectivePlaybackSettings(playbackSettings),
    [bus, playbackSettings],
  );

  return {
    bus,
    channels,
    patchChannels,
    playbackSettings,
    setPlaybackSettings,
    effectivePlaybackSettings,
  };
}
