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
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import type { EncoreAppRoute } from '../routes/encoreAppHash';
import { encoreAppHref, navigateEncore, parseEncoreAppHash } from '../routes/encoreAppHash';
import { useEncoreSync } from '../context/EncoreContext';
import { encoreScreenPaddingX } from '../theme/encoreM3Layout';
import { encoreHairline, encoreRadius } from '../theme/encoreUiTokens';
import { EncoreAppShell } from '../ui/EncoreAppShell';
import { EncoreAccountMenu } from './EncoreAccountMenu';
import { EncoreHeavyListTabPlaceholder } from './EncoreHeavyListTabPlaceholder';
import { EncoreShareMenu } from './EncoreShareMenu';
import { SyncConflictReviewDialog } from './SyncConflictReviewDialog';
import { SyncConflictCoarseDialog } from './SyncConflictCoarseDialog';
import { ImportGuideScreen as ImportGuideScreenBase } from './ImportGuideScreen';
import { LibraryScreen as LibraryScreenBase } from './LibraryScreen';
import { PerformancesScreen as PerformancesScreenBase } from './PerformancesScreen';
import { PracticeScreen as PracticeScreenBase } from './PracticeScreen';
import { RepertoireSettingsScreen as RepertoireSettingsScreenBase } from './RepertoireSettingsScreen';
import { SavedSearchesManageScreen as SavedSearchesManageScreenBase } from './SavedSearchesManageScreen';
import { SongPage as SongPageBase } from './SongPage';
import { OriginalsLibraryScreen as OriginalsLibraryScreenBase } from '../originals/components/OriginalsLibraryScreen';
import { OriginalSongPage as OriginalSongPageBase } from '../originals/components/OriginalSongPage';
import { EncoreMediaPlaybackBar } from '../components/EncoreMediaPlaybackBar';
import { EncoreMediaPlaybackYoutubeFloat } from '../components/EncoreMediaPlaybackYoutubeFloat';
import { EncoreMediaPlaybackDriveVideoFloat } from '../components/EncoreMediaPlaybackDriveVideoFloat';
import {
  LabsKeyboardShortcutsHost,
  encoreKeyboardShortcutSections,
} from '../../shared/keyboardShortcuts';

/** Eager imports: Encore’s main surfaces are one cohesive shell; avoiding `React.lazy` removes Suspense + chunk latency on tab and song navigation for a modest bundle cost. */
const LibraryScreen = memo(LibraryScreenBase);
const PerformancesScreen = memo(PerformancesScreenBase);
const PracticeScreen = memo(PracticeScreenBase);
const RepertoireSettingsScreen = memo(RepertoireSettingsScreenBase);
const ImportGuideScreen = memo(ImportGuideScreenBase);
const SongPage = memo(SongPageBase);
const SavedSearchesManageScreen = memo(SavedSearchesManageScreenBase);
const OriginalsLibraryScreen = memo(OriginalsLibraryScreenBase);
const OriginalSongPage = memo(OriginalSongPageBase);

