import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import useScrollTrigger from '@mui/material/useScrollTrigger';
import { useCallback, useEffect, useState } from 'react';
import type { EncoreAppRoute } from '../routes/encoreAppHash';
import { navigateEncore, parseEncoreAppHash } from '../routes/encoreAppHash';
import { useEncore } from '../context/EncoreContext';
import { encoreScreenPaddingX } from '../theme/encoreM3Layout';
import { encoreFrostedSurfaceSx, encoreRadius } from '../theme/encoreUiTokens';
import { EncoreAppShell } from '../ui/EncoreAppShell';
import { EncoreAccountMenu } from './EncoreAccountMenu';
import { EncoreShareMenu } from './EncoreShareMenu';
import { ConflictResolutionDialog } from './ConflictResolutionDialog';
import { LibraryScreen } from './LibraryScreen';
import { PerformancesScreen } from './PerformancesScreen';
import { RepertoireSettingsScreen } from './RepertoireSettingsScreen';
import { SongPage } from './SongPage';

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
  const { syncState, syncMessage, conflict, resolveConflictRemote, resolveConflictLocal, dismissConflict } = useEncore();
  const scrolled = useScrollTrigger({ disableHysteresis: true, threshold: 4 });

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
    route.kind === 'performances' ? 1 : route.kind === 'repertoireSettings' ? 2 : 0; /* Repertoire: library + song detail */

  return (
    <EncoreAppShell>
      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{
          ...encoreFrostedSurfaceSx,
          borderBottom: 'none',
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
              component="button"
              type="button"
              onClick={() => navigateEncore({ kind: 'library' })}
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
              onChange={(_, v) => {
                if (v === 0) navigateEncore({ kind: 'library' });
                else if (v === 1) navigateEncore({ kind: 'performances' });
                else navigateEncore({ kind: 'repertoireSettings' });
              }}
              aria-label="Encore library sections"
              variant={compactHeaderTabs ? 'fullWidth' : 'standard'}
              sx={{
                minHeight: 44,
                width: { md: 'auto' },
                maxWidth: { md: 480 },
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
                id="encore-tab-repertoire"
                aria-controls="encore-panel-repertoire"
                onClick={() => {
                  if (route.kind === 'song' || route.kind === 'songNew') navigateEncore({ kind: 'library' });
                }}
              />
              <Tab label="Performances" id="encore-tab-performances" aria-controls="encore-panel-performances" />
              <Tab label="Library settings" id="encore-tab-setup" aria-controls="encore-panel-setup" />
            </Tabs>
          </Box>
        </Toolbar>
      </AppBar>
      <Box component="main" id="main" sx={{ flex: 1, minHeight: 0 }}>
        {onSongRoute ? (
          <Box
            role="tabpanel"
            id="encore-panel-repertoire"
            aria-labelledby="encore-tab-repertoire"
            sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
          >
            <SongPage key={songPageKey} route={route} />
          </Box>
        ) : (
          <Box
            role="tabpanel"
            id={
              route.kind === 'performances'
                ? 'encore-panel-performances'
                : route.kind === 'repertoireSettings'
                  ? 'encore-panel-setup'
                  : 'encore-panel-repertoire'
            }
            aria-labelledby={
              route.kind === 'performances'
                ? 'encore-tab-performances'
                : route.kind === 'repertoireSettings'
                  ? 'encore-tab-setup'
                  : 'encore-tab-repertoire'
            }
            sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
          >
            {route.kind === 'performances' ? (
              <PerformancesScreen />
            ) : route.kind === 'repertoireSettings' ? (
              <RepertoireSettingsScreen />
            ) : (
              <LibraryScreen />
            )}
          </Box>
        )}
      </Box>
      <ConflictResolutionDialog
        open={Boolean(conflict?.conflict)}
        conflict={conflict}
        onUseRemote={() => void resolveConflictRemote()}
        onKeepLocal={() => void resolveConflictLocal()}
        onDismiss={dismissConflict}
      />
    </EncoreAppShell>
  );
}
