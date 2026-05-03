import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import useScrollTrigger from '@mui/material/useScrollTrigger';
import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import type { EncoreAppRoute } from '../routes/encoreAppHash';
import { encoreAppHref, navigateEncore, parseEncoreAppHash } from '../routes/encoreAppHash';
import { useEncoreSync } from '../context/EncoreContext';
import { encoreScreenPaddingX } from '../theme/encoreM3Layout';
import { encoreHairline, encoreRadius } from '../theme/encoreUiTokens';
import { EncoreAppShell } from '../ui/EncoreAppShell';
import { EncoreAccountMenu } from './EncoreAccountMenu';
import { EncoreShareMenu } from './EncoreShareMenu';
import { SyncConflictReviewDialog } from './SyncConflictReviewDialog';
import { EncoreScreenSkeleton } from './EncoreScreenSkeleton';

const SongPage = lazy(async () => {
  const m = await import('./SongPage');
  return { default: m.SongPage };
});
const PracticeScreen = lazy(async () => {
  const m = await import('./PracticeScreen');
  return { default: m.PracticeScreen };
});
const LibraryScreen = lazy(async () => {
  const m = await import('./LibraryScreen');
  return { default: m.LibraryScreen };
});
const PerformancesScreen = lazy(async () => {
  const m = await import('./PerformancesScreen');
  return { default: m.PerformancesScreen };
});
const ImportGuideScreen = lazy(async () => {
  const m = await import('./ImportGuideScreen');
  return { default: m.ImportGuideScreen };
});
const RepertoireSettingsScreen = lazy(async () => {
  const m = await import('./RepertoireSettingsScreen');
  return { default: m.RepertoireSettingsScreen };
});

