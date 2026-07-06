import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import type { PopoverActions } from '@mui/material/Popover';
import Tooltip from '@mui/material/Tooltip';
import { useRef, useState, type MouseEvent, type ReactElement } from 'react';
import AnchoredPopover from '../../../../shared/components/AnchoredPopover';
import { playbackFloatingPanelSlotProps } from '../../../../shared/components/music/playbackFieldSelect';
import {
  popoverAnchorEl,
  usePopoverScrollAnchorSync,
} from '../../../../shared/hooks/usePopoverScrollAnchorSync';
import {
  countSectionProgressionLines,
  type ApplySectionProgressionResult,
} from '../../../../shared/music/chordPro/applySectionProgression';
import type { ChartLayout, SongSection } from '../../../../shared/music/chordPro/chordChartLayout';
import { loadChordPlaybackSettings } from '../../../../shared/music/chordPlaybackSettings';
import { sectionHasPlayableChartSteps } from '../../../../shared/music/chordPro/chartPlaybackSequence';
import { sectionUsesCustomPlayback } from '../../../../shared/music/resolveSectionPlaybackSettings';
import type { TimeSignature } from '../../../../shared/rhythm/types';
import { useOptionalOriginalsChartPlayback } from '../../context/useOriginalsChartPlayback';
import {
  createSectionPlaybackOverrideFromGlobal,
  type OriginalsSectionPlaybackOverride,
} from '../../sectionPlaybackOverrides';
import { OriginalsSectionPlaybackSettingsPanel } from './OriginalsSectionPlaybackSettingsPanel';

const PLAYBACK_SETTINGS_STORAGE_KEY = 'encore-originals-chord-playback-settings';

function readGlobalPlaybackSettings() {
  return loadChordPlaybackSettings(PLAYBACK_SETTINGS_STORAGE_KEY);
}

export type OriginalsPaintSectionHeadingProps = {
  section: SongSection;
  layout: ChartLayout;
  readOnly?: boolean;
  tempo: number;
  timeSignature: TimeSignature;
  sectionPlaybackOverride?: OriginalsSectionPlaybackOverride;
  onApply?: (sectionId: string, progression: string) => ApplySectionProgressionResult;
  onSectionPlaybackOverrideChange?: (
    sectionId: string,
    override: OriginalsSectionPlaybackOverride | null,
  ) => void;
};

/**
 * Section header on the Add Chords stage — separate menus for progression import and playback overrides.
 */
