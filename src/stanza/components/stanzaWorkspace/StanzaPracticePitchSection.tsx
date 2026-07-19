import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import AppTooltip from '../../../shared/components/AppTooltip';
import KeyInput from '../../../shared/components/music/KeyInput';
import { NumericStepperField } from '../../../shared/components/music/NumericStepperField';
import type { SongKey } from '../../../shared/music/songKeyFormat';
import type { StanzaSong } from '../../db/stanzaDb';
import StanzaPlaybackTransformChip from '../StanzaPlaybackTransformChip';
import StanzaRailField from './StanzaRailField';
import StanzaRailGridRow from './StanzaRailGridRow';

export interface StanzaPracticePitchSectionProps {
  selected: StanzaSong;
  stanzaCanAnalyze: boolean;
  stanzaAnalysisDisabledReason: string | null;
  keyDetectBusy: boolean;
  keyDetectError: string | null;
  onDismissKeyDetectError: () => void;
  onDetectOriginalKey: () => void | Promise<void>;
  onOriginalKeyChange: (key: SongKey | undefined) => void;
  transposeDraftSemitones: number;
  transposeInputStr: string;
  transposeStepperEditing: boolean;
  transposeDecodeBusy: boolean;
  transposeDecodeError: string | null;
  onDismissTransposeDecodeError: () => void;
  onTransposeInputChange: (raw: string) => void;
  onTransposeInputFocus: () => void;
  onTransposeInputBlur: () => void;
  onTransposeInputKeyDown: (key: string) => void;
  onTransposeBump: (delta: number) => void;
  onResetTranspose: () => void;
  showPlaybackKeyChip: boolean;
  playbackKeyChipLabel: string;
  playbackKeyChipShortLabel: string;
}

export default function StanzaPracticePitchSection({
  selected,
  stanzaCanAnalyze,
  stanzaAnalysisDisabledReason,
  keyDetectBusy,
  keyDetectError,
  onDismissKeyDetectError,
  onDetectOriginalKey,
  onOriginalKeyChange,
  transposeDraftSemitones,
  transposeInputStr,
  transposeStepperEditing,
  transposeDecodeBusy,
  transposeDecodeError,
  onDismissTransposeDecodeError,
  onTransposeInputChange,
  onTransposeInputFocus,
  onTransposeInputBlur,
  onTransposeInputKeyDown,
  onTransposeBump,
  onResetTranspose,
  showPlaybackKeyChip,
  playbackKeyChipLabel,
  playbackKeyChipShortLabel,
}: StanzaPracticePitchSectionProps) {
  return (
    <Box className="stanza-rail-section stanza-rail-section--pitch" aria-label="Pitch">
      <StanzaRailGridRow variant="pitch">
        <StanzaRailField
          label="Original key"
          labelVariant="inline"
          className="stanza-rail-pitch-field stanza-rail-pitch-field--original"
        >
          <KeyInput
            appearance="stanza"
            value={selected.localOriginalKey}
            placeholder="Unknown"
            modeFormat="short"
            dropdownClassName="stanza-key-dropdown"
            onChange={(next) =>
              onOriginalKeyChange(next.trim() ? (next as SongKey) : undefined)
            }
            trailingActions={
              <AppTooltip title={stanzaAnalysisDisabledReason ?? 'Detect key from the uploaded recording'}>
                <span>
                  <button
                    type="button"
                    className="shared-key-inline-action stanza-original-key-detect-btn"
                    disabled={!stanzaCanAnalyze || keyDetectBusy}
                    aria-label="Detect original key"
                    onClick={() => void onDetectOriginalKey()}
                  >
                    {keyDetectBusy ? (
                      <CircularProgress size={14} sx={{ color: 'inherit' }} />
                    ) : (
                      <AutoFixHighIcon sx={{ fontSize: 16 }} aria-hidden />
                    )}
                  </button>
                </span>
              </AppTooltip>
            }
          />
        </StanzaRailField>

        <StanzaRailField
          label="Shift"
          labelVariant="inline"
          className="stanza-rail-pitch-field stanza-rail-pitch-field--shift"
        >
          <Box className="stanza-rail-pitch-shift-controls">
            <Box className="shared-bpm-input shared-bpm-input--stanza stanza-key-shift-numeric">
              <AppTooltip title="Raise or lower pitch in half-steps (−12 to +12). Applies to the main file and any mix layers. Playback re-decodes shortly after you stop adjusting.">
                <Box
                  className={`shared-bpm-shell ${transposeStepperEditing ? 'is-editing' : 'is-idle'}`}
                  role="group"
                  aria-label="Pitch shift in semitones"
                  aria-busy={transposeDecodeBusy}
                >
                  <NumericStepperField
                    value={transposeDraftSemitones}
                    inputValue={transposeInputStr}
                    onInputChange={(e) => onTransposeInputChange(e.target.value)}
                    onInputFocus={onTransposeInputFocus}
                    onInputBlur={onTransposeInputBlur}
                    onInputKeyDown={(e) => {
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        onTransposeInputKeyDown(e.key);
                      }
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        onTransposeInputKeyDown(e.key);
                      }
                    }}
                    min={-12}
                    max={12}
                    step={1}
                    onBump={onTransposeBump}
                    incrementAriaLabel="Increase pitch by one semitone"
                    decrementAriaLabel="Decrease pitch by one semitone"
                    inputAriaLabel="Semitones relative to the recording"
                    stepperAriaLabel="Semitone stepper"
                    disabled={transposeDecodeBusy}
                  />
                  <div className="shared-bpm-trailing-actions">
                    <AppTooltip title="Reset to original key (0 semitones)">
                      <span>
                        <IconButton
                          type="button"
                          size="small"
                          aria-label="Reset pitch shift"
                          disabled={transposeDecodeBusy || transposeDraftSemitones === 0}
                          className="stanza-key-shift-reset stanza-rail-icon-btn"
                          onClick={onResetTranspose}
                        >
                          <RestartAltOutlinedIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </span>
                    </AppTooltip>
                  </div>
                </Box>
              </AppTooltip>
            </Box>
            {transposeDecodeBusy ? (
              <Box
                className="stanza-key-shift-busy-spinner"
                aria-live="polite"
                aria-busy="true"
                aria-label="Rebuilding pitch-shifted audio"
              >
                <AppTooltip title="Rebuilding pitch-shifted audio…">
                  <span>
                    <CircularProgress size={18} thickness={4.5} sx={{ color: 'var(--stanza-rose, #e848a0)' }} />
                  </span>
                </AppTooltip>
              </Box>
            ) : null}
            {showPlaybackKeyChip ? (
              <AppTooltip title={playbackKeyChipLabel}>
                <span className="stanza-rail-pitch-playback-chip">
                  <StanzaPlaybackTransformChip
                    label={playbackKeyChipShortLabel}
                    shifted={transposeDraftSemitones !== 0}
                    direction={transposeDraftSemitones > 0 ? 'up' : 'down'}
                    compact
                  />
                </span>
              </AppTooltip>
            ) : null}
          </Box>
        </StanzaRailField>
      </StanzaRailGridRow>

      {keyDetectError ? (
        <Alert severity="warning" onClose={onDismissKeyDetectError} className="stanza-rail-inline-alert">
          {keyDetectError}
        </Alert>
      ) : null}
      {transposeDecodeError ? (
        <Box aria-live="polite" className="stanza-rail-inline-alert-wrap">
          <Alert severity="warning" onClose={onDismissTransposeDecodeError} className="stanza-rail-inline-alert">
            {transposeDecodeError}
          </Alert>
        </Box>
      ) : null}
    </Box>
  );
}
