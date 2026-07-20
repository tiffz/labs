import {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useSyncExternalStore,
  useState,
  type ReactElement,
} from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import SkipToMain from '../shared/components/SkipToMain';
import {
  replaceLocalhostWithLoopbackOrigin,
  shouldRedirectLocalhostToLoopbackInDev,
} from './devLocalhostToLoopbackRedirect';
import { useEncoreAuth } from './context/EncoreAuthContext';
import { AccessRestrictedScreen, SignInLanding } from './components/AccessGateScreens';
import { tryCompleteSpotifyOAuthFromUrl } from './spotify/completeOAuthFromUrl';
import { EncoreAppShell } from './ui/EncoreAppShell';
import { touchLabsGoogleSessionConsumer } from '../shared/google/labsGoogleSessionConsumers';
import {
  getEncoreLocationHash,
  getEncoreLocationHashServerSnapshot,
  isEncoreGuestShareHash,
  parseGuestShareSnapshotFileIdFromHash,
  subscribeEncoreLocationHash,
} from './seo/guestShareRobots';

const EncoreMainShell = lazy(() =>
  import('./components/EncoreMainShell').then((m) => ({ default: m.EncoreMainShell })),
);
const GuestShareView = lazy(() =>
  import('./components/GuestShareView').then((m) => ({ default: m.GuestShareView })),
);

function EncoreBootFallback({ label }: { label: string }): ReactElement {
  return (
    <EncoreAppShell centered aria-busy="true" aria-label={label}>
      <CircularProgress color="primary" />
    </EncoreAppShell>
  );
}

function EncoreSignedInRouter(): ReactElement {
  const {
    googleAuthReady,
    googleAccessToken,
    googleGateBypassed,
    googleEmail,
    accessDenied,
    accessDeniedMessage,
    signInWithGoogle,
    googleSignInPending,
    continueWithoutGoogle,
    retryAccessGate,
  } = useEncoreAuth();
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
            onContinueLocalOnly={clientConfigured ? continueWithoutGoogle : undefined}
          />
        </main>
      ) : !googleAuthReady ? (
        <main id="main">
          <EncoreAppShell centered aria-busy="true" aria-label="Checking saved Google sign-in">
            <CircularProgress color="primary" />
          </EncoreAppShell>
        </main>
      ) : !canUseMainShell && googleEmail?.trim() ? (
        <main id="main">
          <EncoreAppShell centered aria-busy="true" aria-label="Restoring Google sign-in">
            <CircularProgress color="primary" />
          </EncoreAppShell>
        </main>
      ) : !canUseMainShell ? (
        <main id="main">
          <SignInLanding
            clientConfigured={clientConfigured}
            signInPending={googleSignInPending}
            onSignIn={() => {
              void signInWithGoogle();
            }}
            onContinueLocalOnly={clientConfigured ? continueWithoutGoogle : undefined}
          />
        </main>
      ) : (
        <Suspense fallback={<EncoreBootFallback label="Loading Encore" />}>
          <EncoreMainShell />
        </Suspense>
      )}
    </>
  );
}

export default function App(): ReactElement {
  const locationHash = useSyncExternalStore(
    subscribeEncoreLocationHash,
    getEncoreLocationHash,
    getEncoreLocationHashServerSnapshot,
  );
  const shareFileId = useMemo(() => parseGuestShareSnapshotFileIdFromHash(locationHash), [locationHash]);
  const [localhostDevRedirect] = useState(shouldRedirectLocalhostToLoopbackInDev);

  useLayoutEffect(() => {
    if (!localhostDevRedirect) return;
    replaceLocalhostWithLoopbackOrigin();
  }, [localhostDevRedirect]);

  useEffect(() => {
    void tryCompleteSpotifyOAuthFromUrl();
  }, []);

  useEffect(() => {
    if (isEncoreGuestShareHash()) return;
    touchLabsGoogleSessionConsumer('encore');
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
      <>
        <SkipToMain />
        <main id="main">
          <Suspense fallback={<EncoreBootFallback label="Loading shared snapshot" />}>
            <GuestShareView fileId={shareFileId} />
          </Suspense>
        </main>
      </>
    );
  }

  return <EncoreSignedInRouter />;
}
