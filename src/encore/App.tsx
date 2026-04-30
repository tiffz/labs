import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import SkipToMain from '../shared/components/SkipToMain';
import {
  replaceLocalhostWithLoopbackOrigin,
  shouldRedirectLocalhostToLoopbackInDev,
} from './devLocalhostToLoopbackRedirect';
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
  const {
    googleAuthReady,
    googleAccessToken,
    googleGateBypassed,
    accessDenied,
    accessDeniedMessage,
    signInWithGoogle,
    continueWithoutGoogle,
    retryAccessGate,
  } = useEncore();
  const clientConfigured = Boolean((import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim());
  const canUseMainShell =
    Boolean(googleAccessToken) || googleGateBypassed || !clientConfigured;

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
            aria-label="Checking saved Google sign-in"
          >
            <CircularProgress color="primary" />
          </Box>
        </main>
      ) : !canUseMainShell ? (
        <main id="main">
          <SignInLanding
            clientConfigured={clientConfigured}
            onSignIn={() => {
              void signInWithGoogle();
            }}
            onContinueLocalOnly={clientConfigured ? continueWithoutGoogle : undefined}
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
  const [localhostDevRedirect] = useState(shouldRedirectLocalhostToLoopbackInDev);

  useLayoutEffect(() => {
    if (!localhostDevRedirect) return;
    replaceLocalhostWithLoopbackOrigin();
  }, [localhostDevRedirect]);

  useEffect(() => {
    void tryCompleteSpotifyOAuthFromUrl();
  }, []);

  if (localhostDevRedirect) {
    return (
      <Box
        className="encore-app-shell flex flex-col items-center justify-center min-h-screen min-h-[100dvh] p-8"
        aria-busy="true"
        aria-label="Switching to 127.0.0.1 for Encore development"
      >
        <CircularProgress color="primary" />
      </Box>
    );
  }

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
