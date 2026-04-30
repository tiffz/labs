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
import { EncoreAppShell } from './ui/EncoreAppShell';

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
          <EncoreAppShell centered aria-busy="true" aria-label="Checking saved Google sign-in">
            <CircularProgress color="primary" />
          </EncoreAppShell>
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
      <EncoreAppShell centered aria-busy="true" aria-label="Switching to 127.0.0.1 for Encore development">
        <CircularProgress color="primary" />
      </EncoreAppShell>
    );
  }

  if (shareFileId) {
    return (
      <EncoreAppShell>
        <SkipToMain />
        <main id="main">
          <GuestShareView fileId={shareFileId} />
        </main>
      </EncoreAppShell>
    );
  }

  return (
    <EncoreProvider>
      <EncoreSignedInRouter />
    </EncoreProvider>
  );
}
