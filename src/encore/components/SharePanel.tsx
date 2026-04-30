import AddToDriveIcon from '@mui/icons-material/AddToDrive';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useEncore } from '../context/EncoreContext';

const SHARE_ONLY_PERFORMED_LS = 'encore.share.onlyPerformedSongs';

function readOnlyPerformedFromStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(SHARE_ONLY_PERFORMED_LS) === '1';
  } catch {
    return false;
  }
}
import { getSyncMeta } from '../db/encoreDb';
import { driveGetFileMetadata } from '../drive/driveFetch';
import { driveFileWebUrl } from '../drive/driveWebUrls';

function publicShareUrl(fileId: string): string {
  return `${window.location.origin}/encore/#/share/${fileId}`;
}

function formatSnapshotInstant(iso: string | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

/**
 * Compact share controls for the header Share menu (read-only guest link).
 */
export function SharePanel(): ReactElement {
  const { publishPublicSnapshot, googleAccessToken } = useEncore();
  const [link, setLink] = useState<string | null>(null);
  const [snapshotDriveFileId, setSnapshotDriveFileId] = useState<string | null>(null);
  const [driveModifiedTime, setDriveModifiedTime] = useState<string | null>(null);
  const [driveMetaLoading, setDriveMetaLoading] = useState(false);
  const [driveTimeError, setDriveTimeError] = useState(false);
  const [embeddedSnapshotTime, setEmbeddedSnapshotTime] = useState<string | null>(null);
  const [statusLine, setStatusLine] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<'success' | 'warning' | 'error' | null>(null);
  const [busy, setBusy] = useState(false);
  const [onlyPerformedSongs, setOnlyPerformedSongs] = useState(readOnlyPerformedFromStorage);

  const persistOnlyPerformed = useCallback((value: boolean) => {
    setOnlyPerformedSongs(value);
    try {
      localStorage.setItem(SHARE_ONLY_PERFORMED_LS, value ? '1' : '0');
    } catch {
      /* ignore quota / private mode */
    }
  }, []);

  const refreshDriveModifiedTime = useCallback(async (fileId: string, token: string | null) => {
    if (!token || !fileId) {
      setDriveModifiedTime(null);
      setDriveTimeError(false);
      setDriveMetaLoading(false);
      return;
    }
    setDriveMetaLoading(true);
    try {
      setDriveTimeError(false);
      const m = await driveGetFileMetadata(token, fileId);
      setDriveModifiedTime(m.modifiedTime?.trim() || null);
    } catch {
      setDriveTimeError(true);
      setDriveModifiedTime(null);
    } finally {
      setDriveMetaLoading(false);
    }
  }, []);

  const loadSnapshotMeta = useCallback(async () => {
    const meta = await getSyncMeta();
    const fid = meta.snapshotFileId?.trim();
    if (fid) {
      setSnapshotDriveFileId(fid);
      setLink(publicShareUrl(fid));
    } else {
      setSnapshotDriveFileId(null);
      setLink(null);
      setDriveModifiedTime(null);
    }
    setEmbeddedSnapshotTime(meta.lastPublishedSnapshotAt?.trim() || null);
  }, []);

  useEffect(() => {
    void loadSnapshotMeta();
  }, [loadSnapshotMeta]);

  useEffect(() => {
    if (!snapshotDriveFileId) return;
    void refreshDriveModifiedTime(snapshotDriveFileId, googleAccessToken);
  }, [snapshotDriveFileId, googleAccessToken, refreshDriveModifiedTime]);

  const clearStatus = useCallback(() => {
    setStatusLine(null);
    setStatusTone(null);
  }, []);

  const handlePublish = async () => {
    clearStatus();
    setBusy(true);
    try {
      const result = await publishPublicSnapshot({ onlyPerformedSongs });
      setSnapshotDriveFileId(result.fileId);
      setEmbeddedSnapshotTime(result.generatedAt);
      setLink(publicShareUrl(result.fileId));
      if (result.driveModifiedTime) {
        setDriveModifiedTime(result.driveModifiedTime);
        setDriveTimeError(false);
      } else {
        await refreshDriveModifiedTime(result.fileId, googleAccessToken);
      }

      const hadPrivateVideos = result.privateVideoCount > 0;
      const videoHint = hadPrivateVideos
        ? ` ${result.privateVideoCount} private video${result.privateVideoCount === 1 ? '' : 's'} not shown on the guest page.`
        : '';

      if (result.publiclyReadable) {
        setStatusLine(`Ready to share.${videoHint}`);
        setStatusTone('success');
      } else if (result.warning) {
        setStatusLine(result.warning);
        setStatusTone('warning');
      } else {
        setStatusLine(`Saved. Open the link in a private window to confirm it’s public.${videoHint}`);
        setStatusTone('warning');
      }
      void loadSnapshotMeta();
    } catch (e) {
      setStatusLine(e instanceof Error ? e.message : String(e));
      setStatusTone('error');
    } finally {
      setBusy(false);
    }
  };

  const hasExistingLink = Boolean(link && snapshotDriveFileId);

  const updatedCaption = (() => {
    if (!hasExistingLink) return null;
    if (driveModifiedTime) return `Updated ${formatSnapshotInstant(driveModifiedTime)}`;
    if (googleAccessToken && driveMetaLoading) return 'Loading…';
    if (googleAccessToken && driveTimeError) return 'Couldn’t load date';
    if (!googleAccessToken) return 'Sign in to see Drive date';
    if (embeddedSnapshotTime) return `Snapshot ${formatSnapshotInstant(embeddedSnapshotTime)}`;
    return null;
  })();

  const statusColor =
    statusTone === 'success'
      ? 'success.main'
      : statusTone === 'warning'
        ? 'warning.main'
        : statusTone === 'error'
          ? 'error.main'
          : 'text.secondary';

  return (
    <Stack spacing={2.25} sx={{ width: 1 }}>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
        Read-only guest view of your repertoire <strong>as of your last publish</strong>.
      </Typography>

      {!googleAccessToken ? (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.45 }}>
          Sign in to Google to publish or update.
        </Typography>
      ) : null}

      {hasExistingLink && link ? (
        <Stack spacing={1}>
          <TextField label="Link" value={link} fullWidth size="small" InputProps={{ readOnly: true }} />
          <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap" useFlexGap>
            <Tooltip title="Copy link">
              <IconButton
                size="small"
                aria-label="Copy guest link"
                onClick={() => void navigator.clipboard.writeText(link)}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Preview guest page">
              <IconButton
                size="small"
                aria-label="Preview guest page in new tab"
                component="a"
                href={link}
                target="_blank"
                rel="noreferrer"
              >
                <VisibilityOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {snapshotDriveFileId ? (
              <Tooltip title="Open in Google Drive">
                <IconButton
                  size="small"
                  aria-label="Open snapshot in Google Drive"
                  component="a"
                  href={driveFileWebUrl(snapshotDriveFileId)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <AddToDriveIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : null}
            {updatedCaption ? (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                {updatedCaption}
              </Typography>
            ) : null}
          </Stack>
        </Stack>
      ) : null}

      {googleAccessToken ? (
        <FormControlLabel
          control={
            <Checkbox
              checked={onlyPerformedSongs}
              onChange={(_, checked) => persistOnlyPerformed(checked)}
              size="small"
            />
          }
          sx={{ alignItems: 'flex-start', ml: 0, mr: 0 }}
          label={
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.45 }}>
              Only include songs I’ve performed at least once
            </Typography>
          }
        />
      ) : null}

      <Button
        variant="contained"
        disabled={!googleAccessToken || busy}
        onClick={() => void handlePublish()}
        startIcon={hasExistingLink ? <RefreshIcon sx={{ fontSize: 18 }} /> : undefined}
        fullWidth
        sx={{ py: 1, fontWeight: 600, textTransform: 'none' }}
      >
        {busy ? 'Working…' : hasExistingLink ? 'Update snapshot' : 'Publish snapshot'}
      </Button>

      {statusLine ? (
        <Typography variant="caption" sx={{ color: statusColor, lineHeight: 1.5, display: 'block' }}>
          {statusLine}
        </Typography>
      ) : null}
    </Stack>
  );
}
