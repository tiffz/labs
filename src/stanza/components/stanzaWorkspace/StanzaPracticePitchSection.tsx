import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import AppTooltip from '../../../shared/components/AppTooltip';
import KeyInput from '../../../shared/components/music/KeyInput';
import { NumericStepperField } from '../../../shared/components/music/NumericStepperField';
import type { SongKey } from '../../../shared/music/songKeyFormat';
import type { StanzaSong } from '../../db/stanzaDb';
import StanzaPlaybackTransformChip from '../StanzaPlaybackTransformChip';

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
}: StanzaPracticePitchSectionProps) {
  return (
    <Box className="stanza-rail-section stanza-rail-section--pitch">
      <Typography component="h3" className="stanza-rail-section-title" sx={{ mb: 0.5 }}>
        Pitch
      </Typography>
      <Box className="stanza-rail-pitch-fields">
        <Box className="stanza-original-key-block">
          <Typography component="label" className="stanza-rail-field-label">
            Original key
          </Typography>
          <KeyInput
            className="shared-key-input"
            value={selected.localOriginalKey}
            placeholder="Unknown"
            modeFormat="long"
            dropdownClassName="stanza-key-dropdown"
            onChange={(next) =>
              onOriginalKeyChange(next.trim() ? (next as SongKey) : undefined)
            }
            trailingActions={
              <AppTooltip title={stanzaAnalysisDisabledReason ?? 'Detect key from the uploaded recording'}>
                <span>
                  <IconButton
                    type="button"
                    size="small"
                    className="stanza-original-key-detect-btn stanza-rail-compact-btn"
                    disabled={!stanzaCanAnalyze || keyDetectBusy}
                    aria-label="Detect original key"
                    onClick={() => void onDetectOriginalKey()}
                    sx={{ p: 0.35 }}
                  >
                    {keyDetectBusy ? (
                      <CircularProgress size={16} sx={{ color: 'inherit' }} />
                    ) : (
                      <AutoFixHighIcon sx={{ fontSize: 18 }} />
                    )}
                  </IconButton>
                </span>
              </AppTooltip>
            }
          />
          {keyDetectError ? (
            <Alert severity="warning" onClose={onDismissKeyDetectError} sx={{ mt: 0.75, py: 0, '& .MuiAlert-message': { py: 0.5 } }}>
              {keyDetectError}
            </Alert>
          ) : null}
        </Box>
        <Box className="stanza-key-shift-block">
          <Typography component="label" className="stanza-rail-field-label">
            Key shift
          </Typography>
          <Box className="stanza-key-shift-row">
            <Box className="shared-bpm-input stanza-key-shift-numeric">
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
                          className="stanza-key-shift-reset"
                          onClick={onResetTranspose}
                          sx={{ p: 0.35 }}
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
                sx={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                }}
                aria-live="polite"
                aria-busy="true"
                aria-label="Rebuilding pitch-shifted audio"
              >
                <AppTooltip title="Rebuilding pitch-shifted audio…">
                  <span>
                    <CircularProgress size={20} thickness={4.5} sx={{ color: 'var(--stanza-rose, #e848a0)' }} />
                  </span>
                </AppTooltip>
              </Box>
            ) : null}
            {showPlaybackKeyChip ? (
              <StanzaPlaybackTransformChip
                label={playbackKeyChipLabel}
                shifted={transposeDraftSemitones !== 0}
                direction={transposeDraftSemitones > 0 ? 'up' : 'down'}
              />
            ) : null}
          </Box>
          {transposeDecodeError ? (
            <Box aria-live="polite" sx={{ mt: 0.75 }}>
              <Alert severity="warning" onClose={onDismissTransposeDecodeError} sx={{ py: 0, '& .MuiAlert-message': { py: 0.5 } }}>
                {transposeDecodeError}
              </Alert>
            </Box>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}
