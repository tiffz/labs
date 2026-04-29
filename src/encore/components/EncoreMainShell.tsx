import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';
import BarChartIcon from '@mui/icons-material/BarChart';
import ShareIcon from '@mui/icons-material/Share';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import { alpha, useTheme } from '@mui/material/styles';
import { useState } from 'react';
import { useEncore } from '../context/EncoreContext';
import { ConflictResolutionDialog } from './ConflictResolutionDialog';
import { LibraryScreen } from './LibraryScreen';
import { SharePanel } from './SharePanel';
import { StatsScreen } from './StatsScreen';

type TabKey = 'library' | 'stats' | 'share';

export function EncoreMainShell(): React.ReactElement {
  const theme = useTheme();
  const [tab, setTab] = useState<TabKey>('library');
  const {
    displayName,
    signOut,
    spotifyLinked,
    disconnectSpotify,
    syncState,
    syncMessage,
    conflict,
    resolveConflictRemote,
    resolveConflictLocal,
    dismissConflict,
  } = useEncore();

  const syncLabel =
    syncState === 'syncing' ? 'Syncing…' : syncState === 'error' ? (syncMessage ?? 'Sync error') : 'Drive backup on';

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
          sx={{
            gap: 2,
            flexWrap: 'wrap',
            minHeight: { xs: 56, sm: 64 },
            py: { xs: 0.75, sm: 1 },
          }}
        >
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              variant="h5"
              component="h1"
              sx={{
                fontWeight: 800,
                letterSpacing: '-0.03em',
                lineHeight: 1.15,
                background: `linear-gradient(120deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Encore
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, letterSpacing: '0.04em' }}>
              Repertoire companion
            </Typography>
          </Box>
          <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ rowGap: 1 }}>
            {displayName && (
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                Hi, {displayName}
              </Typography>
            )}
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap sx={{ rowGap: 0.75 }}>
              <Chip
                size="small"
                variant="outlined"
                label={`Drive · ${syncLabel}`}
                color={syncState === 'error' ? 'error' : syncState === 'syncing' ? 'primary' : 'default'}
                sx={{
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  borderColor: alpha(theme.palette.text.secondary, 0.35),
                  maxWidth: { xs: '100%', sm: 240 },
                  '& .MuiChip-label': { px: 1.25 },
                }}
              />
              <Tooltip title="Stops Google Drive sync and YouTube playlist import for this account. Your songs stay on this device.">
                <Button color="inherit" size="small" onClick={signOut} sx={{ fontWeight: 600 }}>
                  Disconnect Google
                </Button>
              </Tooltip>
            </Stack>
            <Divider
              orientation="vertical"
              flexItem
              sx={{ display: { xs: 'none', md: 'block' }, height: 28, alignSelf: 'center' }}
            />
            <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ rowGap: 0.5, opacity: 0.92 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}
              >
                Spotify
              </Typography>
              <Chip
                size="small"
                variant="outlined"
                label={spotifyLinked ? 'Linked' : 'Not linked'}
                color={spotifyLinked ? 'success' : 'default'}
                sx={{
                  height: 22,
                  fontWeight: 600,
                  borderColor: alpha(theme.palette.text.secondary, 0.32),
                  '& .MuiChip-label': { px: 0.85, fontSize: '0.7rem' },
                }}
              />
              {spotifyLinked ? (
                <Tooltip title="Clears Spotify only. You stay signed in to Google.">
                  <Button color="inherit" size="small" onClick={disconnectSpotify} sx={{ fontWeight: 600, minWidth: 0 }}>
                    Disconnect Spotify
                  </Button>
                </Tooltip>
              ) : null}
            </Stack>
          </Stack>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        aria-label="Encore sections"
        sx={{
          display: { xs: 'none', md: 'block' },
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: alpha(theme.palette.background.paper, 0.88),
          backdropFilter: 'saturate(160%) blur(14px)',
          WebkitBackdropFilter: 'saturate(160%) blur(14px)',
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v as TabKey)}
          sx={{
            px: 2,
            minHeight: 44,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.9375rem',
              minHeight: 44,
              py: 1.25,
            },
          }}
        >
          <Tab label="Library" value="library" />
          <Tab label="Stats" value="stats" />
          <Tab label="Share" value="share" />
        </Tabs>
      </Box>
      <Box component="main" id="main" sx={{ flex: 1, minHeight: 0 }}>
        {tab === 'library' && <LibraryScreen />}
        {tab === 'stats' && <StatsScreen />}
        {tab === 'share' && <SharePanel />}
      </Box>
      <BottomNavigation
        value={tab}
        onChange={(_, v) => setTab(v as TabKey)}
        showLabels
        sx={{
          display: { xs: 'flex', md: 'none' },
          position: 'sticky',
          bottom: 0,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: alpha(theme.palette.background.paper, 0.95),
          backdropFilter: 'blur(12px)',
          '& .MuiBottomNavigationAction-label': {
            fontSize: '0.7rem',
            fontWeight: 600,
            letterSpacing: '0.06em',
          },
        }}
      >
        <BottomNavigationAction label="Library" value="library" icon={<LibraryMusicIcon />} />
        <BottomNavigationAction label="Stats" value="stats" icon={<BarChartIcon />} />
        <BottomNavigationAction label="Share" value="share" icon={<ShareIcon />} />
      </BottomNavigation>
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
