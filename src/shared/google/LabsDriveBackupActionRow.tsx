import OpenInNewIcon from '@mui/icons-material/OpenInNew';
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
  /** `google-outlined` matches Stanza; `contained` matches Learn Your Scales. */
  variant?: 'google-outlined' | 'contained';
  googleButtonClassName?: string;
  googleButtonSx?: SxProps<Theme>;
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
    variant = 'contained',
    googleButtonClassName,
    googleButtonSx,
  } = props;

  return (
    <Stack spacing={1} useFlexGap sx={{ width: '100%' }}>
      <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
        {variant === 'google-outlined' ? (
          <LabsGoogleSignInButton
            className={googleButtonClassName}
            disabled={disabled}
            onClick={() => void onBackup()}
            aria-label={busy ? 'Saving backup to Google Drive' : backupAriaLabel}
            label={busy ? 'Saving…' : 'Back up'}
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
            onClick={() => void onBackup()}
            aria-label={backupAriaLabel}
            startIcon={busy ? <CircularProgress size={14} color="inherit" aria-hidden /> : undefined}
          >
            {busy ? 'Saving…' : 'Back up'}
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
              sx={{ minWidth: 0, px: 1 }}
            >
              Restore
            </Button>
          </span>
        </AppTooltip>
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
