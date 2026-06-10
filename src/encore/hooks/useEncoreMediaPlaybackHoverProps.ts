import { useCallback, useMemo } from 'react';
import { useEncoreAuth } from '../context/EncoreAuthContext';
import { useEncoreMediaPlayback } from '../context/encoreMediaPlaybackContextStore';
import type { EncoreHoverCardPlayProps } from '../media/encoreMediaPlaybackTargets';
import type { EncoreMediaPlaybackTarget } from '../media/encorePlayableMedia';
import {
  encoreMediaTargetFromDriveFile,
  encoreMediaTargetFromMediaLink,
  encoreMediaTargetFromMiscResource,
  encoreMediaTargetFromRecordingAttachment,
} from '../media/encoreMediaPlaybackTargets';
import type { EncoreMediaLink, EncoreMiscResource, EncoreSongAttachment } from '../types';

function playPropsForTarget(
  target: EncoreMediaPlaybackTarget,
  ctx: {
    playMedia: (target: EncoreMediaPlaybackTarget) => void;
    togglePlayPause: () => void;
    isActiveMedia: (playbackId: string) => boolean;
    isMediaAudible: (playbackId: string) => boolean;
  },
  disabled?: boolean,
  disabledReason?: string,
): EncoreHoverCardPlayProps {
  return {
    onPlay: () => {
      if (ctx.isActiveMedia(target.playbackId)) ctx.togglePlayPause();
      else ctx.playMedia(target);
    },
    isPlaying: ctx.isMediaAudible(target.playbackId),
    playDisabled: disabled,
    playDisabledReason: disabledReason,
  };
}

export function useEncoreMediaPlaybackHoverProps() {
  const { googleAccessToken } = useEncoreAuth();
  const { playMedia, isActiveMedia, togglePlayPause, target, phase, transport, youtubeIsPlaying } =
    useEncoreMediaPlayback();

  const isMediaAudible = useCallback(
    (playbackId: string) => {
      if (target?.playbackId !== playbackId) return false;
      if (phase !== 'playing' && phase !== 'paused') return false;
      if (target.kind === 'youtube') return youtubeIsPlaying;
      if (target.kind === 'spotify') return phase === 'playing';
      return transport.isPlaying;
    },
    [phase, target, transport.isPlaying, youtubeIsPlaying],
  );

  const playbackCtx = useMemo(
    () => ({
      playMedia,
      togglePlayPause,
      isActiveMedia,
      isMediaAudible,
    }),
    [isActiveMedia, isMediaAudible, playMedia, togglePlayPause],
  );

  const propsForMediaLink = useCallback(
    (link: EncoreMediaLink, title: string, subtitle?: string): EncoreHoverCardPlayProps => {
      const mediaTarget = encoreMediaTargetFromMediaLink(link, title, subtitle);
      if (!mediaTarget) return {};
      return playPropsForTarget(
        mediaTarget,
        playbackCtx,
        link.source === 'drive' && !googleAccessToken,
        link.source === 'drive' && !googleAccessToken ? 'Sign in to Google to play in Encore' : undefined,
      );
    },
    [googleAccessToken, playbackCtx],
  );

  const propsForRecording = useCallback(
    (attachment: EncoreSongAttachment, title: string): EncoreHoverCardPlayProps => {
      const mediaTarget = encoreMediaTargetFromRecordingAttachment(attachment, title);
      if (!mediaTarget) return {};
      return playPropsForTarget(
        mediaTarget,
        playbackCtx,
        !googleAccessToken,
        !googleAccessToken ? 'Sign in to Google to play in Encore' : undefined,
      );
    },
    [googleAccessToken, playbackCtx],
  );

  const propsForMiscResource = useCallback(
    (resource: EncoreMiscResource): EncoreHoverCardPlayProps => {
      const mediaTarget = encoreMediaTargetFromMiscResource(resource);
      if (!mediaTarget) return {};
      return playPropsForTarget(
        mediaTarget,
        playbackCtx,
        Boolean(resource.driveFileId?.trim()) && !googleAccessToken,
        resource.driveFileId?.trim() && !googleAccessToken ? 'Sign in to Google to play in Encore' : undefined,
      );
    },
    [googleAccessToken, playbackCtx],
  );

  const propsForDriveFile = useCallback(
    (input: {
      playbackId: string;
      title: string;
      subtitle?: string;
      driveFileId?: string | null;
      mimeType?: string;
    }): EncoreHoverCardPlayProps => {
      const mediaTarget = encoreMediaTargetFromDriveFile(input);
      if (!mediaTarget) return {};
      return playPropsForTarget(
        mediaTarget,
        playbackCtx,
        !googleAccessToken,
        !googleAccessToken ? 'Sign in to Google to play in Encore' : undefined,
      );
    },
    [googleAccessToken, playbackCtx],
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
