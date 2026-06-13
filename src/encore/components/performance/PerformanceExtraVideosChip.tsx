import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { MouseEvent, ReactElement } from 'react';
import { useCallback, useId, useMemo, useState } from 'react';
import { useEncoreMediaPlaybackHoverProps } from '../../hooks/useEncoreMediaPlaybackHoverProps';
import type { EncoreHoverCardPlayProps } from '../../media/encoreMediaPlaybackTargets';
import type { EncorePerformance, EncorePerformanceVideo } from '../../types';
import { encoreHairline } from '../../theme/encoreUiTokens';
import {
  normalizeEncorePerformance,
  performanceExtraVideoCount,
} from '../../utils/performanceVideoModel';
import {
  performanceVideoOpenLabelForVideo,
  performanceVideoOpenUrlForVideo,
} from '../../utils/performanceVideoUrl';
import { PerformanceVideoPlayableThumb } from './PerformanceVideoPlayableThumb';
import { PerformanceVideoPrimaryStar } from './PerformanceVideoPrimaryStar';

export type PerformanceExtraVideosChipProps = {
  performance: EncorePerformance;
  googleAccessToken: string | null;
  songTitle?: string;
  onSetPrimaryVideo?: (performance: EncorePerformance, videoId: string) => void;
};

const BROWSE_THUMB_WIDTH = 72;

function sortVideosForBrowse(
  performance: EncorePerformance,
  videos: EncorePerformanceVideo[],
): EncorePerformanceVideo[] {
  const primaryId = performance.primaryVideoId ?? videos[0]?.id;
  const primary = videos.find((v) => v.id === primaryId);
  const rest = videos.filter((v) => v.id !== primaryId);
  return primary ? [primary, ...rest] : videos;
}

function performanceShellForVideo(
  performance: EncorePerformance,
  video: EncorePerformanceVideo,
): EncorePerformance {
  return {
    ...performance,
    videos: [video],
    primaryVideoId: video.id,
    videoTargetDriveFileId: video.videoTargetDriveFileId,
    videoShortcutDriveFileId: video.videoShortcutDriveFileId,
    externalVideoUrl: video.externalVideoUrl,
  };
}

function PerformanceVideoBrowseRow(props: {
  video: EncorePerformanceVideo;
  performance: EncorePerformance;
  isPrimary: boolean;
  googleAccessToken: string | null;
  playProps: EncoreHoverCardPlayProps;
  onSetPrimary?: () => void;
}): ReactElement {
  const { video, performance, isPrimary, googleAccessToken, playProps, onSetPrimary } = props;
  const pseudo = performanceShellForVideo(performance, video);
  const openUrl = performanceVideoOpenUrlForVideo(video);
  const openLabel = performanceVideoOpenLabelForVideo(video);
  const label = video.label?.trim() || 'Video';

  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 0.75, minWidth: 0 }}>
      <PerformanceVideoPlayableThumb
        performance={pseudo}
        width={BROWSE_THUMB_WIDTH}
        googleAccessToken={googleAccessToken}
        playProps={playProps}
        isPrimary={isPrimary}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap title={label}>
          {label}
        </Typography>
      </Box>
      <Stack direction="row" alignItems="center" spacing={0.25} sx={{ flexShrink: 0 }}>
        {openUrl ? (
          <Tooltip title={openLabel ?? 'Open video'}>
            <IconButton
              size="small"
              component="a"
              href={openUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={openLabel ?? 'Open video'}
            >
              <OpenInNewIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        ) : null}
        <PerformanceVideoPrimaryStar
          isPrimary={isPrimary}
          onMakePrimary={onSetPrimary}
          iconSize={16}
        />
      </Stack>
    </Stack>
  );
}

/** Clickable "+N videos" chip — opens a popover to browse and play every clip in the stack. */
export function PerformanceExtraVideosChip(props: PerformanceExtraVideosChipProps): ReactElement | null {
  const { performance, googleAccessToken, songTitle, onSetPrimaryVideo } = props;
  const extraVideos = performanceExtraVideoCount(performance);
  const popoverId = useId();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const { propsForPerformanceVideo } = useEncoreMediaPlaybackHoverProps();

  const normalized = useMemo(() => normalizeEncorePerformance(performance), [performance]);
  const videos = useMemo(
    () => sortVideosForBrowse(normalized, normalized.videos ?? []),
    [normalized],
  );
  const primaryId = normalized.primaryVideoId ?? videos[0]?.id;
  const titleParts = useMemo(
    () => ({ songTitle, venue: normalized.venueTag }),
    [normalized.venueTag, songTitle],
  );

  const close = useCallback(() => setAnchorEl(null), []);

  const openFromChip = useCallback((event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  }, []);

  if (extraVideos <= 0) return null;

  const totalVideos = videos.length;
  const popoverOpen = Boolean(anchorEl);

  return (
    <>
      <Chip
        size="small"
        label={`+${extraVideos} video${extraVideos === 1 ? '' : 's'}`}
        variant="outlined"
        onClick={openFromChip}
        aria-haspopup="dialog"
        aria-expanded={popoverOpen}
        aria-controls={popoverOpen ? popoverId : undefined}
        title="View all videos"
        sx={{
          height: 22,
          fontWeight: 600,
          cursor: 'pointer',
          '&:hover': { bgcolor: 'action.hover' },
        }}
      />
      <Popover
        id={popoverId}
        open={popoverOpen}
        anchorEl={anchorEl}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              mt: 0.75,
              width: 320,
              maxWidth: 'calc(100vw - 24px)',
              borderRadius: 1.5,
              border: 1,
              borderColor: encoreHairline,
              boxShadow: 3,
            },
          },
        }}
      >
        <Box sx={{ px: 1.5, pt: 1.25, pb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.25 }}>
            {totalVideos === 1 ? '1 video' : `${totalVideos} videos`}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
            Play or open any clip from this performance.
          </Typography>
          <Stack
            divider={<Divider sx={{ borderColor: encoreHairline }} />}
            spacing={0}
            component="ul"
            sx={{ listStyle: 'none', m: 0, p: 0, maxHeight: 360, overflowY: 'auto' }}
          >
            {videos.map((video) => (
              <Box component="li" key={video.id}>
                <PerformanceVideoBrowseRow
                  video={video}
                  performance={normalized}
                  isPrimary={video.id === primaryId}
                  googleAccessToken={googleAccessToken}
                  playProps={propsForPerformanceVideo(normalized, video, titleParts)}
                  onSetPrimary={
                    onSetPrimaryVideo && video.id !== primaryId
                      ? () => onSetPrimaryVideo(normalized, video.id)
                      : undefined
                  }
                />
              </Box>
            ))}
          </Stack>
        </Box>
      </Popover>
    </>
  );
}
