import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import type { TimeSignature } from '../../../../rhythm/types';
import { PlaybackVolumeRow } from '../../../../components/music/PlaybackVolumeRow';
import {
  getSubdivisionOptions,
  type SubdivisionChannel,
  type SubdivisionLevel,
  type VoiceMode,
} from '../../../metronome/types';
import {
  defaultMetronomeLevelVolumes,
  DEFAULT_METRONOME_DRUM_GAIN,
  type MetronomePreferences,
} from '../preferences';
import { subdivisionVolumesForLevel } from '../../../metronome/rhythmMetronomeClick';
import {
  metronomeSettingsPanelClass,
  resolveMetronomeAppearance,
  type MetronomeAppearance,
} from '../metronomeAppearance';

export type MetronomeAdvancedSettingsPanelProps = {
  preferences: MetronomePreferences;
  timeSignature: TimeSignature;
  onChange: (next: MetronomePreferences) => void;
  /** When provided with `onEnabledChange`, shows Off/On control in the panel header. */
  enabled?: boolean;
  onEnabledChange?: (enabled: boolean) => void;
  showVoiceMode?: boolean;
  appearance?: MetronomeAppearance | string;
};

const CHANNEL_LABELS: Record<SubdivisionChannel, string> = {
  accent: 'Downbeat',
  quarter: 'Beat',
  eighth: 'Off-beat',
  sixteenth: 'Sub-beat',
};

const SOURCE_OPTIONS = [
  { id: 'click' as const, label: 'Click' },
  { id: 'voice' as const, label: 'Voice' },
  { id: 'drum' as const, label: 'Drum' },
];

const COUNTING_OPTIONS: { id: VoiceMode; label: string }[] = [
  { id: 'counting', label: '1 e + a' },
  { id: 'takadimi', label: 'Ta ka di mi' },
];

function visibleChannels(level: SubdivisionLevel, ts: TimeSignature): SubdivisionChannel[] {
  const hasSub = level === 4;
  const hasOff = level !== 1;
  const channels: SubdivisionChannel[] = ['accent'];
  if (ts.denominator === 8) {
    channels.push('eighth');
    if (hasSub) channels.push('sixteenth');
  } else {
    channels.push('quarter');
    if (hasOff) channels.push('eighth');
    if (hasSub) channels.push('sixteenth');
  }
  return channels;
}

function SettingsSection({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Box component="section" className="labs-metronome-settings-panel__section">
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          mb: 0.75,
        }}
      >
        <Typography
          component="h4"
          variant="caption"
          className="labs-metronome-settings-panel__section-title"
          sx={{ display: 'block', fontWeight: 600, color: 'text.secondary', m: 0 }}
        >
          {title}
        </Typography>
        {action}
      </Box>
      {children}
    </Box>
  );
}

