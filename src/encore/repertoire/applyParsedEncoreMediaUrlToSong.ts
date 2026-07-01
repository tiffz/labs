import type { EncoreSong } from '../types';
import {
  appendDriveBackingLink,
  appendDriveReferenceLink,
  appendSpotifyBackingLink,
  appendSpotifyReferenceLink,
  appendYoutubeBackingLink,
  appendYoutubeReferenceLink,
} from './songMediaLinks';
import type { ParsedEncoreMediaUrl } from './parseEncoreMediaUrlInput';

export type EncoreMediaUrlPlacement = 'reference' | 'backing';

export function applyParsedEncoreMediaUrlToSong(
  song: EncoreSong,
  parsed: ParsedEncoreMediaUrl,
  placement: EncoreMediaUrlPlacement,
): EncoreSong | null {
  if (parsed.kind === 'stanza_local_fingerprint') return null;

  if (placement === 'reference') {
    if (parsed.kind === 'spotify') return appendSpotifyReferenceLink(song, parsed.trackId);
    if (parsed.kind === 'youtube') return appendYoutubeReferenceLink(song, parsed.rawInput);
    if (parsed.kind === 'drive') {
      return appendDriveReferenceLink(song, parsed.driveFileId, { label: parsed.label ?? 'Drive file' });
    }
    return null;
  }

  if (parsed.kind === 'spotify') return appendSpotifyBackingLink(song, parsed.trackId);
  if (parsed.kind === 'youtube') return appendYoutubeBackingLink(song, parsed.rawInput);
  if (parsed.kind === 'drive') {
    return appendDriveBackingLink(song, parsed.driveFileId, { label: parsed.label ?? 'Drive file' });
  }
  return null;
}
