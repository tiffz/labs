import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import type { ReactElement } from 'react';
import type { SyncCheckResult } from '../drive/repertoireSync';
import {
  encoreDialogActionsSx,
  encoreDialogContentSx,
  encoreDialogTitleSx,
  encoreHairline,
  encoreShadowLift,
} from '../theme/encoreUiTokens';

export function ConflictResolutionDialog(props: {
  open: boolean;
  conflict: SyncCheckResult | null;
  onUseRemote: () => void;
  onKeepLocal: () => void;
  onDismiss: () => void;
}): ReactElement {
  const { open, conflict, onUseRemote, onKeepLocal, onDismiss } = props;
  const remoteLabel = conflict?.remoteModified
    ? new Date(conflict.remoteModified).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : null;

  return (
    <Dialog
      open={open}
      onClose={onDismiss}
      aria-labelledby="encore-conflict-title"
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            border: `1px solid ${encoreHairline}`,
            boxShadow: encoreShadowLift,
          },
        },
      }}
    >
      <DialogTitle id="encore-conflict-title" sx={{ ...encoreDialogTitleSx, pb: 1.5 }}>
        Sync conflict
      </DialogTitle>
      <DialogContent
        sx={{
          ...encoreDialogContentSx,
          overflow: 'visible',
          pt: 1,
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65, letterSpacing: '-0.008em', mb: 2 }}>
          Your Encore library on this device and the backup copy in Google Drive have both changed. Choose which version
          should win <strong>for this merge</strong>. Your other device can still sync afterward.
        </Typography>
        {remoteLabel ? (
          <Stack
            spacing={0.5}
            sx={{
              p: 1.75,
              borderRadius: 2,
              bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
              border: '1px solid',
              borderColor: (t) => alpha(t.palette.primary.main, 0.12),
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Drive backup
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              Last modified in Drive:{' '}
              <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
                {remoteLabel}
              </Box>
            </Typography>
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions
        sx={{
          ...encoreDialogActionsSx,
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 1.25,
          pt: 2,
          borderTop: '1px solid',
          borderColor: encoreHairline,
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="flex-end" useFlexGap>
          <Button
            onClick={onUseRemote}
            variant="outlined"
            color="primary"
            size="medium"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Use Drive copy
          </Button>
          <Button
            onClick={onKeepLocal}
            variant="contained"
            color="primary"
            size="medium"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Keep this device
          </Button>
        </Stack>
        <Button
          onClick={onDismiss}
          color="inherit"
          size="small"
          sx={{ alignSelf: 'center', textTransform: 'none', fontWeight: 500 }}
        >
          Decide later
        </Button>
      </DialogActions>
    </Dialog>
  );
}
