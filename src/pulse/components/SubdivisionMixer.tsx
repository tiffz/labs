import { useCallback, useMemo } from 'react';
import Tooltip from '@mui/material/Tooltip';
import type { SubdivisionVolumes, SubdivisionChannel, SubdivisionLevel } from '../engine/types';
import type { VoiceMode } from '../engine/types';
import { getSubdivisionOptions } from '../engine/types';
import type { TimeSignature } from '../../shared/rhythm/types';
import { SubdivisionNoteIcon } from './SubdivisionNoteIcon';

interface SubdivisionMixerProps {
  volumes: SubdivisionVolumes;
  voiceGain: number;
  clickGain: number;
  voiceMode: VoiceMode;
  subdivisionLevel: SubdivisionLevel;
  timeSignature: TimeSignature;
  onChange: (volumes: SubdivisionVolumes) => void;
  onVoiceGainChange: (v: number) => void;
  onClickGainChange: (v: number) => void;
  onVoiceModeChange: (mode: VoiceMode) => void;
  onSubdivisionLevelChange: (level: SubdivisionLevel) => void;
}

interface ChannelDef {
  key: SubdivisionChannel;
  label: string;
  sublabel: string;
  tooltip?: string;
}

function getChannelDefs(level: SubdivisionLevel, denominator: number): ChannelDef[] {
  const defs: ChannelDef[] = [
    {
      key: 'accent',
      label: 'ACCENT',
      sublabel: '>',
      tooltip: 'Volume emphasis on the first beat of each measure (downbeat). Higher values make beat 1 stand out more.',
    },
  ];

  if (denominator === 8) {
    defs.push({ key: 'eighth', label: '1/8', sublabel: '♪' });
    if (level === 4) {
      defs.push({ key: 'sixteenth', label: '1/16', sublabel: '♬' });
    }
  } else {
    defs.push({ key: 'quarter', label: '1/4', sublabel: '♩' });
    if (level >= 2) {
      defs.push(level === 3
        ? { key: 'eighth', label: 'TRIP', sublabel: '3' }
        : { key: 'eighth', label: '1/8', sublabel: '♪' });
    }
    if (level === 4) {
      defs.push({ key: 'sixteenth', label: '1/16', sublabel: '♬' });
    }
  }

  return defs;
}

const TOOLTIP_SX = {
  tooltip: {
    sx: {
      fontFamily: 'var(--pulse-mono)',
      fontSize: '0.75rem',
      bgcolor: 'var(--pulse-surface)',
      color: 'var(--pulse-text)',
      border: '1px solid var(--pulse-accent)',
      borderRadius: 0,
      padding: '8px 12px',
      maxWidth: 240,
      lineHeight: 1.5,
    },
  },
  arrow: {
    sx: {
      color: 'var(--pulse-accent)',
    },
  },
};

export function SubdivisionMixer({
  volumes,
  voiceGain,
  clickGain,
  voiceMode,
  subdivisionLevel,
  timeSignature,
  onChange,
  onVoiceGainChange,
  onClickGainChange,
  onVoiceModeChange,
  onSubdivisionLevelChange,
}: SubdivisionMixerProps) {
  const subdivOptions = useMemo(
    () => getSubdivisionOptions(timeSignature),
    [timeSignature],
  );
  const handleChange = useCallback(
    (channel: SubdivisionChannel, value: number) => {
      onChange({ ...volumes, [channel]: value });
    },
    [volumes, onChange],
  );

  const channels = getChannelDefs(subdivisionLevel, timeSignature.denominator);

  return (
    <div className="pulse-mixer">
      <div className="pulse-mixer-header">
        <span className="pulse-mixer-title">SUBDIVISION MIXER</span>
        <div className="pulse-source-mixer">
          <div className="pulse-source-channel">
            <span className="pulse-source-label">VOICE</span>
            <input
              type="range"
              className="pulse-source-slider"
              min={0}
              max={1}
              step={0.01}
              value={voiceGain}
              onChange={(e) => onVoiceGainChange(parseFloat(e.target.value))}
              aria-label="Voice volume"
            />
            <span className="pulse-source-value">{Math.round(voiceGain * 100)}</span>
            <div className="pulse-voice-mode-toggle" role="radiogroup" aria-label="Voice counting mode">
              <button
                type="button"
                className={`pulse-voice-mode-btn ${voiceMode === 'counting' ? 'is-active' : ''}`}
                onClick={() => onVoiceModeChange('counting')}
                role="radio"
                aria-checked={voiceMode === 'counting'}
              >
                1 e + a
              </button>
              <button
                type="button"
                className={`pulse-voice-mode-btn ${voiceMode === 'takadimi' ? 'is-active' : ''}`}
                onClick={() => onVoiceModeChange('takadimi')}
                role="radio"
                aria-checked={voiceMode === 'takadimi'}
              >
                Ta ka di mi
              </button>
            </div>
          </div>
          <div className="pulse-source-channel">
            <span className="pulse-source-label">CLICK</span>
            <input
              type="range"
              className="pulse-source-slider"
              min={0}
              max={1}
              step={0.01}
              value={clickGain}
              onChange={(e) => onClickGainChange(parseFloat(e.target.value))}
              aria-label="Click volume"
            />
            <span className="pulse-source-value">{Math.round(clickGain * 100)}</span>
          </div>
        </div>
      </div>

      {subdivOptions.length > 1 && (
        <div className="pulse-subdiv-selector" role="radiogroup" aria-label="Subdivision level">
          {subdivOptions.map((opt) => (
            <button
              key={opt.level}
              type="button"
              className={`pulse-subdiv-btn ${subdivisionLevel === opt.level ? 'is-active' : ''}`}
              onClick={() => onSubdivisionLevelChange(opt.level)}
              role="radio"
              aria-checked={subdivisionLevel === opt.level}
              aria-label={`Subdivide: ${opt.label}`}
            >
              <SubdivisionNoteIcon level={opt.iconLevel} />
              <span className="pulse-subdiv-label">{opt.label}</span>
            </button>
          ))}
        </div>
      )}

      <div className="pulse-mixer-channels" style={{ gridTemplateColumns: `repeat(${channels.length}, 1fr)` }}>
        {channels.map(({ key, label, sublabel, tooltip }) => (
          <div className="pulse-channel" key={key}>
            {tooltip ? (
              <Tooltip
                title={tooltip}
                arrow
                placement="top"
                slotProps={TOOLTIP_SX}
              >
                <span className="pulse-channel-label pulse-channel-label--has-tip">
                  {label} <span className="pulse-channel-sublabel">{sublabel}</span>
                </span>
              </Tooltip>
            ) : (
              <span className="pulse-channel-label">
                {label} <span className="pulse-channel-sublabel">{sublabel}</span>
              </span>
            )}
            <input
              type="range"
              className="pulse-channel-slider"
              min={0}
              max={1}
              step={0.01}
              value={volumes[key]}
              onChange={(e) => handleChange(key, parseFloat(e.target.value))}
              aria-label={`${label} volume`}
            />
            <span className="pulse-channel-value">
              {Math.round(volumes[key] * 100)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
