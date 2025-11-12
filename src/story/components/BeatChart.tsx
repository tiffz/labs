import React from 'react';
import type { StoryDNA } from '../types';
import { beats } from '../data/beats';
import { GeneratedChip } from './GeneratedChip';
import { Tooltip } from './Tooltip';
import { getContent } from '../data/storyGenerator';

interface BeatChartProps {
  dna: StoryDNA;
  onReroll: (rerollId: string) => void;
}

export const BeatChart: React.FC<BeatChartProps> = ({ dna, onReroll }) => {
  let currentAct: string | number | null = null;

  // Color schemes for each act - more sophisticated and subtle
  const getActColor = (act: string | number) => {
    const actNum = typeof act === 'string' ? parseInt(act) : act;
    const colors = [
      { bg: 'from-orange-500 via-orange-500 to-pink-500/70', border: 'border-orange-200/80', hover: 'hover:border-orange-300' },
      { bg: 'from-pink-500 via-pink-500 to-purple-500/70', border: 'border-pink-200/80', hover: 'hover:border-pink-300' },
      { bg: 'from-purple-500 via-purple-500 to-orange-500/70', border: 'border-purple-200/80', hover: 'hover:border-purple-300' },
    ];
    return colors[(actNum - 1) % colors.length] || colors[0];
  };

  return (
    <div className="space-y-2.5">
      {beats.map((beat) => {
        const actColor = getActColor(beat.act);
        const actHeader =
          beat.act !== currentAct ? (
            <div
              key={`act-${beat.act}`}
              className="flex items-center gap-3 mt-4 first:mt-0 mb-2"
            >
              <div className={`inline-flex items-center gap-2 bg-gradient-to-br ${actColor.bg} text-white px-3 py-1 rounded font-semibold text-xs shadow-sm`}>
                Act {beat.act}
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300/60 to-transparent"></div>
            </div>
          ) : null;

        currentAct = beat.act;

        return (
          <React.Fragment key={beat.name}>
            {actHeader}
            <div className={`bg-white rounded-lg shadow-sm border ${actColor.border} p-3 md:p-4 ${actColor.hover} transition-all hover:shadow-md`}>
              <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1">
                {beat.name}
                <Tooltip content={beat.prompt} />
              </h4>
              <div className="space-y-2">
                {beat.sub.map((subElementName) => {
                  const rerollId = `beat_${beat.name.split('. ')[1].replace(/\s+/g, '')}_${subElementName.replace(/[^a-zA-Z0-9]/g, '')}`;
                  const content = getContent(rerollId, dna);

                  return (
                    <div key={subElementName} className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
                      <div className="text-xs font-medium text-slate-500 md:w-32">
                        {subElementName}
                      </div>
                      <div className="flex-1">
                        <GeneratedChip
                          rerollId={rerollId}
                          content={content}
                          onReroll={onReroll}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