export default function MetronomeAdvancedSettingsPanel({
  preferences,
  timeSignature,
  onChange,
  enabled,
  onEnabledChange,
  showVoiceMode = true,
  appearance = 'default',
}: MetronomeAdvancedSettingsPanelProps) {
  const resolvedAppearance = resolveMetronomeAppearance(appearance);
  const subdivOptions = getSubdivisionOptions(timeSignature);
  const channels = visibleChannels(preferences.subdivisionLevel, timeSignature);
  const voiceOn = preferences.sourceEnabled.voice;
  const showPowerControl = onEnabledChange != null && enabled != null;
  const metronomeActive = enabled === true;

  const patch = (partial: Partial<MetronomePreferences>) => {
    onChange({ ...preferences, ...partial });
  };

  const setChannelVolume = (ch: SubdivisionChannel, volume100: number) => {
    patch({
      subdivisionVolumes: {
        ...preferences.subdivisionVolumes,
        [ch]: Math.max(0, Math.min(1, volume100 / 100)),
      },
    });
  };

  const toggleChannelMute = (ch: SubdivisionChannel, muted: boolean) => {
    const mutes = new Set(preferences.levelChannelMutes);
    if (muted) mutes.add(ch);
    else mutes.delete(ch);
    patch({ levelChannelMutes: [...mutes] });
  };

  const resetLevels = () => {
    patch(defaultMetronomeLevelVolumes());
  };

  return (
    <Box
      className={metronomeSettingsPanelClass(resolvedAppearance)}
      role="group"
      aria-label="Advanced metronome settings"
    >
      <Box
        component="header"
        className="labs-metronome-settings-panel__header"
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
      >
        <Typography component="h3" variant="subtitle2" sx={{ fontWeight: 600, m: 0 }}>
          Metronome
        </Typography>
        {showPowerControl ? (
          <FormControlLabel
            className="labs-metronome-settings-panel__power-control"
            control={
              <Checkbox
                size="small"
                checked={metronomeActive}
                onChange={(_event, checked) => {
                  if (checked !== enabled) onEnabledChange(checked);
                }}
                slotProps={{
                  input: { 'aria-label': 'Metronome on' }
                }}
              />
            }
            label="On"
          />
        ) : null}
      </Box>
      {showPowerControl && !metronomeActive ? (
        <Box
          className="labs-metronome-settings-panel__status"
          role="status"
          aria-live="polite"
        >
          Metronome is off. Turn it on to apply settings.
        </Box>
      ) : null}
      <Box
        className={`labs-metronome-settings-panel__body${
          showPowerControl && !metronomeActive ? ' labs-metronome-settings-panel__body--inactive' : ''
        }`}
      >
        <SettingsSection title="Subdivision">
          <ToggleButtonGroup
            exclusive
            size="small"
            fullWidth
            value={preferences.subdivisionLevel}
            aria-label="Subdivision level"
            className="labs-metronome-settings-panel__toggle-group"
            onChange={(_event, level: SubdivisionLevel | null) => {
              if (level == null) return;
              patch({
                subdivisionLevel: level,
                subdivisionVolumes: subdivisionVolumesForLevel(
                  level,
                  preferences.subdivisionVolumes,
                ),
              });
            }}
          >
            {subdivOptions.map((opt) => (
              <ToggleButton key={String(opt.level)} value={opt.level} aria-label={opt.label}>
                {opt.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </SettingsSection>

        <SettingsSection title="Sound sources">
          <ToggleButtonGroup
            size="small"
            fullWidth
            value={SOURCE_OPTIONS.filter((opt) => preferences.sourceEnabled[opt.id]).map(
              (opt) => opt.id,
            )}
            aria-label="Metronome sound sources"
            className="labs-metronome-settings-panel__toggle-group"
            onChange={(_event, next: Array<(typeof SOURCE_OPTIONS)[number]['id']>) => {
              const sourceEnabled = {
                voice: next.includes('voice'),
                click: next.includes('click'),
                drum: next.includes('drum'),
              };
              const partial: Partial<MetronomePreferences> = { sourceEnabled };
              if (sourceEnabled.voice && preferences.voiceGain <= 0) {
                partial.voiceGain = 0.85;
              }
              if (sourceEnabled.drum && preferences.drumGain <= 0) {
                partial.drumGain = DEFAULT_METRONOME_DRUM_GAIN;
              }
              patch(partial);
            }}
          >
            {SOURCE_OPTIONS.map(({ id, label }) => (
              <ToggleButton key={id} value={id} aria-label={label}>
                {label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </SettingsSection>

        {showVoiceMode && voiceOn ? (
          <SettingsSection title="Counting style">
            <ToggleButtonGroup
              exclusive
              size="small"
              fullWidth
              value={preferences.voiceMode}
              aria-label="Voice counting style"
              className="labs-metronome-settings-panel__toggle-group labs-metronome-settings-panel__toggle-group--counting"
              onChange={(_event, mode: VoiceMode | null) => {
                if (mode != null) patch({ voiceMode: mode });
              }}
            >
              {COUNTING_OPTIONS.map(({ id, label }) => (
                <ToggleButton key={id} value={id} aria-label={label}>
                  {label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </SettingsSection>
        ) : null}

        <SettingsSection
          title="Levels"
          action={
            <Button
              type="button"
              size="small"
              variant="text"
              className="labs-metronome-settings-panel__reset-levels"
              onClick={resetLevels}
              sx={{ minWidth: 0, px: 0.75, py: 0, fontSize: '0.75rem', textTransform: 'none' }}
            >
              Reset to default
            </Button>
          }
        >
          <Box className="labs-metronome-settings-panel__levels" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {channels.map((ch) => {
              const gain = preferences.subdivisionVolumes[ch];
              return (
                <PlaybackVolumeRow
                  key={ch}
                  compact
                  label={CHANNEL_LABELS[ch]}
                  volume={Math.round(gain * 100)}
                  muted={preferences.levelChannelMutes.includes(ch)}
                  onVolumeChange={(volume) => setChannelVolume(ch, volume)}
                  onMutedChange={(muted) => toggleChannelMute(ch, muted)}
                  aria-label={`${CHANNEL_LABELS[ch]} volume`}
                />
              );
            })}
            <PlaybackVolumeRow
              compact
              label="Overall"
              volume={preferences.masterVolume}
              muted={preferences.masterMuted}
              onVolumeChange={(volume) => patch({ masterVolume: volume })}
              onMutedChange={(muted) => patch({ masterMuted: muted })}
              aria-label="Metronome overall volume"
            />
          </Box>
        </SettingsSection>
      </Box>
    </Box>
  );
}
