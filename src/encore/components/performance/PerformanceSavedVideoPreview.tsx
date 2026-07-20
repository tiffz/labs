import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import LabsYouTubePlayer from '../../../shared/youtube/LabsYouTubePlayer';
import { resolveEncoreDriveMediaForPlayback } from '../../media/encoreDriveMediaPlaybackCache';
import { encoreDriveMediaPlaybackErrorMessage } from '../../media/loadEncoreDriveMediaObjectUrl';
import { encoreHairline, encoreRadius } from '../../theme/encoreUiTokens';
import type { EncorePerformance } from '../../types';
import { getPrimaryPerformanceVideo } from '../../utils/performanceVideoModel';
import { parseYoutubeVideoId } from '../../youtube/parseYoutubeVideoUrl';
import { PerformanceVideoThumb } from '../PerformanceVideoThumb';
import { useStopVideoWhenInactive } from './useStopVideoWhenInactive';

export const PERFORMANCE_EDITOR_VIDEO_PREVIEW_MAX_WIDTH_PX = 234;

type PreviewMode = 'thumb' | 'loading' | 'playing' | 'error';

function driveVideoFileId(performance: EncorePerformance): string | null {
  const video = getPrimaryPerformanceVideo(performance);
  if (!video) return null;
  return video.videoShortcutDriveFileId?.trim() || video.videoTargetDriveFileId?.trim() || null;
}

function externalVideoUrl(performance: EncorePerformance): string | null {
  return getPrimaryPerformanceVideo(performance)?.externalVideoUrl?.trim() || null;
}

/** Left-aligned saved-video preview for the performance editor — play Drive clips inline. */
export function PerformanceSavedVideoPreview(props: {
  performance: EncorePerformance;
  googleAccessToken: string | null;
  /** When false, pause playback and tear down embeds (modal closing). */
  playbackActive?: boolean;
}): ReactElement {
  const { performance, googleAccessToken, playbackActive = true } = props;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const driveLoadGen = useRef(0);
  const [mode, setMode] = useState<PreviewMode>('thumb');
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useStopVideoWhenInactive(playbackActive, videoRef);

  const ext = externalVideoUrl(performance);
  const youtubeId = ext ? parseYoutubeVideoId(ext) : null;
  const driveId = driveVideoFileId(performance);
  const directExternal = ext && !youtubeId ? ext : null;

  useEffect(() => {
    if (!playbackActive) {
      driveLoadGen.current += 1;
      setMode('thumb');
      setObjectUrl(null);
      setErrorMessage(null);
      return;
    }
    setMode(directExternal || youtubeId ? 'playing' : 'thumb');
    setObjectUrl(null);
    setErrorMessage(null);
  }, [performance.id, ext, youtubeId, driveId, directExternal, playbackActive]);

  const handlePlayDrive = useCallback(async () => {
    if (!driveId || !playbackActive) return;
    if (!googleAccessToken) {
      setMode('error');
      setErrorMessage('Sign in with Google to preview this video.');
      return;
    }
    setMode('loading');
    setErrorMessage(null);
    const gen = ++driveLoadGen.current;
    try {
      const loaded = await resolveEncoreDriveMediaForPlayback({
        accessToken: googleAccessToken,
        driveFileId: driveId,
        mimeTypeHint: 'video/mp4',
      });
      if (gen !== driveLoadGen.current) return;
      if (loaded.kind !== 'drive-video') {
        setMode('error');
        setErrorMessage('That file is not a video.');
        return;
      }
      setObjectUrl(loaded.objectUrl);
      setMode('playing');
    } catch (err) {
      if (gen !== driveLoadGen.current) return;
      setMode('error');
      setErrorMessage(encoreDriveMediaPlaybackErrorMessage(err));
    }
  }, [driveId, googleAccessToken, playbackActive]);

  const frameSx = {
    width: `min(100%, ${PERFORMANCE_EDITOR_VIDEO_PREVIEW_MAX_WIDTH_PX}px)`,
    aspectRatio: '16 / 9',
    mx: 0,
    flexShrink: 0,
    borderRadius: encoreRadius,
    overflow: 'hidden',
    bgcolor: 'common.black',
    border: 1,
    borderColor: encoreHairline,
    position: 'relative',
  } as const;

  if (youtubeId && playbackActive) {
    return (
      <Box
        sx={{
          ...frameSx,
          '& .performance-editor-youtube-preview-host': { width: '100%', height: '100%' },
          '& .performance-editor-youtube-preview-iframe, & .performance-editor-youtube-preview-iframe iframe': {
            width: '100%',
            height: '100%',
          },
        }}
      >
        <LabsYouTubePlayer
          videoId={youtubeId}
          hostClassName="performance-editor-youtube-preview-host"
          iframeClassName="performance-editor-youtube-preview-iframe"
        />
      </Box>
    );
  }

  if (directExternal && playbackActive) {
    return (
      <Box sx={frameSx}>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption -- user-provided performance clip */}
        <video
          ref={videoRef}
          src={directExternal}
          controls
          playsInline
          preload="metadata"
          onError={() => {
            setMode('error');
            setErrorMessage('Preview unavailable for this link.');
          }}
          style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }}
        />
        {mode === 'error' ? (
          <PreviewErrorOverlay message={errorMessage ?? 'Preview unavailable for this link.'} />
        ) : null}
      </Box>
    );
  }

  if (mode === 'playing' && objectUrl) {
    return (
      <Box sx={frameSx}>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption -- user-provided performance clip */}
        <video
          ref={videoRef}
          src={objectUrl}
          controls
          playsInline
          preload="auto"
          style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </Box>
    );
  }

  if (mode === 'loading') {
    return (
      <Box sx={{ ...frameSx, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={28} sx={{ color: 'common.white' }} aria-label="Loading video preview" />
      </Box>
    );
  }

  if (mode === 'error') {
    return (
      <Box sx={{ ...frameSx, bgcolor: 'action.hover' }}>
        <PreviewErrorOverlay message={errorMessage ?? 'Could not load preview.'} dark={false} />
      </Box>
    );
  }

  const thumbWidth = PERFORMANCE_EDITOR_VIDEO_PREVIEW_MAX_WIDTH_PX;

  return (
    <Box sx={frameSx}>
      <PerformanceVideoThumb
        performance={performance}
        width={thumbWidth}
        googleAccessToken={googleAccessToken}
      />
      {driveId ? (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha('#000', 0.28),
          }}
        >
          <IconButton
            aria-label="Play video preview"
            onClick={() => void handlePlayDrive()}
            sx={(theme) => ({
              bgcolor: alpha(theme.palette.background.paper, 0.92),
              color: 'primary.main',
              '&:hover': { bgcolor: theme.palette.background.paper },
            })}
          >
            <PlayArrowIcon sx={{ fontSize: 32 }} />
          </IconButton>
        </Box>
      ) : (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'action.hover',
          }}
        >
          <VideocamOutlinedIcon sx={{ fontSize: 32, color: 'text.secondary', opacity: 0.55 }} aria-hidden />
        </Box>
      )}
    </Box>
  );
}

function PreviewErrorOverlay(props: { message: string; dark?: boolean }): ReactElement {
  const { message, dark = true } = props;
  return (
    <Box
      sx={(theme) => ({
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 1.5,
        textAlign: 'center',
        bgcolor: dark ? alpha(theme.palette.common.black, 0.72) : alpha(theme.palette.background.paper, 0.92),
      })}
    >
      <Typography variant="caption" sx={{ color: dark ? 'common.white' : 'text.secondary', lineHeight: 1.45 }}>
        {message}
      </Typography>
    </Box>
  );
}
