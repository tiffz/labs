import { lazy, Suspense, useMemo, useRef, useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import SkipToMain from '../shared/components/SkipToMain';
import type { ExportSourceAdapter } from '../shared/music/exportTypes';
import { createAppAnalytics } from '../shared/utils/analytics';
import { MidiProvider } from './store';
import { useMidi } from './useMidi';
import { MetronomeRail } from './components/MetronomeRail';
import { ModeSwitch } from './components/ModeSwitch';
import { MidiInputSources } from './components/MidiInputSources';

const ScratchpadView = lazy(() =>
  import('./components/ScratchpadView').then((m) => ({ default: m.ScratchpadView })),
);
const ComposeView = lazy(() =>
  import('./components/ComposeView').then((m) => ({ default: m.ComposeView })),
);
const GuideView = lazy(() =>
  import('./components/GuideView').then((m) => ({ default: m.GuideView })),
);
const SharedExportPopover = lazy(() => import('../shared/components/music/SharedExportPopover'));

const analytics = createAppAnalytics('midi');

function MidiAppInner() {
  const { state } = useMidi();
  const exportAnchorRef = useRef<HTMLButtonElement>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportAnchorEl, setExportAnchorEl] = useState<HTMLElement | null>(null);
  const [exportAdapter, setExportAdapter] = useState<ExportSourceAdapter | null>(null);

  useEffect(() => {
    if (!exportOpen) return;
    let cancelled = false;
    void import('./export/createMidiExportAdapter').then(({ createMidiExportAdapter }) => {
      if (cancelled) return;
      setExportAdapter(createMidiExportAdapter(() => state));
    });
    return () => {
      cancelled = true;
    };
  }, [exportOpen, state]);

  const modeFallback = useMemo(
    () => (
      <Box className="midi-playground-sheet midi-playground-sheet--plain" aria-busy="true">
        Loading…
      </Box>
    ),
    [],
  );

  return (
    <Box className="midi-shell">
      <header className="midi-header" role="banner">
        <Box className="midi-header-brand">
          <Typography component="h1" className="midi-title">
            Midi Scratchpad
          </Typography>
          <Typography variant="body2" className="midi-tagline" sx={{
            color: "text.secondary"
          }}>
            Play along, capture a loop, tweak how it looks.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} className="midi-header-actions" sx={{
          alignItems: "center"
        }}>
          <MidiInputSources />
          <ModeSwitch />
          <Button
            ref={exportAnchorRef}
            size="small"
            variant="outlined"
            className="midi-export-btn"
            disabled={!state.capturedLoop}
            onClick={() => {
              setExportAnchorEl(exportAnchorRef.current);
              analytics.trackEvent('export_open');
              setExportOpen(true);
            }}
          >
            Export
          </Button>
          {exportOpen && exportAdapter && (
            <Suspense fallback={null}>
              <SharedExportPopover
                open={exportOpen}
                anchorEl={exportAnchorEl}
                onClose={() => setExportOpen(false)}
                adapter={exportAdapter}
                persistKey="midi-scratchpad"
              />
            </Suspense>
          )}
        </Stack>
      </header>
      <Box className="midi-workspace" component="section" aria-label="Main workspace">
        <Box className="midi-toolbar">
          <MetronomeRail />
        </Box>

        <Suspense fallback={modeFallback}>
          {state.mode === 'scratchpad' && <ScratchpadView />}
          {state.mode === 'compose' && (
            <Box className="midi-playground-sheet midi-playground-sheet--plain">
              <ComposeView />
            </Box>
          )}
          {state.mode === 'guide' && (
            <Box className="midi-playground-sheet midi-playground-sheet--plain">
              <GuideView />
            </Box>
          )}
        </Suspense>
      </Box>
    </Box>
  );
}

export default function App() {
  return (
    <MidiProvider>
      <SkipToMain />
      <main id="main" className="midi-root">
        <MidiAppInner />
      </main>
    </MidiProvider>
  );
}
