import { useCallback, useMemo } from 'react';
import Tooltip from '@mui/material/Tooltip';
import type { SubdivisionVolumes, SubdivisionChannel, SubdivisionLevel } from '../engine/types';
import { getSubdivisionOptions, isSwingLevel } from '../engine/types';
import type { TimeSignature } from '../../shared/rhythm/types';
import { SubdivisionNoteIcon } from './SubdivisionNoteIcon';

interface SubdivisionMixerProps {
  volumes: SubdivisionVolumes;
  voiceEnabled: boolean;
  clickEnabled: boolean;
  drumEnabled: boolean;
  channelVoiceMutes: Set<SubdivisionChannel>;
  channelClickMutes: Set<SubdivisionChannel>;
  channelDrumMutes: Set<SubdivisionChannel>;
  subdivisionLevel: SubdivisionLevel;
  timeSignature: TimeSignature;
  onChange: (volumes: SubdivisionVolumes) => void;
  onChannelVoiceMute: (channel: SubdivisionChannel, muted: boolean) => void;
  onChannelClickMute: (channel: SubdivisionChannel, muted: boolean) => void;
  onChannelDrumMute: (channel: SubdivisionChannel, muted: boolean) => void;
  onSubdivisionLevelChange: (level: SubdivisionLevel) => void;
}

interface ChannelDef {
  key: SubdivisionChannel;
  label: string;
  sublabel: string;
  tooltip: string;
}

function beatListStr(numerator: number): string {
  if (numerator <= 2) return 'beat 2';
  const beats = Array.from({ length: numerator - 1 }, (_, i) => String(i + 2));
  return `beats ${beats.join(', ')}`;
}

function getChannelDefs(level: SubdivisionLevel, ts: TimeSignature): ChannelDef[] {
  const { numerator, denominator } = ts;
  const defs: ChannelDef[] = [];

  const hasOffBeat = (typeof level === 'number' && level >= 2) || isSwingLevel(level);
  const hasSubBeat = level === 4;

  if (denominator === 8) {
    defs.push({
      key: 'accent', label: 'DOWNBEAT', sublabel: '>',
      tooltip: `The first eighth note of each measure in ${numerator}/${denominator}. This is the strongest pulse.`,
    });
    defs.push({
      key: 'eighth', label: 'BEAT', sublabel: '♪',
      tooltip: `All other eighth notes in the measure. In ${numerator}/${denominator}, this covers the remaining ${numerator - 1} eighth notes.`,
    });
    if (hasSubBeat) {
      defs.push({
        key: 'sixteenth', label: 'OFF-BEAT', sublabel: '&',
        tooltip: `The sixteenth notes between each eighth note — the "e" positions that fall halfway between beats.`,
      });
    }
  } else {
    defs.push({
      key: 'accent', label: 'DOWNBEAT', sublabel: '>',
      tooltip: `Beat 1 of each measure in ${numerator}/${denominator}. This is the strongest pulse.`,
    });
    defs.push({
      key: 'quarter', label: 'BEAT', sublabel: '♩',
      tooltip: `The other main beats: ${beatListStr(numerator)} in ${numerator}/${denominator}.`,
    });
    if (hasOffBeat) {
      if (level === 3) {
        defs.push({
          key: 'eighth', label: 'OFF-BEAT', sublabel: '3',
          tooltip: `The two triplet notes after each beat — the "+, a" syllables. In ${numerator}/${denominator} ÷3, each beat is split into three.`,
        });
      } else if (level === 'swing8') {
        defs.push({
          key: 'eighth', label: 'OFF-BEAT', sublabel: '&',
          tooltip: `The swung off-beat after each beat — played late with a triplet feel, giving the "+" a lazy, laid-back sound.`,
        });
      } else {
        defs.push({
          key: 'eighth', label: 'OFF-BEAT', sublabel: '&',
          tooltip: `The "+" between each beat — halfway through each beat in ${numerator}/${denominator} ÷2.`,
        });
      }
    }
    if (hasSubBeat) {
      defs.push({
        key: 'sixteenth', label: 'SUB-BEAT', sublabel: 'e/a',
        tooltip: `The "e" and "a" sixteenth notes — the finest subdivisions, falling between the beat and the "+". Each beat in ${numerator}/${denominator} ÷4 is counted "1 e + a".`,
      });
    }
  }

  return defs;
}

function channelDisplayName(key: SubdivisionChannel): string {
  if (key === 'accent') return 'downbeat';
  if (key === 'quarter' || key === 'eighth') return 'beat';
  return 'sub-beat';
}

