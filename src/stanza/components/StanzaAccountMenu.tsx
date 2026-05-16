import LabsGoogleSignInButton from '../../shared/google/LabsGoogleSignInButton';
import { LabsAccountMenu } from '../../shared/google/LabsAccountMenu';
import AppTooltip from '../../shared/components/AppTooltip';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  stanzaDriveTesterAllowlistEmpty,
  stanzaGoogleClientConfigured,
  useStanzaDriveBackup,
} from '../hooks/useStanzaDriveBackup';

export default function StanzaAccountMenu() {
  const backup = useStanzaDriveBackup();

  if (!stanzaGoogleClientConfigured()) return null;

  const meta = backup.lastMeta;

  return (
    <>
      <LabsAccountMenu
        appId="stanza"
        googleClientConfigured
        identityCaption="Email is remembered from Encore on this browser. Opening Drive recordings may renew a Google permission in a popup."
        backup={{
          identity: backup.identity?.email ? { email: backup.identity.email } : null,
          testerResolved: backup.testerResolved,
          testerOk: backup.testerOk,
          allowlistEmpty: stanzaDriveTesterAllowlistEmpty(),
          busy: backup.busy,
          message: backup.message,
          onBackup: backup.onBackup,
          lastBackupExportedAt: meta.lastBackupExportedAt,
          scopeSummary: 'Sections, BPM, mix, skip flags · audio stays on device · drive.file',
        }}
        ids={{ menu: 'stanza-account-menu', button: 'stanza-account-menu-button' }}
        appearance={{
          menuPaperClassName: 'stanza-panel',
          menuPaperSx: { maxWidth: 'min(100vw - 24px, 340px)' },
          tooltipTitle: 'Account & Drive backup',
          iconButtonSx: {
            borderColor: 'rgba(60, 60, 67, 0.18)',
            bgcolor: 'rgba(255, 253, 250, 0.85)',
            '&:hover': {
              bgcolor: 'rgba(255, 253, 250, 0.98)',
              borderColor: 'rgba(232, 72, 160, 0.35)',
            },
          },
        }}
        renderBackupButton={({ disabled, busy, onBackup }) => (
          <Stack spacing={0.75} useFlexGap>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <LabsGoogleSignInButton
                className="stanza-btn-soft-outline"
                disabled={disabled}
                onClick={() => void onBackup()}
                aria-label="Back up library to Google Drive"
                label={busy ? 'Saving…' : 'Back up with Google'}
                sx={{
                  borderRadius: 999,
                  borderColor: 'rgba(60, 60, 67, 0.22)',
                  bgcolor: 'rgba(255, 253, 250, 0.98)',
                  color: 'text.primary',
                  '&:hover': { bgcolor: 'rgba(255, 253, 250, 1)', borderColor: 'rgba(60, 60, 67, 0.28)' },
                }}
              />
              {busy ? <CircularProgress size={22} aria-label="Saving" sx={{ color: 'primary.main' }} /> : null}
              <AppTooltip
                title={
                  backup.canRestore
                    ? 'Open the restore dialog to merge a previous local snapshot or the latest Drive copy back into this device.'
                    : 'Available after Stanza syncs with your Drive backup at least once.'
                }
              >
                <span>
                  <Button
                    size="small"
                    variant="text"
                    disabled={disabled || !backup.canRestore}
                    onClick={() => backup.openRestorePicker()}
                    sx={{ fontSize: '0.7rem', minWidth: 0 }}
                  >
                    Restore…
                  </Button>
                </span>
              </AppTooltip>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.45 }}>
              Stanza syncs section markers, BPM calibration, mix levels, and skip flags to your Drive
              automatically. Audio and stems stay on each device.
            </Typography>
            {backup.driveFolderUrl ? (
              <Link
                href={backup.driveFolderUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  fontSize: '0.7rem',
                  textDecoration: 'none',
                  color: 'text.secondary',
                  fontWeight: 600,
                  '&:hover': { color: 'primary.main', textDecoration: 'underline' },
                }}
              >
                Open Stanza folder in Drive
                <OpenInNewIcon sx={{ fontSize: 14, opacity: 0.72 }} aria-hidden />
              </Link>
            ) : null}
          </Stack>
        )}
      />

      <Dialog
        open={backup.conflict != null}
        onClose={() => !backup.busy && backup.cancelConflict()}
        fullWidth
        maxWidth="sm"
        aria-labelledby="stanza-drive-conflict-title"
      >
        {backup.conflict ? (
          <>
            <DialogTitle id="stanza-drive-conflict-title">Drive backup may overwrite newer data</DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                The same Google account shares one <code>progress.json</code> under “Tiff Zhang Labs / Stanza” on
                Drive. Another device or site version may have uploaded more recently than this browser remembers.
              </Typography>
              <Stack spacing={1} sx={{ mb: 1.5 }}>
                <Typography variant="body2">
                  <strong>Drive file modified:</strong> {backup.conflict.driveModifiedTime || 'unknown'}
                </Typography>
                <Typography variant="body2">
                  <strong>Backup timestamp inside file:</strong> {backup.conflict.remoteExportedAt}
                </Typography>
                <Typography variant="body2">
                  <strong>Songs in Drive backup:</strong> {backup.conflict.remoteSongCount} ·{' '}
                  <strong>On this device:</strong> {backup.conflict.localSongCount}
                </Typography>
              </Stack>
              {backup.conflict.explainLines.map((line, i) => (
                <Typography key={i} variant="body2" sx={{ mb: 1 }}>
                  {line}
                </Typography>
              ))}
              <Typography variant="subtitle2" sx={{ mt: 1, mb: 0.5 }}>
                How to decide
              </Typography>
              <Typography variant="body2" color="text.secondary" component="div">
                <ul style={{ marginTop: 0, paddingLeft: '1.25rem' }}>
                  <li>
                    <strong>Merge, then upload.</strong> For each song id, keep the copy with the newer{' '}
                    <code>updatedAt</code>. When Drive wins, this device keeps local audio files where ids still match.
                    The combined library is then uploaded to Drive.
                  </li>
                  <li>
                    <strong>Replace Drive only.</strong> Uploads this device&apos;s library as-is and overwrites the
                    Drive file. Use when Drive is wrong or empty.
                  </li>
                  <li>
                    <strong>Cancel.</strong> Nothing is written. A snapshot of this device was saved when you opened
                    this dialog; use &ldquo;Restore snapshot…&rdquo; if you merge and change your mind.
                  </li>
                </ul>
              </Typography>
            </DialogContent>
            <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
              <Button onClick={() => backup.cancelConflict()} disabled={backup.busy}>
                Cancel
              </Button>
              <Button onClick={() => void backup.confirmReplaceDriveOnly()} disabled={backup.busy} color="warning">
                Replace Drive only
              </Button>
              <Button variant="contained" onClick={() => void backup.confirmMergeThenUpload()} disabled={backup.busy}>
                Merge, then upload
              </Button>
            </DialogActions>
          </>
        ) : null}
      </Dialog>

      <Dialog open={backup.restoreOpen} onClose={() => !backup.busy && backup.closeRestorePicker()} fullWidth maxWidth="xs">
        <DialogTitle>Restore library</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
            Restoring replays a <strong>metadata merge</strong> against your current library: per song, the copy with
            the newer <code>updatedAt</code> wins. Local audio files are kept when their ids match.
          </Typography>

          <Typography
            variant="overline"
            sx={{ display: 'block', color: 'text.disabled', letterSpacing: '0.08em', mb: 0.5 }}
          >
            From Google Drive
          </Typography>
          <List dense disablePadding sx={{ mb: 1.5 }}>
            <ListItemButton
              disabled={backup.busy || !backup.testerOk}
              onClick={() => void backup.restoreLatestFromDrive()}
            >
              <ListItemText
                primary="Latest backup from Drive"
                secondary={
                  backup.latestRemoteEnvelope
                    ? `Exported ${backup.latestRemoteEnvelope.exportedAt} · ${backup.latestRemoteEnvelope.songs.length} song${
                        backup.latestRemoteEnvelope.songs.length === 1 ? '' : 's'
                      }`
                    : backup.lastMeta.lastBackupExportedAt
                      ? `Last seen ${backup.lastMeta.lastBackupExportedAt} — tap to re-fetch`
                      : 'Tap to fetch the latest copy from Drive'
                }
              />
            </ListItemButton>
          </List>

          <Divider sx={{ my: 1 }} />

          <Typography
            variant="overline"
            sx={{ display: 'block', color: 'text.disabled', letterSpacing: '0.08em', mb: 0.5 }}
          >
            Local snapshots (this browser)
          </Typography>
          {backup.undoSnapshots.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No local snapshots yet. Snapshots are captured each time you press “Back up with Google”.
            </Typography>
          ) : (
            <List dense disablePadding>
              {backup.undoSnapshots.map((s) => (
                <ListItemButton
                  key={s.createdAt}
                  disabled={backup.busy}
                  onClick={() => void backup.applyUndoSnapshot(s)}
                >
                  <ListItemText primary={s.label} secondary="Local pre-backup snapshot" />
                </ListItemButton>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => backup.closeRestorePicker()} disabled={backup.busy}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
