import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import type { ReactElement } from 'react';
import { encoreHairline, encorePerformanceVideoPanelSx, encorePerformanceAddAnotherLabelSx, encorePerformanceStagedVideoSx, encoreSoftPinkWash } from '../../theme/encoreUiTokens';
import { PerformanceAddVideoSourceStrip, type PerformanceAddVideoSourceStripProps } from './PerformanceAddVideoSourceStrip';
import { PerformanceStagedVideoRow } from './PerformanceStagedVideoRow';

export type PerformancePendingLinkRow = {
  id: string;
  label: string;
  onRemove: () => void;
};

/** A device file staged in the editor; `refusal` marks one that can't be added (ADR 0030). */
export type PerformanceStagedDeviceFile = {
  id: string;
  file: File;
  refusal?: string;
};

export type PerformanceAddVideosPanelProps = {
  deviceFiles: PerformanceStagedDeviceFile[];
  linkRows?: PerformancePendingLinkRow[];
  uploading?: boolean;
  onRemoveDeviceFile: (id: string) => void;
  sourceStrip: PerformanceAddVideoSourceStripProps;
  /** When false, pause staged clip previews (modal closing). */
  playbackActive?: boolean;
  /** Shown on the sole staged clip when replacing an existing saved video (log/edit). */
  onKeepExistingVideo?: () => void;
};

/**
 * Unified “videos to upload” surface for log, edit, and add-video flows —
 * one card with a queue list and a shared add footer.
 */
export function PerformanceAddVideosPanel(props: PerformanceAddVideosPanelProps): ReactElement {
  const {
    deviceFiles,
    linkRows = [],
    uploading,
    onRemoveDeviceFile,
    sourceStrip,
    playbackActive = true,
    onKeepExistingVideo,
  } = props;
  const theme = useTheme();

  const hasRows = deviceFiles.length > 0 || linkRows.length > 0;
  const showKeepExisting =
    Boolean(onKeepExistingVideo) && deviceFiles.length === 1 && !deviceFiles[0]!.refusal && linkRows.length === 0;

  const keepExistingAction = showKeepExisting ? (
    <Button
      type="button"
      size="small"
      variant="text"
      color="inherit"
      disabled={uploading}
      onClick={onKeepExistingVideo}
      sx={{ textTransform: 'none', fontWeight: 600, px: 0.75, ml: -0.75 }}
    >
      Keep existing video
    </Button>
  ) : null;

  return (
    <Box sx={encorePerformanceVideoPanelSx(theme, { isPrimary: false })}>
      {hasRows ? (
        <Stack
          divider={<Divider sx={{ borderColor: encoreHairline }} />}
          spacing={0}
          sx={{ px: 1.5, py: 0.5, ...encorePerformanceStagedVideoSx() }}
          aria-label="Videos to upload"
        >
          {deviceFiles.map((staged, index) => (
            <Box key={staged.id}>
              <PerformanceStagedVideoRow
                file={staged.file}
                refusal={staged.refusal}
                uploading={uploading}
                playbackActive={playbackActive}
                onRemove={() => onRemoveDeviceFile(staged.id)}
                extraActions={index === 0 ? keepExistingAction : undefined}
              />
            </Box>
          ))}
          {linkRows.map((row) => (
            <Box key={row.id}>
              <PerformanceStagedVideoRow
                linkLabel={row.label}
                uploading={uploading}
                playbackActive={playbackActive}
                onRemove={row.onRemove}
              />
            </Box>
          ))}
        </Stack>
      ) : null}

      <Box
        sx={{
          px: 1.5,
          py: 1.5,
          ...(hasRows
            ? {
                borderTop: 1,
                borderColor: encoreHairline,
                bgcolor: encoreSoftPinkWash(theme, 'rest'),
              }
            : {}),
        }}
      >
        {hasRows ? (
          <Typography component="p" sx={encorePerformanceAddAnotherLabelSx(theme)}>
            Add another
          </Typography>
        ) : null}
        <PerformanceAddVideoSourceStrip
          {...sourceStrip}
          hasQueuedVideos={hasRows || sourceStrip.hasQueuedVideos}
        />
      </Box>
    </Box>
  );
}