function subdivTooltip(label: string, denominator: number): string {
  if (label === '♩') return 'No subdivision — play only the beat.';
  if (label === '♪' && denominator === 8) return 'Eighth-note pulse — the natural unit in this meter.';
  if (label === '÷2' && denominator === 8) return 'Divide each eighth note in half.';
  if (label === '÷2') return 'Divide each beat in half (eighth notes).';
  if (label === '÷3') return 'Divide each beat into three (triplets).';
  if (label === '÷4') return 'Divide each beat into four (sixteenth notes).';
  if (label === 'Sw♪') return 'Swing feel — long-short eighth notes (triplet timing).';
  return '';
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
  voiceEnabled,
  clickEnabled,
  drumEnabled,
  channelVoiceMutes,
  channelClickMutes,
  channelDrumMutes,
  subdivisionLevel,
  timeSignature,
  onChange,
  onChannelVoiceMute,
  onChannelClickMute,
  onChannelDrumMute,
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

  const channels = getChannelDefs(subdivisionLevel, timeSignature);
  const showAnyMute = voiceEnabled || clickEnabled || drumEnabled;

  return (
    <div className="pulse-mixer">
      <div className="pulse-mixer-header">
        <span className="pulse-mixer-title">MIXER</span>
      </div>

      {subdivOptions.length > 1 && (
        <div className="pulse-subdiv-selector" role="radiogroup" aria-label="Subdivision level">
          {subdivOptions.map((opt) => (
            <Tooltip
              key={String(opt.level)}
              title={subdivTooltip(opt.label, timeSignature.denominator)}
              arrow
              placement="top"
              slotProps={TOOLTIP_SX}
            >
              <button
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
            </Tooltip>
          ))}
        </div>
      )}

      <div className="pulse-mixer-channels" style={{ gridTemplateColumns: `repeat(${channels.length}, 1fr)` }}>
        {channels.map(({ key, label, sublabel, tooltip }) => {
          const name = channelDisplayName(key);
          const voiceOn = !channelVoiceMutes.has(key);
          const clickOn = !channelClickMutes.has(key);
          const drumOn = !channelDrumMutes.has(key);
          const voiceTip = voiceOn
            ? `Voice for ${name} is on. Toggle to mute.`
            : `Voice for ${name} is muted. Toggle to enable.`;
          const clickTip = clickOn
            ? `Metronome tick for ${name} is on. Toggle to mute.`
            : `Metronome tick for ${name} is muted. Toggle to enable.`;
          const drumTip = drumOn
            ? `Drum sound for ${name} is on. Toggle to mute.`
            : `Drum sound for ${name} is muted. Toggle to enable.`;

          return (
            <div className="pulse-channel" key={key}>
              <Tooltip
                title={tooltip}
                arrow
                placement="top"
                slotProps={TOOLTIP_SX}
              >
                <span className="pulse-channel-label">
                  {label} <span className="pulse-channel-sublabel">{sublabel}</span>
                </span>
              </Tooltip>
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
              {showAnyMute && (
                <div className="pulse-channel-mutes">
                  {voiceEnabled && (
                    <Tooltip title={voiceTip} arrow placement="bottom" slotProps={TOOLTIP_SX}>
                      <button
                        type="button"
                        className={`pulse-channel-mute ${voiceOn ? 'is-on' : ''}`}
                        onClick={() => onChannelVoiceMute(key, voiceOn)}
                        aria-label={voiceTip}
                      >
                        V
                      </button>
                    </Tooltip>
                  )}
                  {clickEnabled && (
                    <Tooltip title={clickTip} arrow placement="bottom" slotProps={TOOLTIP_SX}>
                      <button
                        type="button"
                        className={`pulse-channel-mute ${clickOn ? 'is-on' : ''}`}
                        onClick={() => onChannelClickMute(key, clickOn)}
                        aria-label={clickTip}
                      >
                        C
                      </button>
                    </Tooltip>
                  )}
                  {drumEnabled && (
                    <Tooltip title={drumTip} arrow placement="bottom" slotProps={TOOLTIP_SX}>
                      <button
                        type="button"
                        className={`pulse-channel-mute ${drumOn ? 'is-on' : ''}`}
                        onClick={() => onChannelDrumMute(key, drumOn)}
                        aria-label={drumTip}
                      >
                        D
                      </button>
                    </Tooltip>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
