import type { EncoreMediaLink, EncoreMiscResource, EncoreSongAttachment } from '../types';
import type { EncoreMediaPlaybackTarget } from './encorePlayableMedia';
import {
  encoreDriveMediaPlaybackId,
  encoreDrivePlaybackKind,
  encoreSpotifyMediaPlaybackId,
  encoreYoutubeMediaPlaybackId,
  isEncorePlayableDriveMime,
  resolveEncoreDriveMediaMime,
} from './encorePlayableMedia';
import { parseYoutubeVideoId } from '../youtube/parseYoutubeVideoUrl';

export function encoreMediaTargetFromDriveFile(input: {
  playbackId: string;
  title: string;
  subtitle?: string;
  driveFileId?: string | null;
  mimeType?: string;
  /** When mime is unknown, assume audio (reference / take uploads). */
  assumeAudioWhenMimeUnknown?: boolean;
}): EncoreMediaPlaybackTarget | null {
  const driveFileId = input.driveFileId?.trim();
  if (!driveFileId) return null;
  const resolvedMime = resolveEncoreDriveMediaMime({
    fileName: input.title,
    mimeType: input.mimeType,
  });
  const kind =
    encoreDrivePlaybackKind(resolvedMime) ??
    (input.assumeAudioWhenMimeUnknown !== false ? 'drive-audio' : null);
  if (!kind) return null;
  if (
    isEncorePlayableDriveMime(resolvedMime) === false &&
    resolvedMime !== 'application/octet-stream'
  ) {
    return null;
  }
  return {
    playbackId: input.playbackId,
    kind,
    title: input.title,
    subtitle: input.subtitle,
    driveFileId,
    mimeType: resolvedMime !== 'application/octet-stream' ? resolvedMime : input.mimeType,
  };
}

export function encoreMediaTargetFromMediaLink(
  link: EncoreMediaLink,
  title: string,
  subtitle?: string,
): EncoreMediaPlaybackTarget | null {
  if (link.source === 'spotify') {
    const trackId = link.spotifyTrackId?.trim();
    if (!trackId) return null;
    return {
      playbackId: encoreSpotifyMediaPlaybackId(trackId),
      kind: 'spotify',
      title,
      subtitle: subtitle ?? 'Spotify',
      spotifyTrackId: trackId,
    };
  }
  if (link.source === 'youtube') {
    const videoId = parseYoutubeVideoId(link.youtubeVideoId ?? '') ?? link.youtubeVideoId?.trim();
    if (!videoId) return null;
    return {
      playbackId: encoreYoutubeMediaPlaybackId(videoId),
      kind: 'youtube',
      title,
      subtitle: subtitle ?? 'YouTube',
      youtubeVideoId: videoId,
    };
  }
  if (link.source === 'drive') {
    return encoreMediaTargetFromDriveFile({
      playbackId: encoreDriveMediaPlaybackId(link.driveFileId ?? ''),
      title,
      subtitle: subtitle ?? 'Google Drive',
      driveFileId: link.driveFileId,
    });
  }
  return null;
}

export function encoreMediaTargetFromRecordingAttachment(
  attachment: EncoreSongAttachment,
  title: string,
): EncoreMediaPlaybackTarget | null {
  return encoreMediaTargetFromDriveFile({
    playbackId: encoreDriveMediaPlaybackId(attachment.driveFileId),
    title,
    subtitle: 'Take',
    driveFileId: attachment.driveFileId,
  });
}

export function encoreMediaTargetFromMiscResource(resource: EncoreMiscResource): EncoreMediaPlaybackTarget | null {
  const resolvedMime = resolveEncoreDriveMediaMime({
    fileName: resource.label,
    mimeType: resource.mimeType,
  });
  if (
    resource.kind === 'audio' ||
    isEncorePlayableDriveMime(resolvedMime) ||
    isEncorePlayableDriveMime(resource.mimeType)
  ) {
    return encoreMediaTargetFromDriveFile({
      playbackId: `misc:${resource.id}`,
      title: resource.label,
      subtitle: resource.kind,
      driveFileId: resource.driveFileId,
      mimeType: resource.mimeType,
      assumeAudioWhenMimeUnknown: resource.kind === 'audio',
    });
  }
  return null;
}

export type EncoreHoverCardPlayProps = {
  onPlay?: () => void;
  isPlaying?: boolean;
  playDisabled?: boolean;
  playDisabledReason?: string;
};
