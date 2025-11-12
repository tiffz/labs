import React from 'react';
import type { StoryDNA } from '../types';
import { GeneratedChip } from './GeneratedChip';
import { Tooltip } from './Tooltip';

interface CoreElementsProps {
  dna: StoryDNA;
  onReroll: (rerollId: string) => void;
}

export const CoreElements: React.FC<CoreElementsProps> = ({ dna, onReroll }) => {
  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 p-4 md:p-6">
      <h3 className="text-base font-bold text-slate-800 mb-3">Core Story Elements</h3>
      <div className="space-y-2.5">
        <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-3">
          <div className="text-xs font-medium text-slate-600 md:w-28 flex items-center gap-1">
            The Hero
            <Tooltip content="The main character of your story." />
          </div>
          <div className="flex-1">
            <GeneratedChip rerollId="hero" content={dna.hero} onReroll={onReroll} />
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-3">
          <div className="text-xs font-medium text-slate-600 md:w-28 flex items-center gap-1">
            Primary Flaw
            <Tooltip content="The hero's main weakness or blind spot, tied to the theme." />
          </div>
          <div className="flex-1">
            <GeneratedChip rerollId="flaw" content={dna.flaw} onReroll={onReroll} />
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-3">
          <div className="text-xs font-medium text-slate-600 md:w-28 flex items-center gap-1">
            The Nemesis
            <Tooltip content="The villain or antagonistic force." />
          </div>
          <div className="flex-1">
            <GeneratedChip rerollId="nemesis" content={dna.nemesis} onReroll={onReroll} />
          </div>
        </div>
      </div>
    </div>
  );
};