function bareSignedInShareHash(): boolean {
  const raw = window.location.hash.replace(/^#/, '').trim();
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  const segs = path.split('/').filter(Boolean);
  return segs[0] === 'share' && !segs[1];
}

function subscribeEncoreHash(onStoreChange: () => void): () => void {
  window.addEventListener('hashchange', onStoreChange);
  return () => window.removeEventListener('hashchange', onStoreChange);
}

function encoreHashSnapshot(): string {
  return window.location.hash;
}

/** Top-level list tabs (not song editor); kept mounted once visited so tab switches stay instant. */
type EncoreMainListSection = 'library' | 'originals' | 'performances' | 'practice' | 'repertoireSettings' | 'help';

function listSectionFromRoute(r: EncoreAppRoute): EncoreMainListSection | null {
  switch (r.kind) {
    case 'savedSearches':
      return 'library';
    case 'library':
    case 'originals':
    case 'performances':
    case 'practice':
    case 'repertoireSettings':
    case 'help':
      return r.kind;
    default:
      return null;
  }
}

function initialListSectionVisited(route: EncoreAppRoute): Record<EncoreMainListSection, boolean> {
  const next: Record<EncoreMainListSection, boolean> = {
    library: false,
    originals: false,
    performances: false,
    practice: false,
    repertoireSettings: false,
    help: false,
  };
  const s = listSectionFromRoute(route);
  if (s) next[s] = true;
  return next;
}

function readInitialRoute(): EncoreAppRoute {
  return parseEncoreAppHash(typeof window !== 'undefined' ? window.location.hash : '');
}

/** Minimum time the grey list-tab placeholder stays up on a tab’s **first** visit so cold load reads as intentional. */
const HEAVY_TAB_OVERLAY_MIN_MS = 160;
const HEAVY_TAB_OVERLAY_FAILSAFE_MS = 2800;

type HeavyListTabKey = 'library' | 'performances';

type HeavyListTabOverlayState =
  | { kind: 'none' }
  | { kind: 'waiting'; tab: HeavyListTabKey; since: number; laidOut: boolean };

type HeavyListTabSessionWarmed = Record<HeavyListTabKey, boolean>;

const LIST_TAB_PANEL_IDS: Record<EncoreMainListSection, { id: string; ariaLabelledBy: string }> = {
  library: { id: 'encore-panel-repertoire', ariaLabelledBy: 'encore-tab-repertoire' },
  originals: { id: 'encore-panel-originals', ariaLabelledBy: 'encore-tab-originals' },
  performances: { id: 'encore-panel-performances', ariaLabelledBy: 'encore-tab-performances' },
  practice: { id: 'encore-panel-practice', ariaLabelledBy: 'encore-tab-practice' },
  repertoireSettings: { id: 'encore-panel-setup', ariaLabelledBy: 'encore-tab-setup' },
  help: { id: 'encore-panel-help', ariaLabelledBy: 'encore-tab-help' },
};

export function EncoreMainShell(): React.ReactElement {
  const theme = useTheme();

  const compactHeaderTabs = useMediaQuery(theme.breakpoints.down('sm'));
  const hashFragment = useSyncExternalStore(subscribeEncoreHash, encoreHashSnapshot, () => '');
  const route = useMemo(() => parseEncoreAppHash(hashFragment), [hashFragment]);
  const [listSectionVisited, setListSectionVisited] = useState(() => initialListSectionVisited(readInitialRoute()));
  const [shareMenuKick, setShareMenuKick] = useState(0);
  const {
    syncState,
    syncMessage,
    conflict,
    conflictAnalysis,
    resolveConflictWithChoices,
    resolveConflictRemote,
    resolveConflictLocal,
    dismissConflict,
    lastSilentMerge,
    acknowledgeSilentMerge,
  } = useEncoreSync();
  const [mainScrollEl, setMainScrollEl] = useState<HTMLElement | null>(null);
  const scrolled = useScrollTrigger({
    disableHysteresis: false,
    threshold: 8,
    target: mainScrollEl ?? undefined,
  });

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
      openShareFromHash();
    };
    onHash();
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [openShareFromHash]);

  const onSongRoute = route.kind === 'song' || route.kind === 'songNew';
  const onOriginalRoute =
    route.kind === 'original' || route.kind === 'originalNew';
  const onEditorRoute = onSongRoute || onOriginalRoute;
  const songPageKey = route.kind === 'songNew' ? 'new' : route.kind === 'song' ? route.id : 'main';
  const originalPageKey =
    route.kind === 'originalNew' ? 'new' : route.kind === 'original' ? route.id : 'main';
  const librarySectionTab = onEditorRoute
    ? route.kind === 'original' || route.kind === 'originalNew'
      ? 1
      : 0
    : route.kind === 'originals'
      ? 1
      : route.kind === 'performances'
        ? 2
        : route.kind === 'practice'
          ? 3
          : route.kind === 'repertoireSettings'
            ? 4
            : route.kind === 'help'
              ? 5
              : 0;

  const listSection = listSectionFromRoute(route);

  const [heavyListTabOverlay, setHeavyListTabOverlay] = useState<HeavyListTabOverlayState>({ kind: 'none' });
  const [heavyListTabSessionWarmed, setHeavyListTabSessionWarmed] = useState<HeavyListTabSessionWarmed>({
    library: false,
    performances: false,
  });

  useLayoutEffect(() => {
    const s = listSectionFromRoute(route);
    if (s) {
      setListSectionVisited((prev) => (prev[s] ? prev : { ...prev, [s]: true }));
    }

    const heavyTab =
      !onEditorRoute && (s === 'library' || s === 'performances') ? s : null;
    if (!heavyTab) {
      setHeavyListTabOverlay({ kind: 'none' });
      return;
    }
    if (heavyListTabSessionWarmed[heavyTab]) {
      setHeavyListTabOverlay({ kind: 'none' });
      return;
    }
    setHeavyListTabOverlay({ kind: 'waiting', tab: heavyTab, since: performance.now(), laidOut: false });
    const failsafe = window.setTimeout(() => {
      setHeavyListTabOverlay((cur) =>
        cur.kind === 'waiting' && cur.tab === heavyTab ? { kind: 'none' } : cur,
      );
      setHeavyListTabSessionWarmed((w) => (w[heavyTab] ? w : { ...w, [heavyTab]: true }));
    }, HEAVY_TAB_OVERLAY_FAILSAFE_MS);
    return () => window.clearTimeout(failsafe);
  }, [route, onEditorRoute, heavyListTabSessionWarmed]);

  useEffect(() => {
    if (heavyListTabOverlay.kind !== 'waiting' || !heavyListTabOverlay.laidOut) return;
    const tab = heavyListTabOverlay.tab;
    const elapsed = performance.now() - heavyListTabOverlay.since;
    const remaining = Math.max(0, HEAVY_TAB_OVERLAY_MIN_MS - elapsed);
    const id = window.setTimeout(() => {
      setHeavyListTabOverlay({ kind: 'none' });
      setHeavyListTabSessionWarmed((w) => (w[tab] ? w : { ...w, [tab]: true }));
    }, remaining);
    return () => window.clearTimeout(id);
  }, [heavyListTabOverlay]);

  const markHeavyListTabLaidOut = useCallback((tab: HeavyListTabKey) => {
    setHeavyListTabOverlay((cur) => {
      if (cur.kind !== 'waiting' || cur.tab !== tab) return cur;
      return { ...cur, laidOut: true };
    });
  }, []);

  const onLibraryHeavyTabLaidOut = useCallback(() => {
    markHeavyListTabLaidOut('library');
  }, [markHeavyListTabLaidOut]);

  const onPerformancesHeavyTabLaidOut = useCallback(() => {
    markHeavyListTabLaidOut('performances');
  }, [markHeavyListTabLaidOut]);

  const showHeavyListTabPlaceholder = heavyListTabOverlay.kind === 'waiting';

  return (
    <LabsKeyboardShortcutsHost sections={encoreKeyboardShortcutSections} theme="encore">
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
                '& .MuiTabs-indicator': {
                  height: 2,
                  borderRadius: 1,
                  transition: theme.transitions.create(['left', 'width'], {
                    duration: theme.transitions.duration.standard,
                    easing: theme.transitions.easing.easeInOut,
                  }),
                },
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
                aria-controls={onSongRoute ? 'encore-panel-song' : 'encore-panel-repertoire'}
              />
              <Tab
                label="Originals"
                component="a"
                href={encoreAppHref({ kind: 'originals' })}
                id="encore-tab-originals"
                aria-controls={onOriginalRoute ? 'encore-panel-original' : 'encore-panel-originals'}
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
      <Box
        component="main"
        id="main"
        ref={setMainScrollEl}
        className="in-scroll-region"
        sx={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          width: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/*
          Keep each list section mounted after first visit (display:none when inactive). Tab clicks
          only toggled visibility before; unmounting LibraryScreen / PerformancesScreen forced a
          full MRT + Dexie subscription rebuild every time, which felt like a slow tab.
        */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            minWidth: 0,
            width: 1,
            display: onEditorRoute ? 'none' : 'flex',
            flexDirection: 'column',
          }}
          aria-hidden={onEditorRoute}
        >
          {listSectionVisited.library ? (
            <Box
              role="tabpanel"
              id={!onEditorRoute && listSection === 'library' ? LIST_TAB_PANEL_IDS.library.id : undefined}
              aria-labelledby={
                !onEditorRoute && listSection === 'library' ? LIST_TAB_PANEL_IDS.library.ariaLabelledBy : undefined
              }
              sx={{
                flex: 1,
                minHeight: 0,
                minWidth: 0,
                width: 1,
                display: !onEditorRoute && listSection === 'library' ? 'flex' : 'none',
                flexDirection: 'column',
              }}
              aria-hidden={onEditorRoute || listSection !== 'library'}
            >
              {route.kind === 'savedSearches' ? (
                <SavedSearchesManageScreen onHeavyTabLaidOut={onLibraryHeavyTabLaidOut} />
              ) : (
                <LibraryScreen
                  heavyListTabActive={!onEditorRoute && listSection === 'library'}
                  onHeavyTabLaidOut={onLibraryHeavyTabLaidOut}
                />
              )}
            </Box>
          ) : null}
          {listSectionVisited.originals ? (
            <Box
              role="tabpanel"
              id={!onEditorRoute && listSection === 'originals' ? LIST_TAB_PANEL_IDS.originals.id : undefined}
              aria-labelledby={
                !onEditorRoute && listSection === 'originals'
                  ? LIST_TAB_PANEL_IDS.originals.ariaLabelledBy
                  : undefined
              }
              sx={{
                flex: 1,
                minHeight: 0,
                minWidth: 0,
                width: 1,
                display: !onEditorRoute && listSection === 'originals' ? 'flex' : 'none',
                flexDirection: 'column',
              }}
              aria-hidden={onEditorRoute || listSection !== 'originals'}
            >
              <OriginalsLibraryScreen />
            </Box>
          ) : null}
          {listSectionVisited.performances ? (
            <Box
              role="tabpanel"
              id={!onEditorRoute && listSection === 'performances' ? LIST_TAB_PANEL_IDS.performances.id : undefined}
              aria-labelledby={
                !onEditorRoute && listSection === 'performances'
                  ? LIST_TAB_PANEL_IDS.performances.ariaLabelledBy
                  : undefined
              }
              sx={{
                flex: 1,
                minHeight: 0,
                minWidth: 0,
                width: 1,
                display: !onEditorRoute && listSection === 'performances' ? 'flex' : 'none',
                flexDirection: 'column',
              }}
              aria-hidden={onEditorRoute || listSection !== 'performances'}
            >
              <PerformancesScreen
                heavyListTabActive={!onEditorRoute && listSection === 'performances'}
                onHeavyTabLaidOut={onPerformancesHeavyTabLaidOut}
              />
            </Box>
          ) : null}
          {listSectionVisited.practice ? (
            <Box
              role="tabpanel"
              id={!onEditorRoute && listSection === 'practice' ? LIST_TAB_PANEL_IDS.practice.id : undefined}
              aria-labelledby={
                !onEditorRoute && listSection === 'practice' ? LIST_TAB_PANEL_IDS.practice.ariaLabelledBy : undefined
              }
              sx={{
                flex: 1,
                minHeight: 0,
                minWidth: 0,
                width: 1,
                display: !onEditorRoute && listSection === 'practice' ? 'flex' : 'none',
                flexDirection: 'column',
              }}
              aria-hidden={onEditorRoute || listSection !== 'practice'}
            >
              <PracticeScreen
                practiceHashActive={route.kind === 'practice'}
                songIdFromPracticeHash={route.kind === 'practice' ? route.songId : undefined}
              />
            </Box>
          ) : null}
          {listSectionVisited.repertoireSettings ? (
            <Box
              role="tabpanel"
              id={
                !onEditorRoute && listSection === 'repertoireSettings' ? LIST_TAB_PANEL_IDS.repertoireSettings.id : undefined
              }
              aria-labelledby={
                !onEditorRoute && listSection === 'repertoireSettings'
                  ? LIST_TAB_PANEL_IDS.repertoireSettings.ariaLabelledBy
                  : undefined
              }
              sx={{
                flex: 1,
                minHeight: 0,
                minWidth: 0,
                width: 1,
                display: !onEditorRoute && listSection === 'repertoireSettings' ? 'flex' : 'none',
                flexDirection: 'column',
              }}
              aria-hidden={onEditorRoute || listSection !== 'repertoireSettings'}
            >
              <RepertoireSettingsScreen />
            </Box>
          ) : null}
          {listSectionVisited.help ? (
            <Box
              role="tabpanel"
              id={!onEditorRoute && listSection === 'help' ? LIST_TAB_PANEL_IDS.help.id : undefined}
              aria-labelledby={!onEditorRoute && listSection === 'help' ? LIST_TAB_PANEL_IDS.help.ariaLabelledBy : undefined}
              sx={{
                flex: 1,
                minHeight: 0,
                minWidth: 0,
                width: 1,
                display: !onEditorRoute && listSection === 'help' ? 'flex' : 'none',
                flexDirection: 'column',
              }}
              aria-hidden={onEditorRoute || listSection !== 'help'}
            >
              <ImportGuideScreen />
            </Box>
          ) : null}
        </Box>

        {showHeavyListTabPlaceholder ? (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 2,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              pointerEvents: 'auto',
            }}
          >
            <EncoreHeavyListTabPlaceholder />
          </Box>
        ) : null}

        {onSongRoute ? (
          <Box
            role="tabpanel"
            id="encore-panel-song"
            aria-labelledby="encore-tab-repertoire"
            sx={{ flex: 1, minHeight: 0, minWidth: 0, width: 1, display: 'flex', flexDirection: 'column' }}
          >
            <SongPage key={songPageKey} route={route} />
          </Box>
        ) : null}
        {onOriginalRoute ? (
          <Box
            role="tabpanel"
            id="encore-panel-original"
            aria-labelledby="encore-tab-originals"
            sx={{ flex: 1, minHeight: 0, minWidth: 0, width: 1, display: 'flex', flexDirection: 'column' }}
          >
            <OriginalSongPage
              key={originalPageKey}
              id={route.kind === 'original' ? route.id : ''}
              isNew={route.kind === 'originalNew'}
            />
          </Box>
        ) : null}
      </Box>
      <EncoreMediaPlaybackYoutubeFloat />
      <EncoreMediaPlaybackDriveVideoFloat />
      <EncoreMediaPlaybackBar />
      <SyncConflictReviewDialog
        open={Boolean(conflict?.conflict) && (conflictAnalysis?.bothEdited.length ?? 0) > 0}
        analysis={conflictAnalysis}
        onApply={(choices) => void resolveConflictWithChoices(choices)}
        onDismiss={dismissConflict}
      />
      <SyncConflictCoarseDialog
        open={Boolean(conflict?.conflict) && (conflictAnalysis?.bothEdited.length ?? 0) === 0}
        onUseDrive={() => void resolveConflictRemote()}
        onKeepLocal={() => void resolveConflictLocal()}
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
    </LabsKeyboardShortcutsHost>
  );
}
