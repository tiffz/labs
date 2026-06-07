import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState, type ReactElement } from 'react';
import ChordStyleInput from './ChordStyleInput';
import DrumAccompaniment from './DrumAccompaniment';
import { getInlineDrumUxProps } from './inlineDrumUxDefaults';
import { PlaybackSoundSelect } from './PlaybackSoundSelect';
import { PlaybackVolumeRow } from './PlaybackVolumeRow';
import type { NotationStyle } from '../../notation/DrumNotationMini';
import {
  CHART_CHORD_PLAYBACK_TIME_SIGNATURE,
  type ChordPlaybackSettings,
} from '../../music/chordPlaybackSettings';
import { CHORD_STYLE_OPTIONS, type ChordStyleId } from '../../music/chordStyleOptions';
import type { SampledPianoLoadState } from '../../music/sampledPianoLoadState';
import './chordPlaybackSettingsPanel.css';

const ENCORE_INLINE_DRUM_NOTATION_STYLE = {
  inkColor: '#1a1a1a',
  highlightColor: '#7c3aed',
} as const satisfies NotationStyle;

export type ChordPlaybackSettingsPanelProps = {
  settings: ChordPlaybackSettings;
  onChange: (patch: Partial<ChordPlaybackSettings>) => void;
  sampledPianoLoad?: SampledPianoLoadState;
  appearance?: 'default' | 'encore';
  tempo?: number;
  playing?: boolean;
  /** Seconds elapsed within the current measure (for inline drum notation). */
  playbackBeatTime?: number;
  /** Beat index within the current measure (0-based). */
  playbackBeat?: number;
};

function fieldLabel(text: string, encore = false): ReactElement {
  if (encore) {
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
  return (
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.35, fontWeight: 600 }}>
      {text}
    </Typography>
  );
}

export function ChordPlaybackSettingsPanel({
  settings,
  onChange,
  sampledPianoLoad,
  appearance = 'default',
  tempo = 80,
  playing = false,
  playbackBeatTime = 0,
  playbackBeat = 0,
}: ChordPlaybackSettingsPanelProps): ReactElement {
  const isEncore = appearance === 'encore';
  const [openField, setOpenField] = useState<'style' | 'sound' | null>(null);
  const panelClass = [
    'shared-chord-playback-settings',
    isEncore ? 'shared-chord-playback-settings--encore' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const panelWidth = isEncore
    ? { width: 1, maxWidth: '100%' }
    : { minWidth: 280, maxWidth: 340 };

  return (
    <Stack className={panelClass} spacing={isEncore ? 0 : 1.25} sx={{ p: isEncore ? 0 : 1.75, ...panelWidth }}>
      {isEncore ? (
        <Box sx={{ px: 3, pt: 2.5, pb: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: '-0.02em', mb: 2 }}>
            Playback settings
          </Typography>
        </Box>
      ) : (
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: 'text.primary',
          }}
        >
          Playback settings
        </Typography>
      )}

      <Box sx={{ px: isEncore ? 3 : 0, pb: isEncore ? 0 : undefined }}>
        {isEncore ? fieldLabel('Sound', true) : null}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: isEncore ? '1fr 1fr' : '1fr',
            gap: 1,
            alignItems: 'start',
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            {!isEncore ? fieldLabel('Chord style', false) : null}
            <ChordStyleInput
              value={settings.chordStyleId}
              options={CHORD_STYLE_OPTIONS}
              onChange={(next) => onChange({ chordStyleId: next as ChordStyleId })}
              appearance={isEncore ? 'encore' : 'default'}
              menuMode="popover"
              menuColumns={2}
              timeSignature={CHART_CHORD_PLAYBACK_TIME_SIGNATURE}
              menuOpen={openField === 'style'}
              onMenuOpenChange={(open) => setOpenField(open ? 'style' : null)}
            />
          </Box>

          <PlaybackSoundSelect
            value={settings.soundType}
            onChange={(soundType) => onChange({ soundType })}
            sampledPianoLoad={sampledPianoLoad}
            appearance={isEncore ? 'encore' : 'default'}
            label={isEncore ? null : fieldLabel('Sound', false)}
            aria-label="Chord sound"
            menuOpen={openField === 'sound'}
            onMenuOpenChange={(open) => setOpenField(open ? 'sound' : null)}
          />
        </Box>
      </Box>

      {isEncore ? <Divider sx={{ my: 2, borderColor: 'rgba(124, 58, 237, 0.08)' }} /> : null}

      <Box sx={{ px: isEncore ? 3 : 0 }}>
        {fieldLabel('Levels', isEncore)}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: isEncore && settings.drumsEnabled ? '1fr 1fr' : '1fr',
            gap: isEncore ? 1.25 : 1,
          }}
        >
          <PlaybackVolumeRow
            label="Chords"
            volume={settings.chordVolume}
            muted={settings.chordMuted}
            onVolumeChange={(chordVolume) => onChange({ chordVolume })}
            onMutedChange={(chordMuted) => onChange({ chordMuted })}
            aria-label="Chord volume"
            compact={isEncore}
            sliderColor={isEncore ? 'secondary' : 'primary'}
          />
          {settings.drumsEnabled ? (
            <PlaybackVolumeRow
              label="Drums"
              volume={settings.drumsVolume}
              muted={settings.drumsMuted}
              onVolumeChange={(drumsVolume) => onChange({ drumsVolume })}
              onMutedChange={(drumsMuted) => onChange({ drumsMuted })}
              aria-label="Drum volume"
              compact={isEncore}
              sliderColor={isEncore ? 'secondary' : 'primary'}
            />
          ) : null}
        </Box>
      </Box>

      {isEncore ? <Divider sx={{ my: 2, borderColor: 'rgba(124, 58, 237, 0.08)' }} /> : null}

      <Box sx={{ px: isEncore ? 3 : 0 }}>
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              color="secondary"
              checked={settings.drumsEnabled}
              onChange={(e) => onChange({ drumsEnabled: e.target.checked })}
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

        {settings.drumsEnabled ? (
          <Box className="shared-chord-playback-settings__drums-panel">
            <DrumAccompaniment
              {...getInlineDrumUxProps('settings-panel')}
              bpm={tempo}
              timeSignature={CHART_CHORD_PLAYBACK_TIME_SIGNATURE}
              isPlaying={playing}
              currentBeatTime={playbackBeatTime}
              currentBeat={playbackBeat}
              metronomeEnabled={false}
              volume={settings.drumsMuted ? 0 : settings.drumsVolume}
              notationValue={settings.drumPattern}
              onNotationValueChange={(drumPattern) => onChange({ drumPattern })}
              notationWidth={isEncore ? 340 : 320}
              notationFrameClassName="shared-chord-playback-settings__drums-notation"
              notationStyle={isEncore ? ENCORE_INLINE_DRUM_NOTATION_STYLE : undefined}
            />
          </Box>
        ) : null}
      </Box>

      {isEncore ? <Box sx={{ pb: 2.5 }} /> : null}
    </Stack>
  );
}
