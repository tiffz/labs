import CloseIcon from '@mui/icons-material/Close';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import RepeatIcon from '@mui/icons-material/Repeat';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import type { ReactElement } from 'react';
import AppTooltip from '../../shared/components/AppTooltip';
import PlaybackSpeedControl from '../../shared/components/music/PlaybackSpeedControl';
import { NumericStepperField } from '../../shared/components/music/NumericStepperField';
import {
  isYoutubeEmbedBlockedError,
  youtubeEmbedBlockedBarHint,
  youtubePlaybackBarTitle,
} from '../../shared/youtube/describeYoutubePlayerError';
import { useEncoreMediaPlayback } from '../context/encoreMediaPlaybackContextStore';
import { YouTubeBrandIcon } from './EncoreBrandIcon';
import {
  encoreMediaPlaybackSupportsLoop,
  encoreMediaPlaybackSupportsSpeed,
  encoreMediaPlaybackSupportsTranspose,
} from '../media/encorePlayableMedia';
import { EncoreMediaPlaybackTransport } from './EncoreMediaPlaybackTransport';

function ToolsChipDivider(): ReactElement {
  return <span className="encore-media-playback-chip-divider" aria-hidden />;
}

export function EncoreMediaPlaybackBar(): ReactElement | null {
  const theme = useTheme();
  const {
    target,
    phase,
    errorMessage,
    transposeSemitones,
    loopEnabled,
    playbackRate,
    setPlaybackRate,
    setTransposeSemitones,
    setLoopEnabled,
    stopPlayback,
    youtubeVideoId,
    youtubePlayerErrorCode,
  } = useEncoreMediaPlayback();

  if (!target) return null;

  const clampTranspose = (next: number) => Math.max(-12, Math.min(12, next));
  const isYoutube = target.kind === 'youtube';
  const isDriveVideo = target.kind === 'drive-video';

  const youtubeEmbedBlocked =
    isYoutube &&
    phase === 'error' &&
    youtubePlayerErrorCode != null &&
    isYoutubeEmbedBlockedError(youtubePlayerErrorCode);

  const title = isYoutube ? youtubePlaybackBarTitle(target.title) : target.title.trim() || 'Untitled';
  const subtitle =
    phase === 'loading'
      ? 'Loading…'
      : phase === 'error'
        ? youtubeEmbedBlocked
          ? youtubeEmbedBlockedBarHint()
          : (errorMessage ?? 'Could not play')
        : target.subtitle?.trim() || '';

  const showTransport =
    phase === 'playing' &&
    (target.kind === 'drive-audio' || target.kind === 'drive-video' || isYoutube);
  const speedSupported = encoreMediaPlaybackSupportsSpeed(target.kind);
  const transposeSupported = encoreMediaPlaybackSupportsTranspose(target.kind);
  const loopSupported = encoreMediaPlaybackSupportsLoop(target.kind);
  const showTools = (speedSupported || transposeSupported || loopSupported) && phase === 'playing';
  return (
    <Box
      className={`encore-media-playback-bar encore-originals-playback-bar encore-originals-no-print${
        isYoutube ? ' encore-media-playback-bar--youtube' : ''
      }${isDriveVideo ? ' encore-media-playback-bar--video' : ''}${youtubeEmbedBlocked ? ' encore-media-playback-bar--youtube-blocked' : ''}`}
    >
      <Box className="encore-media-playback-track">
        <Box
          className="encore-media-playback-track-icon"
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            color: 'primary.main',
          }}
          aria-hidden
        >
          {phase === 'loading' ? (
            <CircularProgress size={18} color="inherit" />
          ) : youtubeEmbedBlocked ? (
            <YouTubeBrandIcon sx={{ fontSize: 18 }} />
          ) : (
            <GraphicEqIcon sx={{ fontSize: 18 }} />
          )}
        </Box>
        <Box className="encore-media-playback-track-copy">
          <Typography variant="body2" noWrap className="encore-media-playback-track-title">
            {title}
          </Typography>
          <Typography
            variant="caption"
            noWrap
            className={`encore-media-playback-track-subtitle${
              phase === 'error' && !youtubeEmbedBlocked
                ? ' encore-media-playback-track-subtitle--error'
                : ''
            }`}
          >
            {subtitle}
          </Typography>
        </Box>
      </Box>

      {showTransport ? (
        <>
          <Box className="encore-media-playback-divider" aria-hidden />
          <EncoreMediaPlaybackTransport />
        </>
      ) : null}

      {showTools ? (
        <>
          <Box className="encore-media-playback-divider" aria-hidden />
          <Box className="encore-media-playback-tools-chip" role="group" aria-label="Playback adjustments">
            {speedSupported ? (
              <PlaybackSpeedControl
                value={playbackRate}
                onChange={setPlaybackRate}
                variant="compact"
                className="encore-media-playback-speed shared-bpm-input"
                dropdownClassName="encore-media-playback-speed-dropdown"
              />
            ) : null}
            {transposeSupported ? (
              <>
                {speedSupported ? <ToolsChipDivider /> : null}
                <AppTooltip title="Key shift in semitones (−12 to +12)">
                  <Box className="shared-bpm-input encore-media-playback-transpose">
                    <Box
                      className="shared-bpm-shell is-idle"
                      role="group"
                      aria-label="Key shift in semitones"
                    >
                      <NumericStepperField
                        value={transposeSemitones}
                        inputValue={`${transposeSemitones >= 0 ? '+' : ''}${transposeSemitones}`}
                        onInputChange={() => undefined}
                        onBump={(delta) => setTransposeSemitones(clampTranspose(transposeSemitones + delta))}
                        min={-12}
                        max={12}
                        step={1}
                        incrementAriaLabel="Transpose up one semitone"
                        decrementAriaLabel="Transpose down one semitone"
                        inputAriaLabel="Key shift in semitones"
                        stepperAriaLabel="Key shift stepper"
                      />
                    </Box>
                  </Box>
                </AppTooltip>
              </>
            ) : null}
            {loopSupported ? (
              <>
                {speedSupported || transposeSupported ? <ToolsChipDivider /> : null}
                <AppTooltip title={loopEnabled ? 'Loop on' : 'Loop off'}>
                  <span>
                    <IconButton
                      size="small"
                      className={`encore-media-playback-chip-btn${
                        loopEnabled ? ' encore-media-playback-chip-btn--active' : ''
                      }`}
                      aria-label={loopEnabled ? 'Disable loop' : 'Enable loop'}
                      aria-pressed={loopEnabled}
                      onClick={() => setLoopEnabled(!loopEnabled)}
                    >
                      <RepeatIcon fontSize="small" />
                    </IconButton>
                  </span>
                </AppTooltip>
              </>
            ) : null}
          </Box>
        </>
      ) : null}

      <Box className="encore-media-playback-trailing">
        {youtubeEmbedBlocked && youtubeVideoId ? (
          <Button
            component="a"
            href={`https://www.youtube.com/watch?v=${encodeURIComponent(youtubeVideoId)}`}
            target="_blank"
            rel="noopener noreferrer"
            size="small"
            className="encore-media-playback-youtube-open-btn"
            title={errorMessage ?? undefined}
          >
            Open on YouTube
          </Button>
        ) : null}
        <AppTooltip title="Stop">
          <IconButton
            size="small"
            className="encore-media-playback-close-btn"
            aria-label="Stop playback"
            onClick={stopPlayback}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </AppTooltip>
      </Box>
    </Box>
  );
}
