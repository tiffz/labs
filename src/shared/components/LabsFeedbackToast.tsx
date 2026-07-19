import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import CloseIcon from '@mui/icons-material/Close';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import type { ReactElement, ReactNode } from 'react';
import { useLabsBlockingJobsVisible } from '../jobs/LabsBlockingJobContext';
import './labsFeedbackToast.css';

export type LabsFeedbackToastSeverity = 'success' | 'info' | 'warning' | 'error';

/** Optional inline action (e.g. "Open") rendered between the message and the dismiss button. */
export type LabsFeedbackToastAction = {
  label: string;
  onClick: () => void;
};

export type LabsFeedbackToastProps = {
  message: string | null;
  onClose: () => void;
  severity?: LabsFeedbackToastSeverity;
  autoHideDuration?: number;
  /**
   * Optional action button. A click here is a direct user gesture, so handlers that open a new
   * tab (e.g. "Open the doc you just created") are not blocked by popup blockers.
   */
  action?: LabsFeedbackToastAction | null;
};

const SEVERITY_ARIA: Record<LabsFeedbackToastSeverity, 'status' | 'alert'> = {
  success: 'status',
  info: 'status',
  warning: 'status',
  error: 'alert',
};

function SeverityIcon({ severity }: { severity: LabsFeedbackToastSeverity }): ReactElement {
  const sx = { fontSize: 20 };
  if (severity === 'error') return <ErrorOutlineIcon sx={sx} aria-hidden />;
  if (severity === 'warning') return <WarningAmberIcon sx={sx} aria-hidden />;
  if (severity === 'info') return <InfoOutlinedIcon sx={sx} aria-hidden />;
  return <CheckCircleOutlineIcon sx={sx} aria-hidden />;
}

function useToastBottomOffset(): { xs: number; sm: number } {
  const blockingVisible = useLabsBlockingJobsVisible();
  const stackGap = blockingVisible ? 96 : 0;
  return { xs: 16 + stackGap, sm: 24 + stackGap };
}

export default function LabsFeedbackToast({
  message,
  onClose,
  severity = 'success',
  autoHideDuration = 5500,
  action = null,
}: LabsFeedbackToastProps): ReactNode {
  const theme = useTheme();
  const bottomOffset = useToastBottomOffset();
  const open = Boolean(message);

  const accent =
    severity === 'error'
      ? theme.palette.error.main
      : severity === 'warning'
        ? theme.palette.warning.main
        : severity === 'info'
          ? theme.palette.info.main
          : theme.palette.success.main;

  const panelShadow = [
    `0 0 0 1px ${alpha(theme.palette.common.black, 0.03)}`,
    `0 1px 2px ${alpha(theme.palette.common.black, 0.04)}`,
    `0 6px 16px ${alpha(theme.palette.common.black, 0.06)}`,
    `0 20px 40px ${alpha(theme.palette.common.black, 0.05)}`,
  ].join(', ');

  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={(_event, reason) => {
        if (reason === 'clickaway') return;
        onClose();
      }}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      className="labs-feedback-toast-snackbar"
      sx={{
        bottom: {
          xs: `calc(${bottomOffset.xs}px + var(--labs-debug-dock-height, 0px))`,
          sm: `calc(${bottomOffset.sm}px + var(--labs-debug-dock-height, 0px))`,
        },
        left: { xs: 20, sm: '50%' },
        right: { xs: 20, sm: 'auto' },
        transform: { xs: 'none', sm: 'translateX(-50%)' },
      }}
    >
      <Paper
        className="labs-feedback-toast-panel"
        elevation={0}
        role={SEVERITY_ARIA[severity]}
        aria-live={severity === 'error' ? 'assertive' : 'polite'}
        aria-atomic="true"
        sx={{
          pl: { xs: 1.75, sm: 2 },
          pr: { xs: 1.25, sm: 1.5 },
          py: { xs: 1.375, sm: 1.5 },
          width: { xs: '100%', sm: 'min(92vw, 26rem)' },
          maxWidth: 416,
          borderRadius: `${theme.shape.borderRadius}px`,
          bgcolor: 'background.paper',
          color: 'text.primary',
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: panelShadow,
        }}
      >
        <div className="labs-feedback-toast-panel__row">
          <span
            className="labs-feedback-toast-panel__icon"
            aria-hidden
            style={{
              backgroundColor: alpha(accent, 0.12),
              color: accent,
            }}
          >
            <SeverityIcon severity={severity} />
          </span>
          <Typography component="p" className="labs-feedback-toast-panel__message">
            {message}
          </Typography>
          {action ? (
            <Button
              className="labs-feedback-toast-panel__action"
              size="small"
              onClick={action.onClick}
              sx={{
                color: accent,
                fontWeight: 600,
                textTransform: 'none',
                whiteSpace: 'nowrap',
                minWidth: 'auto',
                px: 1,
                '&:hover': { backgroundColor: alpha(accent, 0.1) },
              }}
            >
              {action.label}
            </Button>
          ) : null}
          <IconButton
            className="labs-feedback-toast-panel__dismiss"
            size="small"
            onClick={onClose}
            aria-label="Dismiss notification"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </div>
      </Paper>
    </Snackbar>
  );
}
