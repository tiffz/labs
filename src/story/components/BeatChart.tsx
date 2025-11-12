import React from 'react';
import type { StoryDNA } from '../types';
import { beats } from '../data/beats';
import { GeneratedChip } from './GeneratedChip';
import { Tooltip } from './Tooltip';
import { getNewSuggestion } from '../data/storyGenerator';

interface BeatChartProps {
  dna: StoryDNA;
  onReroll: (rerollId: string) => void;
}

export const BeatChart: React.FC<BeatChartProps> = ({ dna, onReroll }) => {
  let currentAct: string | number | null = null;

  return (
    <div className="space-y-2.5">
      {beats.map((beat) => {
        const actHeader =
          beat.act !== currentAct ? (
            <div
              key={`act-${beat.act}`}
              className="flex items-center gap-2 mt-4 first:mt-0 mb-2"
            >
              <div className="inline-flex items-center gap-2 bg-indigo-600 text-white px-3 py-1 rounded-lg font-semibold text-xs">
                Act {beat.act}
              </div>
              <div className="flex-1 h-px bg-slate-200"></div>
            </div>
          ) : null;

        currentAct = beat.act;

        return (
          <React.Fragment key={beat.name}>
            {actHeader}
            <div className="bg-white rounded-xl shadow-md border border-slate-200 p-3 md:p-4">
              <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1">
                {beat.name}
                <Tooltip content={beat.prompt} />
              </h4>
              <div className="space-y-2">
                {beat.sub.map((subElementName) => {
                  const rerollId = `beat_${beat.name.split('. ')[1].replace(/\s+/g, '')}_${subElementName.replace(/[^a-zA-Z0-9]/g, '')}`;
                  const initialContent = getNewSuggestion(rerollId, dna);

                  return (
                    <div key={subElementName} className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
                      <div className="text-xs font-medium text-slate-500 md:w-32">
                        {subElementName}
                      </div>
                      <div className="flex-1">
                        <GeneratedChip
                          rerollId={rerollId}
                          content={initialContent}
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

