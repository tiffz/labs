import React from 'react';
import type { StoryDNA } from '../types';
import { GeneratedChip } from './GeneratedChip';
import { genreElements, genreElementDescriptions } from '../data/genres';
import { getContent } from '../data/storyGenerator';
import { Tooltip } from './Tooltip';

interface FixedStoryHeaderProps {
  dna: StoryDNA;
  onReroll: (rerollId: string) => void;
}

export const FixedStoryHeader: React.FC<FixedStoryHeaderProps> = ({ dna, onReroll }) => {
  const currentGenreElements = genreElements[dna.genre] || [];

  return (
    <div className="bg-gradient-to-r from-white via-orange-50/20 to-pink-50/20 border-b border-orange-200/80 shadow-sm sticky top-0 z-10 backdrop-blur-sm">
      <div className="px-6 py-3">
        {/* Genre and Theme Row */}
        <div className="flex items-center gap-4 mb-2 pb-2 border-b border-orange-100">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              Genre:
              <Tooltip content="From Save the Cat! Writes a Novel. Ten story genres with specific conventions and elements." />
            </span>
            <span className="text-xs text-slate-800 font-medium">{dna.genre}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              Theme:
              <Tooltip content="One of the 10 universal themes from Save the Cat! Writes a Novel." />
            </span>
            <GeneratedChip rerollId="theme" content={dna.theme} onReroll={onReroll} compact inline />
          </div>
        </div>

        {/* Logline */}
        <div className="mb-3 pb-3 border-b border-orange-100">
          <div className="flex items-start gap-2">
            <span className="text-xs font-semibold text-slate-700 whitespace-nowrap flex items-center gap-1 pt-0.5">
              Logline:
              <Tooltip content="A one-sentence summary of your story based on the Save the Cat! genre template." />
            </span>
            <p className="text-xs text-slate-700 leading-relaxed italic flex-1">
              {dna.logline}
            </p>
          </div>
        </div>

        {/* Two Column Layout: Core Elements & Genre Elements */}
        <div className="flex gap-6">
          {/* Left Column: Core Story Elements */}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-800 mb-2">Core Story Elements</div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <span className="text-xs font-medium text-slate-600 whitespace-nowrap flex items-center gap-1 w-16 flex-shrink-0 pt-1">
                  Hero
                  <Tooltip content="The main character of your story." />
                </span>
                <div className="flex-1 min-w-0">
                  <GeneratedChip rerollId="hero" content={dna.hero} onReroll={onReroll} compact />
                </div>
              </div>
              <div className="flex gap-2">
                <span className="text-xs font-medium text-slate-600 whitespace-nowrap flex items-center gap-1 w-16 flex-shrink-0 pt-1">
                  Flaw
                  <Tooltip content="The hero's main weakness or blind spot, tied to the theme." />
                </span>
                <div className="flex-1 min-w-0">
                  <GeneratedChip rerollId="flaw" content={dna.flaw} onReroll={onReroll} compact />
                </div>
              </div>
              <div className="flex gap-2">
                <span className="text-xs font-medium text-slate-600 whitespace-nowrap flex items-center gap-1 w-16 flex-shrink-0 pt-1">
                  Nemesis
                  <Tooltip content="The villain or antagonistic force." />
                </span>
                <div className="flex-1 min-w-0">
                  <GeneratedChip rerollId="nemesis" content={dna.nemesis} onReroll={onReroll} compact />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Key Genre Elements */}
          {currentGenreElements.length > 0 && (
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-slate-800 mb-2">Key Genre Elements</div>
              <div className="space-y-2">
                {currentGenreElements.map((elementName) => {
                  const content = getContent(elementName, dna);
                  const description = genreElementDescriptions[elementName] || 'A key component of this story type.';
                  // Calculate label width based on longest element name
                  const maxLabelWidth = Math.max(...currentGenreElements.map(el => el.length)) * 7 + 20; // rough char width + tooltip
                  return (
                    <div key={elementName} className="flex gap-2">
                      <span 
                        className="text-xs font-medium text-slate-600 whitespace-nowrap flex items-center gap-1 flex-shrink-0 pt-1"
                        style={{ minWidth: `${maxLabelWidth}px` }}
                      >
                        {elementName}
                        <Tooltip content={description} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <GeneratedChip
                          rerollId={elementName}
                          content={content}
                          onReroll={onReroll}
                          compact
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

