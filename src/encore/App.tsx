import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useEffect, useMemo } from 'react';
import SkipToMain from '../shared/components/SkipToMain';
import { EncoreProvider, useEncore } from './context/EncoreContext';
import { AccessRestrictedScreen, SignInLanding } from './components/AccessGateScreens';
import { EncoreMainShell } from './components/EncoreMainShell';
import { GuestShareView } from './components/GuestShareView';
import { tryCompleteSpotifyOAuthFromUrl } from './spotify/completeOAuthFromUrl';

function parseShareFileIdFromHash(): string | null {
  const raw = window.location.hash.replace(/^#/, '');
  const m = /^\/share\/([^/?#]+)/.exec(raw);
  return m?.[1] ?? null;
}

function EncoreSignedInRouter(): React.ReactElement {
  const { googleAuthReady, googleAccessToken, accessDenied, accessDeniedMessage, signInWithGoogle, retryAccessGate } =
    useEncore();
  const clientConfigured = Boolean((import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim());

  return (
    <>
      <SkipToMain />
      {accessDenied ? (
        <main id="main">
          <AccessRestrictedScreen
            message={accessDeniedMessage}
            onRetry={() => {
              retryAccessGate();
            }}
          />
        </main>
      ) : !googleAuthReady ? (
        <main id="main">
          <Box
            className="encore-app-shell flex flex-col items-center justify-center min-h-screen min-h-[100dvh] p-8"
            aria-busy="true"
            aria-label="Restoring session"
          >
            <CircularProgress color="primary" />
          </Box>
        </main>
      ) : !googleAccessToken ? (
        <main id="main">
          <SignInLanding
            clientConfigured={clientConfigured}
            onSignIn={() => {
              void signInWithGoogle();
            }}
          />
        </main>
      ) : (
        <EncoreMainShell />
      )}
    </>
  );
}

export default function App(): React.ReactElement {
  const shareFileId = useMemo(() => parseShareFileIdFromHash(), []);

  useEffect(() => {
    void tryCompleteSpotifyOAuthFromUrl();
  }, []);

  if (shareFileId) {
    return (
      <Box className="encore-app-shell">
        <SkipToMain />
        <main id="main">
          <GuestShareView fileId={shareFileId} />
        </main>
      </Box>
    );
  }

  return (
    <EncoreProvider>
      <EncoreSignedInRouter />
    </EncoreProvider>
  );
}
