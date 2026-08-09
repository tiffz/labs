import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RepeatIcon from '@mui/icons-material/Repeat';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import StopIcon from '@mui/icons-material/Stop';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import type { PopoverActions } from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import { useRef, useState, type ReactElement } from 'react';
import AnchoredPopover from '../../../shared/components/AnchoredPopover';
import { MetronomeSplitControl } from '../../../shared/audio/platform/metronome';
import { ChordPlaybackSettingsPanel } from '../../../shared/components/music/ChordPlaybackSettingsPanel';
import { CHART_CHORD_PLAYBACK_TIME_SIGNATURE } from '../../../shared/music/chordPlaybackSettings';
import { useChartChordPlayback, type UseChartChordPlaybackResult } from '../../../shared/hooks/useChartChordPlayback';
import {
  popoverAnchorEl,
  usePopoverScrollAnchorSync,
} from '../../../shared/hooks/usePopoverScrollAnchorSync';
import type { ChartLayout } from '../../../shared/music/chordPro/chordChartLayout';
import type { ChartPlaybackStep } from '../../../shared/music/chordPro/chartPlaybackSequence';
import type { SectionPlaybackOverride } from '../../../shared/music/resolveSectionPlaybackSettings';
import {
  PLAYBACK_FLOATING_PANEL_PAPER_SX,
  PLAYBACK_FLOATING_PANEL_SCROLL_BODY_SX,
  playbackFloatingPanelSlotProps,
} from '../../../shared/components/music/playbackFieldSelect';
import { useOptionalOriginalsChartPlayback } from '../context/useOriginalsChartPlayback';

const PLAYBACK_SETTINGS_STORAGE_KEY = 'encore-originals-chord-playback-settings';

export type OriginalChordPlaybackProps = {
  layout: ChartLayout;
  tempo: number;
  sectionPlaybackOverrides?: Record<string, SectionPlaybackOverride>;
  compact?: boolean;
  onActiveStepChange?: (step: ChartPlaybackStep | null) => void;
};

type OriginalChordPlaybackControlsProps = {
  playback: UseChartChordPlaybackResult;
  tempo: number;
  compact?: boolean;
};

