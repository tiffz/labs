import { useState } from 'react';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import CollectionsTab from './CollectionsTab';
import GestureAccountMenu from './GestureAccountMenu';
import GestureStatusBanner from './GestureStatusBanner';
import GestureWordmark from './GestureWordmark';
import PracticeTab from './PracticeTab';
import type { GestureHomeTab, SessionConfig } from '../types';
import { useGestureMediaWarmup } from '../hooks/useGestureMediaWarmup';

interface GestureAppShellProps {
  onStartSession: (config: SessionConfig) => void;
}

export default function GestureAppShell({ onStartSession }: GestureAppShellProps): React.ReactElement {
  const [tab, setTab] = useState<GestureHomeTab>('practice');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useGestureMediaWarmup();

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
        onChange={(_e, value: GestureHomeTab) => setTab(value)}
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
          onNeedCollections={() => setTab('collections')}
        />
      </div>
      <div hidden={tab !== 'collections'} aria-hidden={tab !== 'collections'}>
        <CollectionsTab
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
