import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { ReactElement, ReactNode } from 'react';
import { encoreHairline, encoreRadius } from '../../theme/encoreUiTokens';
import { PERFORMANCE_EDITOR_VIDEO_PREVIEW_MAX_WIDTH_PX } from './PerformanceSavedVideoPreview';
import { LocalVideoFilePreview } from './LocalVideoFilePreview';

export type PerformanceStagedVideoRowProps = {
  /** Local file staged for upload on save. */
  file?: File | null;
  /** Drive or external link label when no local file. */
  linkLabel?: string | null;
  uploading?: boolean;
  /** When false, pause inline previews (modal closing). */
  playbackActive?: boolean;
  onRemove: () => void;
  /** e.g. Keep existing — only when replacing a single saved clip. */
  extraActions?: ReactNode;
};

/** One queued clip inside the unified add-videos panel. */
export function PerformanceStagedVideoRow(props: PerformanceStagedVideoRowProps): ReactElement {
  const { file, linkLabel, uploading, playbackActive = true, onRemove, extraActions } = props;
  const title = file?.name ?? linkLabel ?? 'Linked video';

  return (
    <Stack direction="row" spacing={1.25} alignItems="flex-start">
      {file ? (
        <LocalVideoFilePreview file={file} layout="editor" playbackActive={playbackActive} />
      ) : (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: `min(100%, ${PERFORMANCE_EDITOR_VIDEO_PREVIEW_MAX_WIDTH_PX}px)`,
            aspectRatio: '16 / 9',
            flexShrink: 0,
            borderRadius: encoreRadius,
            bgcolor: 'action.hover',
            border: 1,
            borderColor: encoreHairline,
          }}
        >
          <VideocamOutlinedIcon sx={{ fontSize: 28, color: 'text.secondary', opacity: 0.55 }} aria-hidden />
        </Box>
      )}
      <Box sx={{ flex: 1, minWidth: 0, pt: 0.125 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.35, color: 'text.secondary' }} noWrap title={title}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25, lineHeight: 1.4 }}>
          {uploading ? 'Uploading…' : 'Uploads when you save'}
        </Typography>
        {extraActions ? (
          <Stack direction="row" flexWrap="wrap" gap={0.5} useFlexGap sx={{ mt: 0.75 }}>
            {extraActions}
          </Stack>
        ) : null}
      </Box>
      <Tooltip title="Remove">
        <span>
          <IconButton
            size="small"
            aria-label="Remove staged video"
            disabled={uploading}
            onClick={onRemove}
            sx={{ mt: -0.25, color: 'text.secondary' }}
          >
            <DeleteOutlineIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}
