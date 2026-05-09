import LabsGoogleSignInButton from '../../shared/google/LabsGoogleSignInButton';
import { LabsAccountMenu } from '../../shared/google/LabsAccountMenu';
import CircularProgress from '@mui/material/CircularProgress';
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
    <LabsAccountMenu
      appId="stanza"
      googleClientConfigured
      identityCaption="Email is remembered from Encore on this browser. Opening Drive recordings still renews a Google permission (sometimes in a popup)."
      backup={{
        identity: backup.identity?.email ? { email: backup.identity.email } : null,
        testerResolved: backup.testerResolved,
        testerOk: backup.testerOk,
        allowlistEmpty: stanzaDriveTesterAllowlistEmpty(),
        busy: backup.busy,
        message: backup.message,
        onBackup: backup.onBackup,
        lastBackupExportedAt: meta.lastBackupExportedAt,
        scopeSummary: 'Markers & YouTube IDs only · drive.file',
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
        <>
          <LabsGoogleSignInButton
            className="stanza-btn-soft-outline"
            disabled={disabled}
            onClick={onBackup}
            aria-label="Back up Stanza library metadata to Google Drive"
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
        </>
      )}
    />
  );
}
