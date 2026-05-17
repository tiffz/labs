import type { EncoreSong } from '../types';

/**
 * Single chokepoint for flipping a song's {@link EncoreSong.practicing} flag. Returns a NEW
 * song with the appropriate companion fields set:
 *
 * - Turning practicing ON also **clears** any {@link EncoreSong.practiceRemovedAt} tombstone, so
 *   the song stays in the practice queue across future Spotify Learning Playlist syncs.
 *   Without this clear, a song the user re-adds would still be ignored by the sync engine and
 *   silently fall out again on the next round-trip.
 *
 * - Turning practicing OFF **sets** `practiceRemovedAt = nowIso`. The sync engine reads this
 *   to know "the user explicitly removed this from practice" and therefore does NOT re-flip
 *   `practicing` to true even when the song still appears in the upstream Spotify playlist.
 *
 * - `updatedAt` is always bumped to `nowIso` so sync ordering treats this as the latest write.
 *
 * Always go through this helper rather than spreading `{ ...song, practicing: x, updatedAt: y }`
 * directly — it's the only place that knows about the tombstone contract, and the deletion-aware
 * sync depends on the contract holding across every call site (AddToPracticeDialog, Library
 * checkbox, SongPage switch, bulk actions, stop-practicing row action, etc.).
 */
export function withPracticingToggle(
  song: EncoreSong,
  practicing: boolean,
  nowIso: string = new Date().toISOString(),
): EncoreSong {
  if (practicing) {
    // Strip practiceRemovedAt explicitly so the field is gone from the persisted row (not just
    // shadowed). The Drive wire layer treats absent and undefined the same, but Dexie + sync
    // diffs benefit from a clean shape.
    const { practiceRemovedAt: _removed, ...rest } = song;
    void _removed;
    return { ...rest, practicing: true, updatedAt: nowIso };
  }
  return { ...song, practicing: false, practiceRemovedAt: nowIso, updatedAt: nowIso };
}
