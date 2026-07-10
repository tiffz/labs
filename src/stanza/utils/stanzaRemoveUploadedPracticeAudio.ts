import type { StanzaSong } from '../db/stanzaDb';

/** Strip uploaded practice audio from a YouTube (or other) row while keeping markers and YouTube id. */
export function stanzaSongAfterRemovingUploadedPracticeAudio(row: StanzaSong): StanzaSong {
  const next: StanzaSong = { ...row, updatedAt: Date.now() };
  delete next.localAudioBlob;
  delete next.localMediaFingerprint;
  delete next.localVideoThumbnailBlob;
  delete next.practiceSource;
  delete next.localTransposeSemitones;
  delete next.localOriginalKey;
  delete next.analysisCache;
  delete next.driveMainMediaBytesFingerprint;
  return next;
}
