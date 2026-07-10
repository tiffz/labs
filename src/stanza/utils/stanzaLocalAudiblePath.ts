import type { StanzaStemTrack } from '../db/stanzaDb';
import { stanzaSanitizeLinearBusGain } from './stanzaPlaybackMute';

/** Which audible path local playback should use (mutually exclusive). */
export type StanzaLocalAudiblePath =
  | 'html'
  | 'webAudioMixer'
  | 'transposeMirror'
  | 'transposeStemBus'
  | 'silentPendingTranspose';

export function resolveStanzaLocalAudiblePath(opts: {
  transposeSemitones: number;
  stemCount: number;
  stemMixerEnabled: boolean;
  stemMixerReady: boolean;
  transposeMirrorReady: boolean;
  transposeStemBusReady: boolean;
}): StanzaLocalAudiblePath {
  const transpose = opts.transposeSemitones;
  if (transpose !== 0) {
    if (opts.stemCount === 0) {
      return opts.transposeMirrorReady ? 'transposeMirror' : 'silentPendingTranspose';
    }
    return opts.transposeStemBusReady ? 'transposeStemBus' : 'silentPendingTranspose';
  }
  if (opts.stemMixerEnabled && opts.stemMixerReady) return 'webAudioMixer';
  return 'html';
}

export type StanzaLocalElementMix = {
  mainVolume: number;
  mainMuted: boolean;
  stemVolume: (stem: StanzaStemTrack) => number;
  stemMuted: (stem: StanzaStemTrack) => boolean;
};

/**
 * Element volume/mute for the local main + stems given the active audible path.
 * Web Audio / transpose paths keep elements as transport clocks (volume 0 or 1).
 */
export function stanzaLocalElementMixForPath(
  path: StanzaLocalAudiblePath,
  opts: {
    primaryGain: number;
    primaryMuted: boolean;
    stemMuted: (stem: StanzaStemTrack) => boolean;
  },
): StanzaLocalElementMix {
  const primaryGain = stanzaSanitizeLinearBusGain(opts.primaryGain);
  if (path === 'silentPendingTranspose' || path === 'transposeMirror' || path === 'transposeStemBus') {
    return {
      mainVolume: 0,
      mainMuted: false,
      stemVolume: () => 0,
      stemMuted: () => false,
    };
  }
  if (path === 'webAudioMixer') {
    return {
      mainVolume: 1,
      mainMuted: false,
      stemVolume: () => 1,
      stemMuted: () => false,
    };
  }
  return {
    mainVolume: primaryGain,
    mainMuted: opts.primaryMuted,
    stemVolume: (stem) => stanzaSanitizeLinearBusGain(stem.gain),
    stemMuted: opts.stemMuted,
  };
}
