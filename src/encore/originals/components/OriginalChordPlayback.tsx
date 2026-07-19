import PlayArrowIcon from '@mui/icons-material/PlayArrow';
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
import { ChordPlaybackSettingsPanel } from '../../../shared/components/music/ChordPlaybackSettingsPanel';
import { useChartChordPlayback, type UseChartChordPlaybackResult } from '../../../shared/hooks/useChartChordPlayback';
import {
  popoverAnchorEl,
  usePopoverScrollAnchorSync,
} from '../../../shared/hooks/usePopoverScrollAnchorSync';
import type { ChartLayout } from '../../../shared/music/chordPro/chordChartLayout';
import type { ChartPlaybackStep } from '../../../shared/music/chordPro/chartPlaybackSequence';
import type { SectionPlaybackOverride } from '../../../shared/music/resolveSectionPlaybackSettings';
import { playbackFloatingPanelSlotProps } from '../../../shared/components/music/playbackFieldSelect';
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
        sx={{ p: 0.35, color: 'text.secondary' }}
      >
        <SettingsOutlinedIcon sx={{ fontSize: 20 }} />
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
          paperSx: {
            width: 420,
            maxWidth: 'min(420px, calc(100vw - 24px))',
            maxHeight:
              'calc(100dvh - 16px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))',
            mt: 0.75,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRadius: 3,
          },
        }),
      }}
    >
      <Box
        sx={{
          overflowY: 'auto',
          overflowX: 'hidden',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
        }}
      >
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
        <Stack direction="row" spacing={0.15} sx={{
          alignItems: "center"
        }}>
          <Tooltip title={playLabel}>
            <IconButton
              size="small"
              aria-label={playLabel}
              onClick={togglePlayback}
              sx={{ p: 0.35 }}
            >
              {playing ? <StopIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          {settingsButton}
        </Stack>
        {settingsPopover}
      </>
    );
  }

  return (
    <>
      <Stack direction="row" spacing={0.15} sx={{
        alignItems: "center"
      }}>
        <Button
          size="small"
          variant="text"
          startIcon={playing ? <StopIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
          onClick={togglePlayback}
          sx={{ minWidth: 0, px: 1 }}
        >
          {playing ? 'Stop' : 'Play'}
        </Button>
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
