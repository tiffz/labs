import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { driveGetFileMetadata } from '../drive/driveFetch';
import { useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react';
import { parseDriveFolderIdFromUserInput } from '../drive/parseDriveFileUrl';
import { GOOGLE_DRIVE_WEB_HOME, driveFolderWebUrl } from '../drive/driveWebUrls';
import { EncoreBrowseDriveButton } from './EncoreDriveSourceButtons';

const DRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder';

function isDriveFolderMetadata(meta: {
  mimeType?: string;
  shortcutDetails?: { targetMimeType?: string };
}): boolean {
  if (meta.mimeType === DRIVE_FOLDER_MIME) return true;
  return (
    meta.mimeType === 'application/vnd.google-apps.shortcut' &&
    meta.shortcutDetails?.targetMimeType === DRIVE_FOLDER_MIME
  );
}

export type EncoreDriveFolderPasteOrBrowseBlockProps = {
  value: string;
  onChange: (next: string) => void;
  googleAccessToken: string | null;
  disabled?: boolean;
  description?: ReactNode;
  textFieldLabel?: string;
  /** Right side of the action row (e.g. Scan folder, Set folder). */
  primaryAction?: ReactNode;
};

export function EncoreDriveFolderPasteOrBrowseBlock(
  props: EncoreDriveFolderPasteOrBrowseBlockProps,
): ReactElement {
  const {
    value,
    onChange,
    googleAccessToken,
    disabled = false,
    description,
    textFieldLabel = 'Drive folder URL or id',
    primaryAction,
  } = props;

  const parsedId = useMemo(() => parseDriveFolderIdFromUserInput(value), [value]);

  const [folderResolve, setFolderResolve] = useState<
    | null
    | { status: 'loading' }
    | { status: 'ok'; name: string }
    | { status: 'wrong_kind' }
    | { status: 'error' }
  >(null);

  useEffect(() => {
    if (!parsedId || !googleAccessToken) {
      setFolderResolve(null);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setFolderResolve({ status: 'loading' });
      try {
        const meta = await driveGetFileMetadata(googleAccessToken, parsedId);
        if (cancelled) return;
        const name = meta.name?.trim() || '';
        if (isDriveFolderMetadata(meta)) {
          setFolderResolve({ status: 'ok', name: name || 'Folder' });
        } else {
          setFolderResolve({ status: 'wrong_kind' });
        }
      } catch {
        if (!cancelled) setFolderResolve({ status: 'error' });
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [parsedId, googleAccessToken]);

  const openDriveFolderInNewTab = () => {
    if (!googleAccessToken) return;
    const url = parsedId ? driveFolderWebUrl(parsedId) : GOOGLE_DRIVE_WEB_HOME;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Stack spacing={1.5}>
      {description ? (
        typeof description === 'string' ? (
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.45 }}>
            {description}
          </Typography>
        ) : (
          description
        )
      ) : null}
      <TextField
        label={textFieldLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        fullWidth
        size="small"
        disabled={disabled}
      />
      <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
        <EncoreBrowseDriveButton
          size="small"
          signedIn={Boolean(googleAccessToken)}
          disabled={disabled}
          onClick={openDriveFolderInNewTab}
          sx={{ flexShrink: 0, textTransform: 'none' }}
        >
          {parsedId ? 'Open this folder in Drive' : 'Open Google Drive'}
        </EncoreBrowseDriveButton>
        <Box sx={{ flex: 1, minWidth: 8 }} />
        {primaryAction}
      </Stack>
      {parsedId && !googleAccessToken ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.45 }}>
          Sign in with Google to verify this folder.
        </Typography>
      ) : null}
      {folderResolve?.status === 'loading' ? (
        <Stack direction="row" alignItems="center" gap={1}>
          <CircularProgress size={14} />
          <Typography variant="body2" color="text.secondary">
            Checking Drive…
          </Typography>
        </Stack>
      ) : null}
      {folderResolve?.status === 'ok' ? (
        <Alert severity="success" variant="outlined" sx={{ py: 0.5 }}>
          <Typography variant="body2" fontWeight={700} component="div">
            {folderResolve.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" component="div">
            Google Drive folder
          </Typography>
        </Alert>
      ) : null}
      {folderResolve?.status === 'wrong_kind' ? (
        <Alert severity="warning" variant="outlined" sx={{ py: 0.5 }}>
          That’s a file, not a folder. Paste a folder link or id.
        </Alert>
      ) : null}
      {folderResolve?.status === 'error' ? (
        <Alert severity="error" variant="outlined" sx={{ py: 0.5 }}>
          Could not open this in Drive. Check the link and try again.
        </Alert>
      ) : null}
    </Stack>
  );
}
