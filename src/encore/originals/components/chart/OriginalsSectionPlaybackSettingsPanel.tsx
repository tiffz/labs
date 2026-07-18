import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState, type ReactElement } from 'react';
import ChordStyleInput from '../../../../shared/components/music/ChordStyleInput';
import DrumAccompaniment from '../../../../shared/components/music/DrumAccompaniment';
import { getInlineDrumUxProps } from '../../../../shared/components/music/inlineDrumUxDefaults';
import type { NotationStyle } from '../../../../shared/notation/DrumNotationMini';
import {
  CHART_CHORD_PLAYBACK_TIME_SIGNATURE,
  type ChordPlaybackSettings,
} from '../../../../shared/music/chordPlaybackSettings';
import { CHORD_STYLE_OPTIONS, type ChordStyleId } from '../../../../shared/music/chordStyleOptions';
import type { TimeSignature } from '../../../../shared/rhythm/types';
import type { OriginalsSectionPlaybackOverride } from '../../sectionPlaybackOverrides';
import '../../../../shared/components/music/chordPlaybackSettingsPanel.css';

const ENCORE_INLINE_DRUM_NOTATION_STYLE = {
  inkColor: '#1a1a1a',
  highlightColor: '#7c3aed',
} as const satisfies NotationStyle;

export type OriginalsSectionPlaybackSettingsPanelProps = {
  sectionLabel: string;
  hasCustomPlayback: boolean;
  override?: OriginalsSectionPlaybackOverride;
  globalSettings: ChordPlaybackSettings;
  tempo: number;
  timeSignature: TimeSignature;
  /** Song-page read view — show effective pattern without edit controls. */
  viewOnly?: boolean;
  onCustomPlaybackChange: (enabled: boolean) => void;
  onOverrideChange: (patch: Partial<OriginalsSectionPlaybackOverride>) => void;
};

function fieldLabel(text: string): ReactElement {
  return (
    <Typography
      component="span"
      variant="caption"
      color="text.secondary"
      sx={{
        display: 'block',
        mb: 0.5,
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        fontSize: '0.625rem',
        lineHeight: 1.2,
      }}
    >
      {text}
    </Typography>
  );
}

export function OriginalsSectionPlaybackSettingsPanel({
  sectionLabel,
  hasCustomPlayback,
  override,
  globalSettings,
  tempo,
  timeSignature,
  viewOnly = false,
  onCustomPlaybackChange,
  onOverrideChange,
}: OriginalsSectionPlaybackSettingsPanelProps): ReactElement {
  const [styleMenuOpen, setStyleMenuOpen] = useState(false);
  const effectiveStyleId = override?.chordStyleId ?? globalSettings.chordStyleId;
  const effectiveDrumsEnabled = override?.drumsEnabled ?? globalSettings.drumsEnabled;
  const effectiveDrumPattern = override?.drumPattern ?? globalSettings.drumPattern;
  const effectiveDrumVolume = globalSettings.drumsMuted ? 0 : globalSettings.drumsVolume;
  const styleLabel =
    CHORD_STYLE_OPTIONS.find((option) => option.id === effectiveStyleId)?.label ?? effectiveStyleId;

  return (
    <Stack
      className="shared-chord-playback-settings shared-chord-playback-settings--encore"
      spacing={0}
      sx={{ width: 1, maxWidth: '100%' }}
    >
      <Box sx={{ px: 3, pt: 2.5, pb: 0 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: '-0.02em', mb: 0.35 }}>
          Section playback
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.45 }}>
          {sectionLabel}
          {viewOnly ? ' · view only' : ''}
        </Typography>
      </Box>

      {viewOnly ? null : (
        <Box sx={{ px: 3, pt: 1.75 }}>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                color="secondary"
                checked={hasCustomPlayback}
                onChange={(_, checked) => onCustomPlaybackChange(checked)}
                sx={{ p: 0.35 }}
              />
            }
            label={
              <Typography variant="body2" sx={{ fontWeight: 600, letterSpacing: '-0.01em' }}>
                Use custom playback for this section
              </Typography>
            }
            sx={{ ml: -0.25, mr: 0, my: 0, '.MuiFormControlLabel-label': { ml: 0.5 } }}
          />
        </Box>
      )}

      {hasCustomPlayback ? (
        <>
          <Divider sx={{ my: 2, borderColor: 'rgba(124, 58, 237, 0.08)' }} />
          <Box sx={{ px: 3 }}>
            {fieldLabel('Chord style')}
            {viewOnly ? (
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {styleLabel}
              </Typography>
            ) : (
              <ChordStyleInput
                value={effectiveStyleId}
                onChange={(next) => onOverrideChange({ chordStyleId: next as ChordStyleId })}
                options={CHORD_STYLE_OPTIONS}
                appearance="encore"
                menuMode="popover"
                menuColumns={2}
                timeSignature={timeSignature}
                menuOpen={styleMenuOpen}
                onMenuOpenChange={setStyleMenuOpen}
              />
            )}
          </Box>

          <Divider sx={{ my: 2, borderColor: 'rgba(124, 58, 237, 0.08)' }} />

          <Box sx={{ px: 3 }}>
            {viewOnly ? (
              <Typography variant="body2" sx={{ fontWeight: 600, mb: effectiveDrumsEnabled ? 1.25 : 0 }}>
                {effectiveDrumsEnabled ? 'Drums on' : 'Drums off'}
              </Typography>
            ) : (
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    color="secondary"
                    checked={effectiveDrumsEnabled}
                    onChange={(_, checked) => onOverrideChange({ drumsEnabled: checked })}
                    sx={{ p: 0.35 }}
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontWeight: 600, letterSpacing: '-0.01em' }}>
                    Add drums
                  </Typography>
                }
                sx={{ ml: -0.25, mr: 0, my: 0, '.MuiFormControlLabel-label': { ml: 0.5 } }}
              />
            )}

            {effectiveDrumsEnabled ? (
              <Box className="shared-chord-playback-settings__drums-panel" sx={{ mt: viewOnly ? 0 : 1.25 }}>
                <DrumAccompaniment
                  {...getInlineDrumUxProps('settings-panel')}
                  readOnly={viewOnly}
                  bpm={tempo}
                  timeSignature={CHART_CHORD_PLAYBACK_TIME_SIGNATURE}
                  isPlaying={false}
                  currentBeatTime={0}
                  currentBeat={0}
                  metronomeEnabled={false}
                  volume={effectiveDrumVolume}
                  notationValue={effectiveDrumPattern}
                  onNotationValueChange={
                    viewOnly ? () => undefined : (drumPattern) => onOverrideChange({ drumPattern })
                  }
                  notationWidth={340}
                  notationFrameClassName="shared-chord-playback-settings__drums-notation"
                  notationStyle={ENCORE_INLINE_DRUM_NOTATION_STYLE}
                />
              </Box>
            ) : null}
          </Box>
        </>
      ) : viewOnly ? (
        <Box sx={{ px: 3, pt: 1.5, pb: 2.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
            Uses playback settings from the toolbar.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ px: 3, pt: 1.25, pb: 2.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
            Uses playback settings from the toolbar.
          </Typography>
        </Box>
      )}

      {hasCustomPlayback ? <Box sx={{ pb: 2.5 }} /> : null}
    </Stack>
  );
}
