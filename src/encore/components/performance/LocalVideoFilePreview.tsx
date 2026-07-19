import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { useCallback, useRef, useState, type ReactElement } from 'react';
import { encoreHairline, encoreRadius } from '../../theme/encoreUiTokens';
import { useLocalVideoObjectUrl } from './useLocalVideoObjectUrl';
import { useStopVideoWhenInactive } from './useStopVideoWhenInactive';

/** Max width when {@link maxHeightPx} caps a 16:9 frame (default layout). */
const PREVIEW_MAX_HEIGHT_PX = 220;
const EDITOR_PREVIEW_MAX_HEIGHT_PX = 132;
const EDITOR_PREVIEW_MAX_WIDTH_PX = 234;

export type LocalVideoFilePreviewLayout = 'default' | 'editor';

export type LocalVideoFilePreviewProps = {
  file: File;
  /** Cap preview height; width scales down to preserve 16:9. */
  maxHeightPx?: number;
  /** `editor` — compact, left-aligned clip for performance modals. */
  layout?: LocalVideoFilePreviewLayout;
  /** When false, pause playback (modal closing). */
  playbackActive?: boolean;
};

/**
 * Device-file video preview for performance upload flows.
 * Uses a fixed 16:9 frame + native `<video>` so flex parents do not squash the picture.
 */
export function LocalVideoFilePreview(props: LocalVideoFilePreviewProps): ReactElement {
  const { file, layout = 'default', maxHeightPx: maxHeightPxProp, playbackActive = true } = props;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playbackError, setPlaybackError] = useState(false);

  useStopVideoWhenInactive(playbackActive, videoRef);

  const maxHeightPx =
    maxHeightPxProp ?? (layout === 'editor' ? EDITOR_PREVIEW_MAX_HEIGHT_PX : PREVIEW_MAX_HEIGHT_PX);
  const maxWidthPx =
    layout === 'editor'
      ? EDITOR_PREVIEW_MAX_WIDTH_PX
      : Math.round((maxHeightPx * 16) / 9);

  const previewUrl = useLocalVideoObjectUrl(file);

  const handleLoadedMetadata = useCallback(() => {
    setPlaybackError(false);
    const el = videoRef.current;
    if (!el) return;
    try {
      if (el.currentTime === 0) {
        el.currentTime = 0.001;
      }
    } catch {
      /* Some browsers block seeking before enough data is buffered. */
    }
  }, []);

  return (
    <Box
      sx={{
        width: `min(100%, ${maxWidthPx}px)`,
        aspectRatio: '16 / 9',
        mx: layout === 'editor' ? 0 : 'auto',
        flexShrink: 0,
        borderRadius: encoreRadius,
        overflow: 'hidden',
        bgcolor: 'common.black',
        border: layout === 'editor' ? 1 : 0,
        borderColor: encoreHairline,
        position: 'relative',
      }}
    >
      {previewUrl ? (
        /* eslint-disable-next-line jsx-a11y/media-has-caption -- user-provided performance clip */
        (<video
          ref={videoRef}
          key={previewUrl}
          src={previewUrl}
          controls
          playsInline
          preload="auto"
          onLoadedMetadata={handleLoadedMetadata}
          onError={() => setPlaybackError(true)}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />)
      ) : null}
      {playbackError ? (
        <Box
          sx={(theme) => ({
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: 1.5,
            textAlign: 'center',
            bgcolor: alpha(theme.palette.common.black, 0.72),
          })}
        >
          <Typography variant="caption" sx={{ color: 'common.white', lineHeight: 1.45 }}>
            Preview unavailable in this browser. The file will still upload.
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
}
