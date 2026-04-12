import { useMemo, useState } from 'react';
import type { TimeSignature } from '../../shared/rhythm/types';
import {
  getDefaultBeatGrouping,
  parseBeatGrouping,
} from '../../shared/rhythm/timeSignatureUtils';
import type { BeatEvent, SubdivisionLevel, VoiceMode } from '../engine/types';
import { eighthBaseSlotsPerEighth } from '../engine/types';
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

  const beats = useMemo(() => {
    const result: Array<{ label: string; groupIdx: number; beatIdx: number; isAccent: boolean }> = [];
    let flatIdx = 0;
    const isEighthBase = timeSignature.denominator === 8;

    if (isEighthBase) {
      const slotsPerEighth = eighthBaseSlotsPerEighth(subdivisionLevel);
      for (let gi = 0; gi < groups.length; gi++) {
        const groupSize = groups[gi];
        const groupLength = groupSize * slotsPerEighth;
        let groupSlotIdx = 0;
        for (let b = 0; b < groupSize; b++) {
          for (let s = 0; s < slotsPerEighth; s++) {
            const label = takadimi
              ? takadimiLabelForPosition(groupLength, groupSlotIdx)
              : syllableForPosition(groupLength, groupSlotIdx, gi + 1).label;
            result.push({
              label,
              groupIdx: gi,
              beatIdx: flatIdx,
              isAccent: gi === 0 && b === 0 && s === 0,
            });
            flatIdx++;
            groupSlotIdx++;
          }
        }
      }
    } else {
      let globalBeatNum = 0;
      for (let gi = 0; gi < groups.length; gi++) {
        const groupSize = groups[gi];
        for (let beat = 0; beat < groupSize; beat++) {
          globalBeatNum++;
          for (let s = 0; s < subdivisionLevel; s++) {
            const label = takadimi
              ? takadimiLabelForPosition(subdivisionLevel, s)
              : syllableForPosition(subdivisionLevel, s, globalBeatNum).label;
            result.push({
              label,
              groupIdx: gi,
              beatIdx: flatIdx,
              isAccent: gi === 0 && beat === 0 && s === 0,
            });
            flatIdx++;
          }
        }
      }
    }
    return result;
  }, [groups, timeSignature.denominator, subdivisionLevel, takadimi]);

  const [hoveredBeat, setHoveredBeat] = useState<number | null>(null);

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
                return (
                  <div
                    key={b.beatIdx}
                    className={[
                      'pulse-beat-cell',
                      b.isAccent ? 'is-accent' : '',
                      isActive ? 'is-active' : '',
                      isMuted ? 'is-muted' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => handleClick(b.beatIdx)}
                    onMouseEnter={() => setHoveredBeat(b.beatIdx)}
                    onMouseLeave={() => setHoveredBeat(null)}
                  >
                    <div className="pulse-beat-bar-track">
                      <div className="pulse-beat-bar-fill" />
                    </div>
                    <div className="pulse-beat-label">{b.label}</div>
                    {hoveredBeat === b.beatIdx && (
                      <div className="pulse-beat-hover-card">
                        {isMuted ? 'Muted. Click to unmute' : 'Click to mute'}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}
