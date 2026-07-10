import { stanzaDb, type StanzaSong, type StanzaStemTrack } from '../db/stanzaDb';
import { writeStanzaLastSelectedSongId } from '../db/stanzaLastSelectedSong';

export const STANZA_E2E_STEM_SONG_ID = '__stanza_e2e_stems__';
export const STANZA_E2E_STEM_SONG_TITLE = 'E2E Stems Song';

export const STANZA_E2E_PRACTICE_RAIL_SONG_ID = '__stanza_e2e_practice_rail__';
export const STANZA_E2E_PRACTICE_RAIL_SONG_TITLE = 'E2E Practice Rail Song';

/** ~mono 8kHz 8-bit PCM WAV — decodes in Chromium for playback smoke tests. */
export function createMinimalWavBlobForStanzaE2e(durationSec = 0.05): Blob {
  const sampleRate = 8000;
  const duration = Math.max(0.05, durationSec);
  const numSamples = Math.floor(sampleRate * duration);
  const numChannels = 1;
  const bitsPerSample = 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  let offset = 0;
  const writeStr = (s: string) => {
    for (let i = 0; i < s.length; i++) {
      view.setUint8(offset++, s.charCodeAt(i));
    }
  };
  writeStr('RIFF');
  view.setUint32(offset, 36 + dataSize, true);
  offset += 4;
  writeStr('WAVE');
  writeStr('fmt ');
  view.setUint32(offset, 16, true);
  offset += 4;
  view.setUint16(offset, 1, true);
  offset += 2;
  view.setUint16(offset, numChannels, true);
  offset += 2;
  view.setUint32(offset, sampleRate, true);
  offset += 4;
  view.setUint32(offset, byteRate, true);
  offset += 4;
  view.setUint16(offset, blockAlign, true);
  offset += 2;
  view.setUint16(offset, bitsPerSample, true);
  offset += 2;
  writeStr('data');
  view.setUint32(offset, dataSize, true);
  offset += 4;
  for (let i = 0; i < numSamples; i++) {
    view.setUint8(offset++, 128);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

async function buildE2eSongWithPracticeRail(): Promise<StanzaSong> {
  const primary = createMinimalWavBlobForStanzaE2e();
  return {
    id: STANZA_E2E_PRACTICE_RAIL_SONG_ID,
    ytId: null,
    title: STANZA_E2E_PRACTICE_RAIL_SONG_TITLE,
    markers: [],
    stats: {},
    updatedAt: Date.now(),
    localAudioBlob: primary,
    localOriginalKey: 'F minor',
    localTransposeSemitones: -1,
  };
}

async function buildE2eSongWithStems(): Promise<StanzaSong> {
  const primary = createMinimalWavBlobForStanzaE2e();
  const buf = await primary.arrayBuffer();
  const stemA: StanzaStemTrack = {
    id: '__stanza_e2e_stem_a__',
    label: 'E2E stem A',
    localBlob: new Blob([buf], { type: 'audio/wav' }),
    gain: 1,
    muted: false,
  };
  const stemB: StanzaStemTrack = {
    id: '__stanza_e2e_stem_b__',
    label: 'E2E stem B',
    localBlob: new Blob([buf], { type: 'audio/wav' }),
    gain: 1,
    muted: false,
  };
  return {
    id: STANZA_E2E_STEM_SONG_ID,
    ytId: null,
    title: STANZA_E2E_STEM_SONG_TITLE,
    markers: [],
    stats: {},
    updatedAt: Date.now(),
    localAudioBlob: primary,
    stems: [stemA, stemB],
  };
}

async function buildE2eSongWithDrumsPlayback(): Promise<StanzaSong> {
  const primary = createMinimalWavBlobForStanzaE2e(4);
  return {
    id: '__stanza_e2e_drums__',
    ytId: null,
    title: 'E2E Drums Song',
    markers: [],
    stats: {},
    updatedAt: Date.now(),
    localAudioBlob: primary,
    drumsEnabled: true,
    drumPattern: 'D---D---D---D---',
  };
}

export const STANZA_E2E_LOOP_SONG_ID = '__stanza_e2e_loop__';
export const STANZA_E2E_LOOP_SONG_TITLE = 'E2E Loop Song';

export const STANZA_E2E_PLAYTHROUGH_SONG_ID = '__stanza_e2e_playthrough__';
export const STANZA_E2E_PLAYTHROUGH_SONG_TITLE = 'E2E Playthrough Song';

async function buildE2eSongWithLoopPlayback(): Promise<StanzaSong> {
  const primary = createMinimalWavBlobForStanzaE2e(2.5);
  return {
    id: STANZA_E2E_LOOP_SONG_ID,
    ytId: null,
    title: STANZA_E2E_LOOP_SONG_TITLE,
    markers: [],
    stats: {},
    updatedAt: Date.now(),
    localAudioBlob: primary,
  };
}

/** ~3s local WAV for play-through / premature-metadata e2e. */
async function buildE2eSongWithPlaythrough(): Promise<StanzaSong> {
  const durationSec = 3;
  const primary = createMinimalWavBlobForStanzaE2e(durationSec);
  return {
    id: STANZA_E2E_PLAYTHROUGH_SONG_ID,
    ytId: null,
    title: STANZA_E2E_PLAYTHROUGH_SONG_TITLE,
    markers: [],
    stats: {},
    updatedAt: Date.now(),
    localAudioBlob: primary,
    localMediaFingerprint: `${primary.size}:${durationSec.toFixed(2)}`,
  };
}

export type StanzaE2eWindowHooks = {
  seedSongWithStems: () => Promise<string>;
  seedSongWithDrumsPlayback: () => Promise<string>;
  seedSongWithLoopPlayback: () => Promise<string>;
  seedSongWithPlaythrough: () => Promise<string>;
  seedSongWithPracticeRail: () => Promise<string>;
};

declare global {
  interface Window {
    __stanzaE2e?: StanzaE2eWindowHooks;
  }
}

/**
 * Installs `window.__stanzaE2e` for Playwright. Loaded from [`main.tsx`](../main.tsx) when
 * `localStorage.STANZA_E2E_HOOKS === '1'` (set by the e2e spec via `addInitScript`) in dev builds.
 */
export function installStanzaE2eHooks(): void {
  window.__stanzaE2e = {
    async seedSongWithStems() {
      const row = await buildE2eSongWithStems();
      await stanzaDb.songs.put(row);
      writeStanzaLastSelectedSongId(row.id);
      return row.id;
    },
    async seedSongWithDrumsPlayback() {
      const row = await buildE2eSongWithDrumsPlayback();
      await stanzaDb.songs.put(row);
      writeStanzaLastSelectedSongId(row.id);
      return row.id;
    },
    async seedSongWithLoopPlayback() {
      const row = await buildE2eSongWithLoopPlayback();
      await stanzaDb.songs.put(row);
      writeStanzaLastSelectedSongId(row.id);
      return row.id;
    },
    async seedSongWithPlaythrough() {
      const row = await buildE2eSongWithPlaythrough();
      await stanzaDb.songs.put(row);
      writeStanzaLastSelectedSongId(row.id);
      return row.id;
    },
    async seedSongWithPracticeRail() {
      const row = await buildE2eSongWithPracticeRail();
      await stanzaDb.songs.put(row);
      writeStanzaLastSelectedSongId(row.id);
      return row.id;
    },
  };
}
