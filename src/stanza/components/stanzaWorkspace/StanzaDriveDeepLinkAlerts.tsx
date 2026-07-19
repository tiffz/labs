import type { ReactNode } from 'react';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { LABS_GOOGLE_INTERACTIVE_DRIVE_AUTH_HINT } from '../../../shared/google/labsGoogleDriveAccess';
import type { StanzaSong } from '../../db/stanzaDb';
import { stanzaDriveSongNeedsMediaDownload } from '../../drive/stanzaDriveMediaHydration';
import {
  replaceStanzaPlaybackUrlSearchParams,
  STANZA_MEDIA_FINGERPRINT_QUERY,
} from '../../utils/stanzaDriveUrlParams';
import StanzaInlineAlert from '../StanzaInlineAlert';

export interface StanzaDriveDeepLinkAlertsProps {
  beatLibraryNotice: { severity: 'info' | 'success'; message: string } | null;
  dismissBeatLibraryNotice: () => void;
  localUploadError: string | null;
  onDismissLocalUploadError: () => void;
  fingerprintDeepLinkError: string | null;
  onDismissFingerprintDeepLinkError: () => void;
  driveDeepLinkBusy: boolean;
  driveDeepLinkError: string | null;
  onDismissDriveDeepLinkError: () => void;
  driveDeepLinkNeedsGesture: { fileId: string; title: string | null } | null;
  driveDeepLinkRemovedPrompt: { fileId: string; title: string | null } | null;
  selected: StanzaSong | null;
  onCompleteGestureDriveImport: () => void | Promise<void>;
  onDismissDriveDeepLinkRemovedPrompt: () => void;
  onCompleteDriveDeepLinkReAdd: () => void | Promise<void>;
}

export default function StanzaDriveDeepLinkAlerts({
  beatLibraryNotice,
  dismissBeatLibraryNotice,
  localUploadError,
  onDismissLocalUploadError,
  fingerprintDeepLinkError,
  onDismissFingerprintDeepLinkError,
  driveDeepLinkBusy,
  driveDeepLinkError,
  onDismissDriveDeepLinkError,
  driveDeepLinkNeedsGesture,
  driveDeepLinkRemovedPrompt,
  selected,
  onCompleteGestureDriveImport,
  onDismissDriveDeepLinkRemovedPrompt,
  onCompleteDriveDeepLinkReAdd,
}: StanzaDriveDeepLinkAlertsProps): ReactNode {
  const showLoading =
    driveDeepLinkBusy && !driveDeepLinkError && !driveDeepLinkNeedsGesture && !driveDeepLinkRemovedPrompt;
  const showDriveMediaHint =
    selected != null &&
    stanzaDriveSongNeedsMediaDownload(selected) &&
    !driveDeepLinkBusy &&
    !driveDeepLinkError &&
    !driveDeepLinkNeedsGesture &&
    !driveDeepLinkRemovedPrompt;
  if (
    !beatLibraryNotice &&
    !localUploadError &&
    !fingerprintDeepLinkError &&
    !driveDeepLinkError &&
    !driveDeepLinkNeedsGesture &&
    !driveDeepLinkRemovedPrompt &&
    !showLoading &&
    !showDriveMediaHint
  ) {
    return null;
  }
  return (
    <>
      {beatLibraryNotice ? (
        <StanzaInlineAlert severity={beatLibraryNotice.severity} onClose={dismissBeatLibraryNotice}>
          <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
            {beatLibraryNotice.message}
          </Typography>
        </StanzaInlineAlert>
      ) : null}
      {localUploadError ? (
        <StanzaInlineAlert severity="error" onClose={onDismissLocalUploadError}>
          <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
            {localUploadError}
          </Typography>
        </StanzaInlineAlert>
      ) : null}
      {fingerprintDeepLinkError ? (
        <StanzaInlineAlert
          severity="error"
          onClose={() => {
            onDismissFingerprintDeepLinkError();
            if (typeof window !== 'undefined') {
              const sp = new URLSearchParams(window.location.search);
              if (sp.get(STANZA_MEDIA_FINGERPRINT_QUERY)) {
                replaceStanzaPlaybackUrlSearchParams({
                  youtubeId: null,
                  driveFileId: null,
                  driveTitle: null,
                  mediaFingerprint: null,
                });
              }
            }
          }}
        >
          <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
            {fingerprintDeepLinkError}
          </Typography>
        </StanzaInlineAlert>
      ) : null}
      {showLoading ? (
        <StanzaInlineAlert severity="info">
          <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
            Fetching audio from Google Drive…
          </Typography>
        </StanzaInlineAlert>
      ) : null}
      {showDriveMediaHint ? (
        <StanzaInlineAlert
          severity="info"
          action={
            <Button color="inherit" size="small" variant="outlined" onClick={() => void onCompleteGestureDriveImport()}>
              Load from Drive
            </Button>
          }
        >
          <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
            Your sections and mix settings are here. Load the recording from Google Drive to hear it on this device.
          </Typography>
        </StanzaInlineAlert>
      ) : null}
      {driveDeepLinkRemovedPrompt ? (
        <StanzaInlineAlert
          severity="info"
          action={
            <Stack direction="row" spacing={0.5} sx={{
              alignItems: "center"
            }}>
              <Button color="inherit" size="small" disabled={driveDeepLinkBusy} onClick={onDismissDriveDeepLinkRemovedPrompt}>
                Not now
              </Button>
              <Button
                color="inherit"
                size="small"
                variant="outlined"
                disabled={driveDeepLinkBusy}
                onClick={() => void onCompleteDriveDeepLinkReAdd()}
              >
                {driveDeepLinkBusy ? '…' : 'Re-add'}
              </Button>
            </Stack>
          }
        >
          <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
            You removed <strong>{driveDeepLinkRemovedPrompt.title?.trim() || 'this Drive recording'}</strong> from your
            library. Re-add it?
          </Typography>
        </StanzaInlineAlert>
      ) : null}
      {driveDeepLinkNeedsGesture && !driveDeepLinkError ? (
        <StanzaInlineAlert
          severity="info"
          action={
            <Button color="inherit" size="small" disabled={driveDeepLinkBusy} onClick={() => void onCompleteGestureDriveImport()}>
              {driveDeepLinkBusy ? '…' : 'Continue'}
            </Button>
          }
        >
          <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
            {LABS_GOOGLE_INTERACTIVE_DRIVE_AUTH_HINT}
          </Typography>
        </StanzaInlineAlert>
      ) : null}
      {driveDeepLinkError ? (
        <StanzaInlineAlert
          severity="error"
          onClose={onDismissDriveDeepLinkError}
          action={
            /popup|Allow popups|sign-in window|blocked/i.test(driveDeepLinkError) ? (
              <Button color="inherit" size="small" disabled={driveDeepLinkBusy} onClick={() => void onCompleteGestureDriveImport()}>
                Retry
              </Button>
            ) : undefined
          }
        >
          <Stack spacing={1}>
            <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
              {driveDeepLinkError}
            </Typography>
            {/popup|Allow popups|sign-in window|blocked/i.test(driveDeepLinkError) ? (
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  lineHeight: 1.5
                }}>
                Popups blocked here are common even when your email shows in the account menu. That menu only remembers
                who you last signed in as in Encore.{' '}
                <Link href="/encore/" target="_blank" rel="noopener noreferrer">
                  Open Encore
                </Link>
                , finish Google sign-in from the account menu if asked, then come back and tap Retry (keep this tab).
              </Typography>
            ) : null}
          </Stack>
        </StanzaInlineAlert>
      ) : null}
    </>
  );
}
