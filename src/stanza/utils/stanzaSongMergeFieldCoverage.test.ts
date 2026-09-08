import { describe, expect, it } from 'vitest';
import { mergeStanzaRicherSongMetadataWithReport } from './stanzaSongMetadataMerge';
import { STANZA_SONG_MERGE_POLICY } from './stanzaSongMergePolicy';
import type { StanzaSong } from '../db/stanzaDb';

/**
 * Field-coverage contract for the song merge.
 *
 * `mergeStanzaRicherSongMetadataWithReport` starts from `{ ...local }` and then hand-enumerates
 * the fields it resolves. Any field NOT in that list silently keeps the local value forever —
 * remote edits to it are dropped with no error, no conflict prompt, and nothing in the merge
 * report. That is invisible partial sync: "some parts of songs sync and others don't".
 *
 * Two fields were missing when this test was written, both verified against the shipped code:
 *
 *  - `driveMainMediaBytesFingerprint` — drives `mainMediaNeedsDriveUpload`. A device that adopts
 *    the remote `driveSourceFileId` (which IS merged) but keeps its own empty fingerprint
 *    concludes the bytes need uploading, re-uploads them, and trashes the file the other device
 *    just made — with the trash step wrapped in a swallowed catch. That is the duplicate-file
 *    churn the owner reported.
 *  - `encoreSongId` — the Encore federation link (ADR 0007) never reaches a second device.
 *
 * `ytId` is deliberately NOT merged: the YouTube tombstone guard in `stanzaDriveMerge` only runs
 * on the remote-only branch, so on the merge path local-wins is the only thing stopping a
 * removed video from being resurrected by a stale remote row. See the policy entry.
 */

function song(overrides: Partial<StanzaSong> = {}): StanzaSong {
  return {
    id: 's1',
    ytId: null,
    title: 'Song',
    markers: [],
    stats: {},
    updatedAt: 1000,
    ...overrides,
  } as StanzaSong;
}

describe('song merge field coverage', () => {
  it('adopts the remote main-media bytes fingerprint so the file is not re-uploaded', () => {
    // Device B: has the same bytes, no fingerprint of its own, remote knows the upload already
    // happened. Without this, B re-uploads and trashes A's file.
    const local = song({ updatedAt: 10, localAudioBlob: new Blob(['x']) } as Partial<StanzaSong>);
    const remote = song({
      updatedAt: 20,
      driveSourceFileId: 'file-A',
      driveMainMediaBytesFingerprint: '1:audio/mpeg',
    });

    const merged = mergeStanzaRicherSongMetadataWithReport(local, remote).song;

    expect(merged.driveMainMediaBytesFingerprint).toBe('1:audio/mpeg');
  });

  it('does not let a remote fingerprint overwrite a newer local one', () => {
    const local = song({ updatedAt: 99, driveMainMediaBytesFingerprint: 'local-fp' });
    const remote = song({ updatedAt: 1, driveMainMediaBytesFingerprint: 'remote-fp' });

    const merged = mergeStanzaRicherSongMetadataWithReport(local, remote).song;

    expect(merged.driveMainMediaBytesFingerprint).toBe('local-fp');
  });

  it('propagates the Encore federation link to a device that lacks it', () => {
    const local = song({ updatedAt: 10 });
    const remote = song({ updatedAt: 20, encoreSongId: 'encore-123' });

    const merged = mergeStanzaRicherSongMetadataWithReport(local, remote).song;

    expect(merged.encoreSongId).toBe('encore-123');
  });

  it('keeps a locally-removed YouTube id removed', () => {
    // The merge path has no tombstone check; local-wins is the guard. If ytId ever becomes
    // `local.ytId ?? remote.ytId`, a stale remote row resurrects a video the user deleted.
    const local = song({ updatedAt: 20, ytId: null });
    const remote = song({ updatedAt: 99, ytId: 'dQw4w9WgXcQ' });

    const merged = mergeStanzaRicherSongMetadataWithReport(local, remote).song;

    expect(merged.ytId).toBeNull();
  });

  it('every StanzaSong field has a recorded merge disposition', () => {
    // The `satisfies Record<keyof StanzaSong, ...>` on the policy is the real enforcement — it is
    // a COMPILE error to add a field without classifying it. This asserts the runtime table is
    // not empty and that the three dispositions are the only ones in use.
    const dispositions = new Set(Object.values(STANZA_SONG_MERGE_POLICY));
    expect(dispositions.size).toBeGreaterThan(0);
    for (const d of dispositions) {
      expect(['merged', 'local-only', 'local-blob']).toContain(d);
    }
  });

  it('every field marked `merged` actually resolves from remote when remote is newer', () => {
    // Catches the drift directly: a field classified `merged` but forgotten in the merge body.
    // Uses sentinel values so "unchanged local" is distinguishable from "adopted remote".
    const mergedFields = (
      Object.entries(STANZA_SONG_MERGE_POLICY) as [keyof StanzaSong, string][]
    )
      .filter(([, d]) => d === 'merged')
      // Structured/among-both fields have their own dedicated merge tests; this sweep covers the
      // scalar "local ?? remote" ones, where silent drift is the failure mode.
      .filter(([f]) => !['markers', 'stats', 'updatedAt', 'title', 'id'].includes(f as string));

    const unresolved: string[] = [];
    for (const field of mergedFields) {
      const [name] = field;
      const local = song({ updatedAt: 10 });
      const remote = song({ updatedAt: 20, [name]: SENTINEL[name as string] } as Partial<StanzaSong>);
      if (SENTINEL[name as string] === undefined) continue;
      const merged = mergeStanzaRicherSongMetadataWithReport(local, remote).song;
      if ((merged as unknown as Record<string, unknown>)[name as string] !== SENTINEL[name as string]) {
        unresolved.push(name as string);
      }
    }
    expect(unresolved, 'classified `merged` but the merge body never reads remote').toEqual([]);
  });
});

/** Distinguishable non-default values per field; omitted fields are skipped by the sweep. */
const SENTINEL: Record<string, unknown> = {
  driveSourceFileId: 'remote-file',
  encoreSongId: 'remote-encore',
  driveMainMediaBytesFingerprint: 'remote-fp',
  localMediaFingerprint: 'remote-media-fp',
  primaryGain: 0.33,
  primaryMuted: true,
  localTransposeSemitones: 7,
  practiceSource: 'local',
  localOriginalKey: 'Am',
  metronomeTimingScope: 'section',
  metronomeGain: 0.42,
  metronomeMuted: true,
  drumPattern: 'K---K---K---K---',
  drumsGain: 0.21,
  drumsMuted: true,
};

describe('playbackRate', () => {
  it('is merged, not local-only', () => {
    // Per-song practice setting, like the mix gains: the speed you need for a hard passage belongs
    // to the song, not to the laptop you set it on. It was React state only until 2026-09-07 and
    // reset to 1x on every reload, which read as "my settings did not save".
    expect(STANZA_SONG_MERGE_POLICY.playbackRate).toBe('merged');
  });
});
