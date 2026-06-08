import { useCallback, useMemo } from 'react';
import { useEncoreAuth } from '../context/EncoreAuthContext';
import { useEncoreMediaPlayback } from '../context/encoreMediaPlaybackContextStore';
import type { EncoreHoverCardPlayProps } from '../media/encoreMediaPlaybackTargets';
import {
  encoreMediaTargetFromDriveFile,
  encoreMediaTargetFromMediaLink,
  encoreMediaTargetFromMiscResource,
  encoreMediaTargetFromRecordingAttachment,
} from '../media/encoreMediaPlaybackTargets';
import type { EncoreMediaLink, EncoreMiscResource, EncoreSongAttachment } from '../types';

export function useEncoreMediaPlaybackHoverProps() {
  const { googleAccessToken } = useEncoreAuth();
  const { playMedia, isActiveMedia } = useEncoreMediaPlayback();

  const propsForMediaLink = useCallback(
    (link: EncoreMediaLink, title: string, subtitle?: string): EncoreHoverCardPlayProps => {
      const target = encoreMediaTargetFromMediaLink(link, title, subtitle);
      if (!target) return {};
      return {
        onPlay: () => playMedia(target),
        isPlaying: isActiveMedia(target.playbackId),
        playDisabled: link.source === 'drive' && !googleAccessToken,
        playDisabledReason:
          link.source === 'drive' && !googleAccessToken ? 'Sign in to Google to play in Encore' : undefined,
      };
    },
    [googleAccessToken, isActiveMedia, playMedia],
  );

  const propsForRecording = useCallback(
    (attachment: EncoreSongAttachment, title: string): EncoreHoverCardPlayProps => {
      const target = encoreMediaTargetFromRecordingAttachment(attachment, title);
      if (!target) return {};
      return {
        onPlay: () => playMedia(target),
        isPlaying: isActiveMedia(target.playbackId),
        playDisabled: !googleAccessToken,
        playDisabledReason: !googleAccessToken ? 'Sign in to Google to play in Encore' : undefined,
      };
    },
    [googleAccessToken, isActiveMedia, playMedia],
  );

  const propsForMiscResource = useCallback(
    (resource: EncoreMiscResource): EncoreHoverCardPlayProps => {
      const target = encoreMediaTargetFromMiscResource(resource);
      if (!target) return {};
      return {
        onPlay: () => playMedia(target),
        isPlaying: isActiveMedia(target.playbackId),
        playDisabled: Boolean(resource.driveFileId?.trim()) && !googleAccessToken,
        playDisabledReason:
          resource.driveFileId?.trim() && !googleAccessToken ? 'Sign in to Google to play in Encore' : undefined,
      };
    },
    [googleAccessToken, isActiveMedia, playMedia],
  );

  const propsForDriveFile = useCallback(
    (input: {
      playbackId: string;
      title: string;
      subtitle?: string;
      driveFileId?: string | null;
      mimeType?: string;
    }): EncoreHoverCardPlayProps => {
      const target = encoreMediaTargetFromDriveFile(input);
      if (!target) return {};
      return {
        onPlay: () => playMedia(target),
        isPlaying: isActiveMedia(target.playbackId),
        playDisabled: !googleAccessToken,
        playDisabledReason: !googleAccessToken ? 'Sign in to Google to play in Encore' : undefined,
      };
    },
    [googleAccessToken, isActiveMedia, playMedia],
  );

  return useMemo(
    () => ({
      propsForMediaLink,
      propsForRecording,
      propsForMiscResource,
      propsForDriveFile,
    }),
    [propsForDriveFile, propsForMediaLink, propsForMiscResource, propsForRecording],
  );
}