function OriginalChordPlaybackControls({
  playback,
  tempo,
  compact = false,
}: OriginalChordPlaybackControlsProps): ReactElement {
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const settingsPopoverActionRef = useRef<PopoverActions>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  usePopoverScrollAnchorSync(settingsOpen, settingsButtonRef, settingsPopoverActionRef);
  const {
    playing,
    canPlay,
    playingSectionId,
    settings,
    updateSettings,
    metronomePreferences,
    setMetronomePreferences,
    start,
    stop,
    sampledPianoLoad,
    playbackBeatTime,
    playbackBeat,
  } = playback;

  if (!canPlay) return <></>;

  const togglePlayback = () => {
    if (playing) stop();
    else start();
  };

  const playLabel = playing
    ? playingSectionId
      ? 'Stop section playback'
      : 'Stop chord playback'
    : 'Play chord chart';

  const metronomeButton = (
    <MetronomeSplitControl
      enabled={settings.metronomeEnabled}
      onToggle={() => updateSettings({ metronomeEnabled: !settings.metronomeEnabled })}
      preferences={metronomePreferences}
      onPreferencesChange={setMetronomePreferences}
      timeSignature={CHART_CHORD_PLAYBACK_TIME_SIGNATURE}
      appearance="encore"
      ariaLabel="Metronome"
    />
  );

  const loopWholeSong = settings.loopWholeSong;
  const loopButton = (
    <Tooltip title="Loop song">
      <IconButton
        size="small"
        aria-label="Loop song"
        aria-pressed={loopWholeSong}
        onClick={() => updateSettings({ loopWholeSong: !loopWholeSong })}
        sx={{ p: 0.35, color: loopWholeSong ? 'primary.main' : 'text.secondary' }}
      >
        <RepeatIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );

  const settingsButton = (
    <Tooltip title="Playback settings">
      <IconButton
        ref={settingsButtonRef}
        id="encore-originals-chord-playback-settings-button"
        size="small"
        color="inherit"
        aria-controls={settingsOpen ? 'encore-originals-chord-playback-settings' : undefined}
        aria-haspopup="true"
        aria-label="Playback settings"
        aria-expanded={settingsOpen}
        onClick={() => setSettingsOpen((open) => !open)}
        sx={{ color: 'text.secondary' }}
      >
        <SettingsOutlinedIcon sx={{ fontSize: 18 }} />
      </IconButton>
    </Tooltip>
  );

  const settingsPopover = (
    <AnchoredPopover
      id="encore-originals-chord-playback-settings"
      action={settingsPopoverActionRef}
      open={settingsOpen}
      onClose={() => setSettingsOpen(false)}
      anchorEl={popoverAnchorEl(settingsButtonRef)}
      placement="bottom-start"
      disableAutoFocus
      disableEnforceFocus
      disableRestoreFocus
      disableScrollLock
      marginThreshold={12}
      slotProps={{
        ...playbackFloatingPanelSlotProps({
          paperClassName: 'encore-originals-chords-playback-settings-menu',
          paperSx: PLAYBACK_FLOATING_PANEL_PAPER_SX,
        }),
      }}
    >
      <Box sx={PLAYBACK_FLOATING_PANEL_SCROLL_BODY_SX}>
        <ChordPlaybackSettingsPanel
          settings={settings}
          onChange={updateSettings}
          sampledPianoLoad={sampledPianoLoad}
          appearance="encore"
          tempo={tempo}
          playing={playing}
          playbackBeatTime={playbackBeatTime}
          playbackBeat={playbackBeat}
        />
      </Box>
    </AnchoredPopover>
  );

  if (compact) {
    return (
      <>
        <Stack direction="row" spacing={0.5} className="encore-originals-transport" sx={{
          alignItems: "center"
        }}>
          <Tooltip title={playLabel}>
            <IconButton
              size="small"
              aria-label={playLabel}
              onClick={togglePlayback}
            >
              {playing ? <StopIcon sx={{ fontSize: 18 }} /> : <PlayArrowIcon sx={{ fontSize: 18 }} />}
            </IconButton>
          </Tooltip>
          {loopButton}
          {metronomeButton}
          {settingsButton}
        </Stack>
        {settingsPopover}
      </>
    );
  }

  return (
    <>
      <Stack direction="row" spacing={0.5} className="encore-originals-transport" sx={{
        alignItems: "center"
      }}>
        <Button
          size="small"
          variant="text"
          startIcon={playing ? <StopIcon sx={{ fontSize: 18 }} /> : <PlayArrowIcon sx={{ fontSize: 18 }} />}
          onClick={togglePlayback}
          sx={{ minWidth: 0 }}
        >
          {playing ? 'Stop' : 'Play'}
        </Button>
        {loopButton}
        {metronomeButton}
        {settingsButton}
      </Stack>
      {settingsPopover}
    </>
  );
}

function OriginalChordPlaybackWithHook({
  layout,
  tempo,
  sectionPlaybackOverrides,
  compact = false,
  onActiveStepChange,
}: OriginalChordPlaybackProps): ReactElement {
  const playback = useChartChordPlayback({
    layout,
    tempo,
    storageKey: PLAYBACK_SETTINGS_STORAGE_KEY,
    sectionPlaybackOverrides,
    onActiveStepChange,
  });

  return <OriginalChordPlaybackControls playback={playback} tempo={tempo} compact={compact} />;
}

export function OriginalChordPlayback(props: OriginalChordPlaybackProps): ReactElement {
  const contextPlayback = useOptionalOriginalsChartPlayback();
  if (contextPlayback) {
    return (
      <OriginalChordPlaybackControls
        playback={contextPlayback}
        tempo={props.tempo}
        compact={props.compact}
      />
    );
  }
  return <OriginalChordPlaybackWithHook {...props} />;
}