export function OriginalsPaintSectionHeading({
  section,
  layout,
  readOnly = false,
  tempo,
  timeSignature,
  sectionPlaybackOverride,
  onApply,
  onSectionPlaybackOverrideChange,
}: OriginalsPaintSectionHeadingProps): ReactElement {
  const progressionButtonRef = useRef<HTMLButtonElement | null>(null);
  const playbackButtonRef = useRef<HTMLButtonElement | null>(null);
  const playbackPopoverActionRef = useRef<PopoverActions | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [progressionOpen, setProgressionOpen] = useState(false);
  const [playbackOpen, setPlaybackOpen] = useState(false);
  const [progression, setProgression] = useState('');
  const [error, setError] = useState<string | null>(null);

  usePopoverScrollAnchorSync(playbackOpen, playbackButtonRef, playbackPopoverActionRef);

  const chartPlayback = useOptionalOriginalsChartPlayback();
  const label = section.header?.trim() || section.type;
  const canPlaySection = sectionHasPlayableChartSteps(layout, section.sectionId);
  const sectionIsPlaying =
    Boolean(chartPlayback?.playing && chartPlayback.playingSectionId === section.sectionId);

  const toggleSectionPlayback = () => {
    if (!chartPlayback || !canPlaySection) return;
    if (sectionIsPlaying) chartPlayback.stop();
    else chartPlayback.startSectionLoop(section.sectionId);
  };

  const sectionPlayButton = canPlaySection && chartPlayback ? (
    <Tooltip title={sectionIsPlaying ? `Stop looping ${label}` : `Loop ${label}`}>
      <IconButton
        type="button"
        size="small"
        aria-label={sectionIsPlaying ? `Stop looping ${label}` : `Loop ${label}`}
        className={[
          'encore-originals-paint-section-heading-action',
          'encore-originals-paint-section-playback-button',
          sectionIsPlaying ? 'is-playing' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={toggleSectionPlayback}
        sx={{ p: 0.25 }}
      >
        {sectionIsPlaying ? <StopIcon sx={{ fontSize: 17 }} /> : <PlayArrowIcon sx={{ fontSize: 17 }} />}
      </IconButton>
    </Tooltip>
  ) : null;

  const hasCustomPlayback = sectionUsesCustomPlayback(
    sectionPlaybackOverride ? { [section.sectionId]: sectionPlaybackOverride } : undefined,
    section.sectionId,
  );

  if (readOnly) {
    return (
      <div
        className={[
          'encore-originals-paint-section-heading',
          hasCustomPlayback ? 'has-custom-playback' : '',
          sectionIsPlaying ? 'is-section-looping' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span className="encore-originals-paint-section-heading-label">{label}</span>
        <div className="encore-originals-paint-section-heading-actions">
          {sectionPlayButton}
          {hasCustomPlayback ? (
            <span
              className="encore-originals-paint-section-playback-chip encore-originals-paint-section-playback-chip--read-only"
              aria-label={`Custom playback for ${label}`}
            >
              <TuneOutlinedIcon sx={{ fontSize: 13 }} aria-hidden />
              <span className="encore-originals-paint-section-playback-chip-label">Custom</span>
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  const progressionLineCount = countSectionProgressionLines(section);
  const lineWord = progressionLineCount === 1 ? 'line' : 'lines';

  const closeProgression = () => {
    setProgressionOpen(false);
    setError(null);
  };

  const closePlayback = () => {
    setPlaybackOpen(false);
  };

  const applyProgression = () => {
    if (!onApply) return;
    const result = onApply(section.sectionId, progression);
    if (!result.ok) {
      if (result.reason === 'empty') setError('Paste a chord progression first.');
      else if (result.reason === 'invalid') setError('Could not read those chord symbols.');
      else setError('Section not found.');
      return;
    }
    setProgression('');
    closeProgression();
  };

  const setCustomPlayback = (enabled: boolean) => {
    if (!onSectionPlaybackOverrideChange) return;
    if (!enabled) {
      onSectionPlaybackOverrideChange(section.sectionId, null);
      return;
    }
    onSectionPlaybackOverrideChange(
      section.sectionId,
      createSectionPlaybackOverrideFromGlobal(readGlobalPlaybackSettings()),
    );
  };

  const patchPlaybackOverride = (patch: Partial<OriginalsSectionPlaybackOverride>) => {
    if (!onSectionPlaybackOverrideChange) return;
    const base = hasCustomPlayback && sectionPlaybackOverride
      ? { ...sectionPlaybackOverride, customPlayback: true as const }
      : createSectionPlaybackOverrideFromGlobal(readGlobalPlaybackSettings());
    onSectionPlaybackOverrideChange(section.sectionId, { ...base, ...patch, customPlayback: true });
  };

  const globalPlaybackSettings = readGlobalPlaybackSettings();

  return (
    <>
      <div
        className={[
          'encore-originals-paint-section-heading',
          hasCustomPlayback ? 'has-custom-playback' : '',
          sectionIsPlaying ? 'is-section-looping' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span className="encore-originals-paint-section-heading-label">{label}</span>
        <div className="encore-originals-paint-section-heading-actions">
          {sectionPlayButton}
          <Tooltip title="Import chord progression">
            <IconButton
              ref={progressionButtonRef}
              type="button"
              size="small"
              aria-haspopup="dialog"
              aria-expanded={progressionOpen}
              aria-label={`Import chord progression for ${label}`}
              className={[
                'encore-originals-paint-section-heading-action',
                progressionOpen ? 'is-open' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => {
                setPlaybackOpen(false);
                setProgressionOpen((previous) => {
                  const next = !previous;
                  if (next) {
                    window.requestAnimationFrame(() => inputRef.current?.focus());
                  }
                  return next;
                });
              }}
              sx={{ p: 0.25 }}
            >
              <EditNoteOutlinedIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
          {hasCustomPlayback ? (
            <Tooltip title="Section playback">
              <button
                ref={playbackButtonRef}
                type="button"
                className={[
                  'encore-originals-paint-section-playback-chip',
                  playbackOpen ? 'is-open' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-haspopup="dialog"
                aria-expanded={playbackOpen}
                aria-label={`Custom playback for ${label}`}
                onClick={() => {
                  setProgressionOpen(false);
                  setPlaybackOpen((previous) => !previous);
                }}
              >
                <TuneOutlinedIcon sx={{ fontSize: 13 }} aria-hidden />
                <span className="encore-originals-paint-section-playback-chip-label">Custom</span>
              </button>
            </Tooltip>
          ) : (
            <Tooltip title="Section playback">
              <IconButton
                ref={playbackButtonRef}
                type="button"
                size="small"
                aria-haspopup="dialog"
                aria-expanded={playbackOpen}
                aria-label={`Section playback for ${label}`}
                className={[
                  'encore-originals-paint-section-heading-action',
                  playbackOpen ? 'is-open' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => {
                  setProgressionOpen(false);
                  setPlaybackOpen((previous) => !previous);
                }}
                sx={{ p: 0.25 }}
              >
                <TuneOutlinedIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
          )}
        </div>
      </div>

      <AnchoredPopover
        open={Boolean(progressionOpen && progressionButtonRef.current)}
        anchorEl={progressionButtonRef.current}
        onClose={closeProgression}
        placement="bottom-start"
        disableAutoFocus
        disableEnforceFocus
        disableRestoreFocus
        paperClassName="encore-repertoire-floating-menu encore-originals-section-progression-menu"
        slotProps={{
          paper: {
            onMouseDown: (event: MouseEvent<HTMLDivElement>) => event.stopPropagation(),
          },
        }}
      >
        <div className="encore-originals-section-progression-menu-inner">
          <header className="encore-originals-section-progression-menu-header">
            <h4 className="encore-originals-section-progression-menu-title">Import progression</h4>
            <p className="encore-originals-section-progression-menu-lede">
              Paste chords for {label}. One chord per line, looping across {progressionLineCount} {lineWord}.
            </p>
          </header>
          <label className="encore-originals-section-progression-menu-field">
            <span className="encore-originals-section-progression-menu-field-label">Progression</span>
            <input
              ref={inputRef}
              type="text"
              value={progression}
              placeholder="C → Am → F → G"
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => {
                setProgression(event.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  applyProgression();
                }
              }}
            />
          </label>
          {error ? (
            <p className="encore-originals-section-progression-menu-error" role="status">
              {error}
            </p>
          ) : null}
          <div className="encore-originals-section-progression-menu-actions">
            <button
              type="button"
              onClick={closeProgression}
              className="encore-originals-section-progression-cancel"
            >
              Close
            </button>
            <button
              type="button"
              disabled={!progression.trim()}
              onClick={applyProgression}
              className="encore-originals-section-progression-apply"
            >
              Apply progression
            </button>
          </div>
        </div>
      </AnchoredPopover>

      <Popover
        open={playbackOpen}
        onClose={closePlayback}
        action={playbackPopoverActionRef}
        anchorEl={popoverAnchorEl(playbackButtonRef)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        disableAutoFocus
        disableEnforceFocus
        disableRestoreFocus
        disableScrollLock
        marginThreshold={12}
        slotProps={{
          ...playbackFloatingPanelSlotProps({
            paperClassName: 'encore-originals-chords-playback-settings-menu encore-originals-section-playback-menu',
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
          paper: {
            onMouseDown: (event: MouseEvent<HTMLDivElement>) => event.stopPropagation(),
          },
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
          <OriginalsSectionPlaybackSettingsPanel
            sectionLabel={label}
            hasCustomPlayback={hasCustomPlayback}
            override={sectionPlaybackOverride}
            globalSettings={globalPlaybackSettings}
            tempo={tempo}
            timeSignature={timeSignature}
            onCustomPlaybackChange={setCustomPlayback}
            onOverrideChange={patchPlaybackOverride}
          />
        </Box>
      </Popover>
    </>
  );
}
