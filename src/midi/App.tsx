import { useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import SkipToMain from '../shared/components/SkipToMain';
import SharedExportPopover from '../shared/components/music/SharedExportPopover';
import { createAppAnalytics } from '../shared/utils/analytics';
import { MidiProvider } from './store';
import { useMidi } from './useMidi';
import { MetronomeRail } from './components/MetronomeRail';
import { ModeSwitch } from './components/ModeSwitch';
import { MidiInputSources } from './components/MidiInputSources';
import { ScratchpadView } from './components/ScratchpadView';
import { ComposeView } from './components/ComposeView';
import { GuideView } from './components/GuideView';
import { createMidiExportAdapter } from './export/createMidiExportAdapter';

const analytics = createAppAnalytics('midi');

function MidiAppInner() {
  const { state } = useMidi();
  const exportAnchorRef = useRef<HTMLButtonElement>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportAnchorEl, setExportAnchorEl] = useState<HTMLElement | null>(null);

  const exportAdapter = useMemo(
    () => createMidiExportAdapter(() => state),
    [state],
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
          <SharedExportPopover
            open={exportOpen}
            anchorEl={exportAnchorEl}
            onClose={() => setExportOpen(false)}
            adapter={exportAdapter}
            persistKey="midi-scratchpad"
          />
        </Stack>
      </header>
      <Box className="midi-workspace" component="section" aria-label="Main workspace">
        <Box className="midi-toolbar">
          <MetronomeRail />
        </Box>

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
