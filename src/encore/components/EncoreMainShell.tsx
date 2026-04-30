import ShareIcon from '@mui/icons-material/Share';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useCallback, useEffect, useState } from 'react';
import type { EncoreAppRoute } from '../routes/encoreAppHash';
import { navigateEncore, parseEncoreAppHash } from '../routes/encoreAppHash';
import { useEncore } from '../context/EncoreContext';
import { encoreScreenPaddingX } from '../theme/encoreM3Layout';
import { EncoreAccountMenu } from './EncoreAccountMenu';
import { ConflictResolutionDialog } from './ConflictResolutionDialog';
import { LibraryScreen } from './LibraryScreen';
import { PerformancesScreen } from './PerformancesScreen';
import { SharePanel } from './SharePanel';
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
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const { syncState, syncMessage, conflict, resolveConflictRemote, resolveConflictLocal, dismissConflict } = useEncore();

  const openShareFromHash = useCallback(() => {
    if (!bareSignedInShareHash()) return;
    setShareDialogOpen(true);
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

  return (
    <div className="encore-app-shell flex flex-col min-h-screen min-h-[100dvh]">
      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: alpha(theme.palette.background.paper, 0.82),
          backdropFilter: 'saturate(160%) blur(18px)',
          WebkitBackdropFilter: 'saturate(160%) blur(18px)',
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
            columnGap: { xs: 1.5, sm: 2 },
          }}
        >
          <Box
            sx={{
              order: { xs: 0, md: 0 },
              flex: { xs: '1 1 auto', md: '0 1 auto' },
              minWidth: 0,
              maxWidth: { md: 'min(40%, 320px)' },
            }}
          >
            <ButtonBase
              component="button"
              type="button"
              onClick={() => navigateEncore({ kind: 'library' })}
              aria-label="Encore, go to library"
              sx={{
                display: 'block',
                textAlign: 'left',
                borderRadius: 1,
                px: 0.75,
                py: 0.25,
                width: '100%',
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.06) },
              }}
            >
              <Typography
                variant="h6"
                component="span"
                sx={{
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.1,
                  display: 'block',
                  background: `linear-gradient(120deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Encore
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: 'block',
                  mt: 0,
                  letterSpacing: '0.04em',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontSize: '0.6875rem',
                }}
              >
                Repertoire companion
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
            <Button
              variant="outlined"
              size="small"
              startIcon={<ShareIcon />}
              onClick={() => setShareDialogOpen(true)}
              sx={{ minHeight: 40 }}
            >
              Share
            </Button>
            <EncoreAccountMenu syncState={syncState} syncMessage={syncMessage} />
          </Box>

          {!onSongRoute ? (
            <Box
              sx={{
                order: { xs: 2, md: 1 },
                flex: { xs: '1 1 100%', md: '1 1 0' },
                minWidth: 0,
                width: { xs: '100%', md: 'auto' },
                display: 'flex',
                justifyContent: { xs: 'stretch', md: 'center' },
                borderTop: { xs: 1, md: 0 },
                borderColor: 'divider',
                pt: { xs: 0.5, md: 0 },
                mt: { xs: 0.25, md: 0 },
              }}
            >
              <Tabs
                value={route.kind === 'performances' ? 1 : 0}
                onChange={(_, v) => {
                  navigateEncore(v === 1 ? { kind: 'performances' } : { kind: 'library' });
                }}
                aria-label="Encore library sections"
                variant={compactHeaderTabs ? 'fullWidth' : 'standard'}
                sx={{
                  minHeight: 44,
                  width: { md: 'auto' },
                  maxWidth: { md: 400 },
                  '& .MuiTab-root': { minHeight: 44, textTransform: 'none', fontWeight: 700 },
                }}
              >
                <Tab label="Repertoire" id="encore-tab-repertoire" aria-controls="encore-panel-repertoire" />
                <Tab label="Performances" id="encore-tab-performances" aria-controls="encore-panel-performances" />
              </Tabs>
            </Box>
          ) : null}
        </Toolbar>
      </AppBar>
      <Box component="main" id="main" sx={{ flex: 1, minHeight: 0 }}>
        {onSongRoute ? (
          <SongPage key={songPageKey} route={route} />
        ) : (
          <Box
            role="tabpanel"
            id={route.kind === 'performances' ? 'encore-panel-performances' : 'encore-panel-repertoire'}
            aria-labelledby={route.kind === 'performances' ? 'encore-tab-performances' : 'encore-tab-repertoire'}
            sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
          >
            {route.kind === 'performances' ? <PerformancesScreen /> : <LibraryScreen />}
          </Box>
        )}
      </Box>
      <Dialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        scroll="paper"
        aria-labelledby="encore-share-dialog-title"
        slotProps={{
          paper: {
            sx: { borderRadius: 2, m: { xs: 2, sm: 3 } },
          },
        }}
      >
        <DialogTitle id="encore-share-dialog-title" sx={{ pb: 1 }}>
          Secret guest link
        </DialogTitle>
        <DialogContent dividers sx={{ px: 3, py: 2 }}>
          <SharePanel />
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5, gap: 1 }}>
          <Button onClick={() => setShareDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      <ConflictResolutionDialog
        open={Boolean(conflict?.conflict)}
        conflict={conflict}
        onUseRemote={() => void resolveConflictRemote()}
        onKeepLocal={() => void resolveConflictLocal()}
        onDismiss={dismissConflict}
      />
    </div>
  );
}
