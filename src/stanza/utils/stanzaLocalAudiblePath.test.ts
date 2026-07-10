import { describe, expect, it } from 'vitest';
import {
  resolveStanzaLocalAudiblePath,
  stanzaLocalElementMixForPath,
} from './stanzaLocalAudiblePath';
import type { StanzaStemTrack } from '../db/stanzaDb';

const stem = (id: string, gain = 0.5): StanzaStemTrack => ({
  id,
  label: id,
  localBlob: new Blob(),
  gain,
  muted: false,
});

describe('resolveStanzaLocalAudiblePath', () => {
  it('uses html when no transpose and mixer off', () => {
    expect(
      resolveStanzaLocalAudiblePath({
        transposeSemitones: 0,
        stemCount: 0,
        stemMixerEnabled: false,
        stemMixerReady: false,
        transposeMirrorReady: false,
        transposeStemBusReady: false,
      }),
    ).toBe('html');
  });

  it('uses webAudioMixer when stems + mixer ready', () => {
    expect(
      resolveStanzaLocalAudiblePath({
        transposeSemitones: 0,
        stemCount: 2,
        stemMixerEnabled: true,
        stemMixerReady: true,
        transposeMirrorReady: false,
        transposeStemBusReady: false,
      }),
    ).toBe('webAudioMixer');
  });

  it('uses transposeMirror when pitch-shifted with no stems', () => {
    expect(
      resolveStanzaLocalAudiblePath({
        transposeSemitones: 2,
        stemCount: 0,
        stemMixerEnabled: false,
        stemMixerReady: false,
        transposeMirrorReady: true,
        transposeStemBusReady: false,
      }),
    ).toBe('transposeMirror');
  });

  it('stays silent while transpose buffers are still decoding', () => {
    expect(
      resolveStanzaLocalAudiblePath({
        transposeSemitones: -1,
        stemCount: 1,
        stemMixerEnabled: false,
        stemMixerReady: false,
        transposeMirrorReady: false,
        transposeStemBusReady: false,
      }),
    ).toBe('silentPendingTranspose');
  });
});

describe('stanzaLocalElementMixForPath', () => {
  it('zeros element volumes for transpose paths', () => {
    const mix = stanzaLocalElementMixForPath('transposeMirror', {
      primaryGain: 0.8,
      primaryMuted: false,
      stemMuted: () => false,
    });
    expect(mix.mainVolume).toBe(0);
    expect(mix.stemVolume(stem('a'))).toBe(0);
  });

  it('keeps elements at unity for the Web Audio mixer', () => {
    const mix = stanzaLocalElementMixForPath('webAudioMixer', {
      primaryGain: 0.4,
      primaryMuted: true,
      stemMuted: () => true,
    });
    expect(mix.mainVolume).toBe(1);
    expect(mix.mainMuted).toBe(false);
    expect(mix.stemVolume(stem('a', 0.2))).toBe(1);
  });

  it('applies html gains when playing through the element', () => {
    const mix = stanzaLocalElementMixForPath('html', {
      primaryGain: 0.6,
      primaryMuted: true,
      stemMuted: (s) => s.id === 'a',
    });
    expect(mix.mainVolume).toBeCloseTo(0.6);
    expect(mix.mainMuted).toBe(true);
    expect(mix.stemMuted(stem('a'))).toBe(true);
  });
});