function bareSignedInShareHash(): boolean {
  const raw = window.location.hash.replace(/^#/, '').trim();
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  const segs = path.split('/').filter(Boolean);
  return segs[0] === 'share' && !segs[1];
}

function readHashRoute(): EncoreAppRoute {
  return parseEncoreAppHash(window.location.hash);
}

export function EncoreMainShell(): React.ReactElement {
  const theme = useTheme();
  const compactHeaderTabs = useMediaQuery(theme.breakpoints.down('sm'));
  const [route, setRoute] = useState<EncoreAppRoute>(() => readHashRoute());
  const [shareMenuKick, setShareMenuKick] = useState(0);
  const {
    syncState,
    syncMessage,
    conflict,
    conflictAnalysis,
    resolveConflictWithChoices,
    dismissConflict,
    lastSilentMerge,
    acknowledgeSilentMerge,
  } = useEncoreSync();
  const scrolled = useScrollTrigger({ disableHysteresis: false, threshold: 8 });

  const silentMergeMessage = lastSilentMerge
    ? (() => {
        const parts: string[] = [];
        if (lastSilentMerge.localOnlyCount > 0) parts.push(`${lastSilentMerge.localOnlyCount} from this device`);
        if (lastSilentMerge.remoteOnlyCount > 0) parts.push(`${lastSilentMerge.remoteOnlyCount} from Drive`);
        if (parts.length === 0) return 'Merged with Google Drive.';
        return `Merged ${parts.join(' + ')} from Google Drive.`;
      })()
    : null;

  const openShareFromHash = useCallback(() => {
    if (!bareSignedInShareHash()) return;
    setShareMenuKick((k) => k + 1);
    navigateEncore({ kind: 'library' });
  }, []);

  useEffect(() => {
    const raw = window.location.hash.replace(/^#/, '').trim();
    if (!raw) navigateEncore({ kind: 'library' });
  }, []);

  useEffect(() => {
    const onHash = () => {
      setRoute(readHashRoute());
      openShareFromHash();
    };
    onHash();
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [openShareFromHash]);

  const onSongRoute = route.kind === 'song' || route.kind === 'songNew';
  const songPageKey = route.kind === 'songNew' ? 'new' : route.kind === 'song' ? route.id : 'main';
  const librarySectionTab =
    onSongRoute
      ? 0
      : route.kind === 'performances'
        ? 1
        : route.kind === 'practice'
          ? 2
          : route.kind === 'repertoireSettings'
            ? 3
            : route.kind === 'help'
              ? 4
              : 0;

  return (
    <EncoreAppShell>
      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{
          /**
           * Avoid `backdrop-filter` on sticky chrome: when the main column scrolls under the
           * AppBar, blur compositing dominates frame time (felt as jank even with small tables).
           * Use a solid translucent bar instead — same warmth, much cheaper to paint.
           */
          bgcolor: (t) =>
            t.palette.mode === 'dark' ? 'rgba(20, 16, 30, 0.94)' : 'rgba(255, 255, 255, 0.94)',
          borderBottomWidth: 1,
          borderBottomStyle: 'solid',
          borderBottomColor: encoreHairline,
          transition: theme.transitions.create('box-shadow', { duration: 240 }),
          boxShadow: scrolled ? '0 4px 20px rgba(76, 29, 149, 0.10)' : 'none',
        }}
      >
        <Toolbar
          disableGutters
          sx={{
            px: encoreScreenPaddingX,
            minHeight: 56,
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 1.5, sm: 2 },
            flexWrap: { xs: 'wrap', md: 'nowrap' },
            rowGap: 1,
          }}
        >
          <Box
            sx={{
              flex: { xs: '1 1 auto', md: '0 1 auto' },
              minWidth: 0,
              maxWidth: { md: 'min(40%, 280px)' },
            }}
          >
            <ButtonBase
              component="a"
              href={encoreAppHref({ kind: 'library' })}
              aria-label="Encore, go to library"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                textAlign: 'left',
                borderRadius: encoreRadius,
                px: 0.75,
                py: 0.5,
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.06) },
              }}
            >
              <Box
                component="img"
                src="/icons/favicon-encore.png"
                alt=""
                aria-hidden
                sx={{
                  width: 24,
                  height: 24,
                  display: 'block',
                  flexShrink: 0,
                  filter: 'drop-shadow(0 1px 1px rgba(76, 29, 149, 0.18))',
                }}
              />
              <Typography
                variant="h6"
                component="span"
                sx={{
                  fontWeight: 700,
                  letterSpacing: '-0.035em',
                  lineHeight: 1.1,
                  background: `linear-gradient(120deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Encore
              </Typography>
            </ButtonBase>
          </Box>

          <Box
            sx={{
              order: { xs: 1, md: 2 },
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexShrink: 0,
              ml: { xs: 'auto', md: 0 },
            }}
          >
            <EncoreShareMenu openKick={shareMenuKick} />
            <EncoreAccountMenu syncState={syncState} syncMessage={syncMessage} />
          </Box>

          <Box
            sx={{
              order: { xs: 2, md: 1 },
              flex: { xs: '1 1 100%', md: '1 1 0' },
              minWidth: 0,
              width: { xs: '100%', md: 'auto' },
              display: 'flex',
              justifyContent: { xs: 'stretch', md: 'center' },
              pt: { xs: 0.5, md: 0 },
              mt: { xs: 0.25, md: 0 },
            }}
          >
            <Tabs
              value={librarySectionTab}
              aria-label="Encore library sections"
              variant={compactHeaderTabs ? 'fullWidth' : 'standard'}
              sx={{
                minHeight: 44,
                width: { md: 'auto' },
                maxWidth: { md: 720 },
                overflowX: 'auto',
                '& .MuiTabs-indicator': { height: 2, borderRadius: 1 },
                '& .MuiTab-root': {
                  minHeight: 44,
                  px: { xs: 0, sm: 2 },
                  textTransform: 'none',
                  fontWeight: 600,
                  letterSpacing: '-0.005em',
                  color: 'text.secondary',
                  '&.Mui-selected': { color: 'text.primary', fontWeight: 700 },
                },
              }}
            >
              <Tab
                label="Repertoire"
                component="a"
                href={encoreAppHref({ kind: 'library' })}
                id="encore-tab-repertoire"
                aria-controls="encore-panel-repertoire"
              />
              <Tab
                label="Performances"
                component="a"
                href={encoreAppHref({ kind: 'performances' })}
                id="encore-tab-performances"
                aria-controls="encore-panel-performances"
              />
              <Tab
                label="Practice"
                component="a"
                href={encoreAppHref({ kind: 'practice' })}
                id="encore-tab-practice"
                aria-controls="encore-panel-practice"
              />
              <Tab
                label="Settings"
                component="a"
                href={encoreAppHref({ kind: 'repertoireSettings' })}
                id="encore-tab-setup"
                aria-controls="encore-panel-setup"
              />
              <Tab
                label="Help"
                component="a"
                href={encoreAppHref({ kind: 'help' })}
                id="encore-tab-help"
                aria-controls="encore-panel-help"
              />
            </Tabs>
          </Box>
        </Toolbar>
      </AppBar>
      <Box component="main" id="main" sx={{ flex: 1, minHeight: 0, minWidth: 0, width: 1 }}>
        {onSongRoute ? (
          <Box
            role="tabpanel"
            id="encore-panel-repertoire"
            aria-labelledby="encore-tab-repertoire"
            sx={{ flex: 1, minHeight: 0, minWidth: 0, width: 1, display: 'flex', flexDirection: 'column' }}
          >
            <Suspense fallback={<EncoreScreenSkeleton label="Loading song" />}>
              <SongPage key={songPageKey} route={route} />
            </Suspense>
          </Box>
        ) : (
          <Box
            role="tabpanel"
            id={
              route.kind === 'practice'
                ? 'encore-panel-practice'
                : route.kind === 'performances'
                  ? 'encore-panel-performances'
                  : route.kind === 'repertoireSettings'
                    ? 'encore-panel-setup'
                    : route.kind === 'help'
                      ? 'encore-panel-help'
                      : 'encore-panel-repertoire'
            }
            aria-labelledby={
              route.kind === 'practice'
                ? 'encore-tab-practice'
                : route.kind === 'performances'
                  ? 'encore-tab-performances'
                  : route.kind === 'repertoireSettings'
                    ? 'encore-tab-setup'
                    : route.kind === 'help'
                      ? 'encore-tab-help'
                      : 'encore-tab-repertoire'
            }
            sx={{ flex: 1, minHeight: 0, minWidth: 0, width: 1, display: 'flex', flexDirection: 'column' }}
          >
            <Suspense fallback={<EncoreScreenSkeleton />}>
              {route.kind === 'practice' ? (
                <PracticeScreen />
              ) : route.kind === 'performances' ? (
                <PerformancesScreen />
              ) : route.kind === 'repertoireSettings' ? (
                <RepertoireSettingsScreen />
              ) : route.kind === 'help' ? (
                <ImportGuideScreen />
              ) : (
                <LibraryScreen />
              )}
            </Suspense>
          </Box>
        )}
      </Box>
      <SyncConflictReviewDialog
        open={Boolean(conflict?.conflict) && (conflictAnalysis?.bothEdited.length ?? 0) > 0}
        analysis={conflictAnalysis}
        onApply={(choices) => void resolveConflictWithChoices(choices)}
        onDismiss={dismissConflict}
      />
      <Snackbar
        open={Boolean(silentMergeMessage)}
        autoHideDuration={4500}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        onClose={acknowledgeSilentMerge}
        sx={{ bottom: { xs: 96, sm: 104 } }}
      >
        <Alert
          onClose={acknowledgeSilentMerge}
          severity="success"
          variant="filled"
          sx={{ borderRadius: 2 }}
        >
          {silentMergeMessage}
        </Alert>
      </Snackbar>
    </EncoreAppShell>
  );
}
