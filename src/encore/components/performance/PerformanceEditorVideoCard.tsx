import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import type { ReactElement } from 'react';
import { encorePerformanceVideoPanelSx } from '../../theme/encoreUiTokens';
import type { EncorePerformance, EncorePerformanceVideo } from '../../types';
import { PerformanceVideoPrimaryRowAction } from './PerformanceVideoPrimaryStar';
import {
  PerformanceVideoInlineLinkField,
  type PerformanceVideoInlineLinkFieldProps,
} from './PerformanceVideoInlineLinkField';
import { PerformanceSavedVideoPreview } from './PerformanceSavedVideoPreview';

export type PerformanceEditorVideoCardProps = {
  video: EncorePerformanceVideo;
  performanceShell: EncorePerformance;
  isPrimary: boolean;
  googleAccessToken: string | null;
  inlineLink: PerformanceVideoInlineLinkFieldProps;
  onSetPrimary?: () => void;
  onRemove: () => void;
  uploading?: boolean;
  /** When false, pause inline previews (modal closing). */
  playbackActive?: boolean;
  /**
   * Set when this video points at a Drive file the user does not own. Renders the copy checkbox
   * here, on the card, rather than as a notice under the whole list — `PERFORMANCE_UX.md` requires
   * source controls to sit with the one video they describe.
   */
  foreignCopy?: {
    copyRequested: boolean;
    onCopyRequestedChange: (next: boolean) => void;
  };
};

/** Saved performance video in the editor — list card with left preview and editable source fields. */
export function PerformanceEditorVideoCard(props: PerformanceEditorVideoCardProps): ReactElement {
  const {
    video,
    performanceShell,
    isPrimary,
    googleAccessToken,
    inlineLink,
    onSetPrimary,
    onRemove,
    uploading,
    playbackActive = true,
    foreignCopy,
  } = props;
  const theme = useTheme();
  const pseudo: EncorePerformance = {
    ...performanceShell,
    videos: [video],
    primaryVideoId: video.id,
    videoTargetDriveFileId: video.videoTargetDriveFileId,
    videoShortcutDriveFileId: video.videoShortcutDriveFileId,
    externalVideoUrl: video.externalVideoUrl,
  };

  const resolvedName =
    inlineLink.driveLinkFeedback?.kind === 'ok' ? inlineLink.driveLinkFeedback.name : null;
  const title = video.label?.trim() || resolvedName || 'Video';

  return (
    <Box sx={encorePerformanceVideoPanelSx(theme, { isPrimary })}>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          alignItems: "flex-start",
          p: 1.25
        }}>
        <PerformanceSavedVideoPreview
          performance={pseudo}
          googleAccessToken={googleAccessToken}
          playbackActive={playbackActive}
        />
        <Box sx={{ flex: 1, minWidth: 0, pt: 0.25 }}>
          <Stack
            direction="row"
            spacing={0.75}
            sx={{
              alignItems: "center",
              mb: 1
            }}>
            <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, minWidth: 0 }} noWrap title={title}>
              {title}
            </Typography>
          </Stack>
          <PerformanceVideoInlineLinkField {...inlineLink} />
          {foreignCopy ? (
            <FormControlLabel
              sx={{ mt: 0.75, ml: 0, alignItems: 'flex-start' }}
              control={
                <Checkbox
                  size="small"
                  checked={foreignCopy.copyRequested}
                  disabled={uploading}
                  onChange={(e) => foreignCopy.onCopyRequestedChange(e.target.checked)}
                  sx={{ py: 0, pl: 0, pr: 1 }}
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Save a copy to my Drive
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    This video is in someone else&apos;s Drive. A copy keeps it with your log if the
                    original is unshared or deleted.
                  </Typography>
                </Box>
              }
            />
          ) : null}
          <Stack
            direction="row"
            useFlexGap
            sx={{
              flexWrap: "wrap",
              gap: 0.5,
              mt: 1.25
            }}>
            <PerformanceVideoPrimaryRowAction
              isPrimary={isPrimary}
              onSetPrimary={onSetPrimary}
              disabled={uploading}
            />
            <Button
              type="button"
              size="small"
              variant="text"
              color="inherit"
              disabled={uploading}
              onClick={onRemove}
              startIcon={<DeleteOutlineIcon sx={{ fontSize: 16 }} />}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                px: 0.75,
                ml: isPrimary || onSetPrimary ? 0 : -0.75,
              }}
            >
              Remove
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}
