import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import CollectionsTab from './CollectionsTab';
import GestureAccountMenu from './GestureAccountMenu';
import GestureStatusBanner from './GestureStatusBanner';
import GestureWordmark from './GestureWordmark';
import PracticeTab from './PracticeTab';
import type { SessionConfig } from '../types';
import {
  gestureRouteToTab,
  navigateGesture,
  parseGestureAppHash,
  type GestureHomeTab,
} from '../routes/gestureAppHash';
import { useGestureMediaWarmup } from '../hooks/useGestureMediaWarmup';
import { readGesturePracticeSessionConfig } from '../practice/gesturePracticeConfigStorage';

interface GestureAppShellProps {
  onStartSession: (config: SessionConfig) => void;
}

export default function GestureAppShell({ onStartSession }: GestureAppShellProps): React.ReactElement {
  const [tab, setTab] = useState<GestureHomeTab>(() =>
    gestureRouteToTab(parseGestureAppHash(window.location.hash)),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTagFilters, setActiveTagFilters] = useState<string[]>(
    () => readGesturePracticeSessionConfig()?.activeTagFilters ?? [],
  );

  useGestureMediaWarmup();

  useEffect(() => {
    const syncFromHash = () => {
      setTab(gestureRouteToTab(parseGestureAppHash(window.location.hash)));
    };
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  const handleTabChange = useCallback((_e: unknown, value: GestureHomeTab) => {
    navigateGesture({ kind: value });
    setTab(value);
  }, []);

  return (
    <div className="gesture-shell">
      <header className="gesture-header">
        <Box>
          <GestureWordmark />
          <Typography className="gesture-lede">
            Timed reference drawing from your own photo collections.
          </Typography>
        </Box>
        <GestureAccountMenu />
      </header>

      <Tabs
        value={tab}
        onChange={handleTabChange}
        className="gesture-tabs"
        aria-label="Main sections"
      >
        <Tab label="Practice" value="practice" />
        <Tab label="Collections" value="collections" />
      </Tabs>

      {message ? (
        <GestureStatusBanner variant="success" onDismiss={() => setMessage(null)}>
          {message}
        </GestureStatusBanner>
      ) : null}
      {error ? (
        <GestureStatusBanner variant="error" onDismiss={() => setError(null)}>
          {error}
        </GestureStatusBanner>
      ) : null}

      <div hidden={tab !== 'practice'} aria-hidden={tab !== 'practice'}>
        <PracticeTab
          onStart={onStartSession}
          onNeedCollections={() => navigateGesture({ kind: 'collections' })}
          activeTagFilters={activeTagFilters}
          onActiveTagFiltersChange={setActiveTagFilters}
          previewFetchEnabled={tab === 'practice'}
        />
      </div>
      <div hidden={tab !== 'collections'} aria-hidden={tab !== 'collections'}>
        <CollectionsTab
          activeTagFilters={activeTagFilters}
          onActiveTagFiltersChange={setActiveTagFilters}
          previewFetchEnabled={tab === 'collections'}
          onMessage={(msg) => {
            setError(null);
            setMessage(msg);
          }}
          onError={(msg) => {
            setMessage(null);
            setError(msg);
          }}
        />
      </div>
    </div>
  );
}
