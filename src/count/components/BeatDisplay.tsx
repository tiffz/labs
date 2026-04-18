import { useMemo } from 'react';
import PulseTooltip from './PulseTooltip';
import type { TimeSignature } from '../../shared/rhythm/types';
import {
  getDefaultBeatGrouping,
  parseBeatGrouping,
} from '../../shared/rhythm/timeSignatureUtils';
import type { BeatEvent, SubdivisionLevel, VoiceMode } from '../engine/types';
import { eighthBaseSlotsPerEighth, slotsPerBeat } from '../engine/types';
import { syllableForPosition, takadimiLabelForPosition } from '../engine/syllableMap';

interface BeatDisplayProps {
  currentBeat: BeatEvent | null;
  timeSignature: TimeSignature;
  beatGrouping?: string;
  playing: boolean;
  perBeatVolumes: number[];
  onBeatVolumeChange: (beatIndex: number, volume: number) => void;
  subdivisionLevel: SubdivisionLevel;
  voiceMode: VoiceMode;
}

export function BeatDisplay({
  currentBeat,
  timeSignature,
  beatGrouping,
  playing,
  perBeatVolumes,
  onBeatVolumeChange,
  subdivisionLevel,
  voiceMode,
}: BeatDisplayProps) {
  const groups = useMemo(() => {
    if (beatGrouping) {
      const parsed = parseBeatGrouping(beatGrouping);
      if (parsed) return parsed;
    }
    return getDefaultBeatGrouping(timeSignature);
  }, [timeSignature, beatGrouping]);

  const takadimi = voiceMode === 'takadimi';
  const isSwing = subdivisionLevel === 'swing8';

  const beats = useMemo(() => {
    const result: Array<{
      label: string;
      groupIdx: number;
      beatIdx: number;
      isAccent: boolean;
      isSwingSilent: boolean;
    }> = [];
    let flatIdx = 0;
    const isEighthBase = timeSignature.denominator === 8;

    if (isEighthBase) {
      const slots = eighthBaseSlotsPerEighth(subdivisionLevel);
      for (let gi = 0; gi < groups.length; gi++) {
        const groupSize = groups[gi];
        const groupLength = groupSize * slots;
        let groupSlotIdx = 0;
        for (let b = 0; b < groupSize; b++) {
          for (let s = 0; s < slots; s++) {
            const label = takadimi
              ? takadimiLabelForPosition(groupLength, groupSlotIdx)
              : syllableForPosition(groupLength, groupSlotIdx, gi + 1).label;
            result.push({
              label,
              groupIdx: gi,
              beatIdx: flatIdx,
              isAccent: gi === 0 && b === 0 && s === 0,
              isSwingSilent: false,
            });
            flatIdx++;
            groupSlotIdx++;
          }
        }
      }
    } else {
      const slots = slotsPerBeat(subdivisionLevel);
      let globalBeatNum = 0;
      for (let gi = 0; gi < groups.length; gi++) {
        const groupSize = groups[gi];
        for (let beat = 0; beat < groupSize; beat++) {
          globalBeatNum++;
          for (let s = 0; s < slots; s++) {
            let label: string;
            if (takadimi) {
              label = takadimiLabelForPosition(slots, s);
            } else if (isSwing && s === 1) {
              label = '+';
            } else if (isSwing && s === 2) {
              label = 'a';
            } else {
              label = syllableForPosition(slots, s, globalBeatNum).label;
            }
            result.push({
              label,
              groupIdx: gi,
              beatIdx: flatIdx,
              isAccent: gi === 0 && beat === 0 && s === 0,
              isSwingSilent: isSwing && s === 1,
            });
            flatIdx++;
          }
        }
      }
    }
    return result;
  }, [groups, timeSignature.denominator, subdivisionLevel, takadimi, isSwing]);

  const handleClick = (beatIdx: number) => {
    const current = perBeatVolumes[beatIdx] ?? 1.0;
    onBeatVolumeChange(beatIdx, current > 0 ? 0.0 : 1.0);
  };

  const activeBeatIndex = currentBeat?.beatIndex ?? -1;

  return (
    <div className="pulse-beat-display">
      <div className="pulse-beat-row">
        {groups.map((_size, gi) => (
          <div className="pulse-beat-group" key={gi}>
            {beats
              .filter((b) => b.groupIdx === gi)
              .map((b) => {
                const isActive = playing && activeBeatIndex === b.beatIdx;
                const isMuted = (perBeatVolumes[b.beatIdx] ?? 1.0) === 0;
                const isSwingSilent = b.isSwingSilent;
                const tip = isSwingSilent
                  ? 'Silent — swing skips this beat'
                  : isMuted
                    ? `${b.label} is muted. Click to unmute.`
                    : `Click to mute ${b.label}.`;
                return (
                  <PulseTooltip
                    key={b.beatIdx}
                    title={tip}
                    placement="bottom"
                  >
                    <div
                      className={[
                        'pulse-beat-cell',
                        b.isAccent ? 'is-accent' : '',
                        isActive ? 'is-active' : '',
                        (isMuted || isSwingSilent) ? 'is-muted' : '',
                        isSwingSilent ? 'is-swing-silent' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={isSwingSilent ? undefined : () => handleClick(b.beatIdx)}
                      onKeyDown={isSwingSilent ? undefined : (e) => {
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(b.beatIdx); }
                      }}
                      role={isSwingSilent ? undefined : 'button'}
                      tabIndex={isSwingSilent ? undefined : 0}
                    >
                      <div className="pulse-beat-bar-track">
                        <div className="pulse-beat-bar-fill" />
                      </div>
                      <div className="pulse-beat-label">{b.label}</div>
                    </div>
                  </PulseTooltip>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}
