import type { ReactNode } from 'react';
import BackupOutlinedIcon from '@mui/icons-material/BackupOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RestoreOutlinedIcon from '@mui/icons-material/RestoreOutlined';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import type { SxProps, Theme } from '@mui/material/styles';
import AppTooltip from '../components/AppTooltip';
import LabsGoogleSignInButton from './LabsGoogleSignInButton';

export type LabsDriveBackupActionRowProps = {
  disabled: boolean;
  busy: boolean;
  onBackup: () => void;
  canRestore: boolean;
  onOpenRestore: () => void;
  driveFolderUrl: string | null;
  driveFolderAriaLabel: string;
  backupAriaLabel: string;
  /** When true, show sign-in instead of backup (expired token with remembered identity). */
  needsSignIn?: boolean;
  onSignIn?: () => void;
  /** `google-outlined` matches Stanza; `contained` matches Learn Your Scales. */
  variant?: 'google-outlined' | 'contained';
  googleButtonClassName?: string;
  googleButtonSx?: SxProps<Theme>;
  /** Optional trailing control (e.g. Organize) aligned to the right of backup actions. */
  trailing?: ReactNode;
};

export default function LabsDriveBackupActionRow(props: LabsDriveBackupActionRowProps) {
  const {
    disabled,
    busy,
    onBackup,
    canRestore,
    onOpenRestore,
    driveFolderUrl,
    driveFolderAriaLabel,
    backupAriaLabel,
    needsSignIn = false,
    onSignIn,
    variant = 'contained',
    googleButtonClassName,
    googleButtonSx,
    trailing,
  } = props;

  const primaryAction = needsSignIn ? onSignIn ?? onBackup : onBackup;
  const primaryLabel = needsSignIn
    ? busy
      ? 'Signing in…'
      : 'Sign in again'
    : busy
      ? 'Saving…'
      : 'Back up';
  const primaryAriaLabel = needsSignIn
    ? busy
      ? 'Signing in with Google'
      : 'Sign in with Google to resume Drive sync'
    : busy
      ? 'Saving backup to Google Drive'
      : backupAriaLabel;

  return (
    <Stack spacing={1} useFlexGap sx={{ width: '100%' }}>
      <Stack
        direction="row"
        spacing={0.5}
        useFlexGap
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          width: '100%'
        }}>
        <Stack
          direction="row"
          spacing={0.5}
          useFlexGap
          sx={{
            alignItems: "center",
            flexWrap: "wrap"
          }}>
          {variant === 'google-outlined' ? (
            <LabsGoogleSignInButton
              className={googleButtonClassName}
              disabled={disabled}
              onClick={() => void primaryAction()}
              aria-label={primaryAriaLabel}
              label={primaryLabel}
              sx={{
                borderRadius: 999,
                minHeight: 36,
                ...googleButtonSx,
              }}
            />
          ) : (
            <Button
              variant="contained"
              size="small"
              disabled={disabled}
              onClick={() => void primaryAction()}
              aria-label={primaryAriaLabel}
              startIcon={
                busy ? (
                  <CircularProgress size={14} color="inherit" aria-hidden />
                ) : (
                  <BackupOutlinedIcon fontSize="small" aria-hidden />
                )
              }
            >
              {primaryLabel}
            </Button>
          )}
          <AppTooltip
            title={
              canRestore ? 'Restore from Drive or a local snapshot' : 'Restore is available after your first backup'
            }
          >
            <span>
              <Button
                size="small"
                variant="text"
                disabled={disabled || !canRestore}
                onClick={onOpenRestore}
                startIcon={<RestoreOutlinedIcon fontSize="small" aria-hidden />}
                sx={{ minWidth: 0, px: 1 }}
              >
                Restore
              </Button>
            </span>
          </AppTooltip>
        </Stack>
        {trailing ? <Stack direction="row" sx={{
          alignItems: "center"
        }}>{trailing}</Stack> : null}
      </Stack>
      {driveFolderUrl ? (
        <Link
          href={driveFolderUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={driveFolderAriaLabel}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            typography: 'caption',
            textDecoration: 'none',
            color: 'text.secondary',
            fontWeight: 600,
            '&:hover': { color: 'primary.main', textDecoration: 'underline' },
          }}
        >
          Open in Drive
          <OpenInNewIcon sx={{ fontSize: 14, opacity: 0.72 }} aria-hidden />
        </Link>
      ) : null}
    </Stack>
  );
}
