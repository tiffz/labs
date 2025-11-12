import React from 'react';
import type { StoryDNA } from '../types';
import { genreElements, genreElementDescriptions } from '../data/genres';
import { GeneratedChip } from './GeneratedChip';
import { Tooltip } from './Tooltip';
import { getContent } from '../data/storyGenerator';

interface GenreElementsProps {
  dna: StoryDNA;
  onReroll: (rerollId: string) => void;
}

export const GenreElements: React.FC<GenreElementsProps> = ({ dna, onReroll }) => {
  const currentGenreElements = genreElements[dna.genre] || [];

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 p-4 md:p-6">
      <h3 className="text-base font-bold text-slate-800 mb-3">Key Genre Elements</h3>
      <div className="space-y-2.5">
        {currentGenreElements.map((elementName) => {
          const description =
            genreElementDescriptions[elementName] || 'A key component of this story type.';
          const content = getContent(elementName, dna);

          return (
            <div key={elementName} className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-3">
              <div className="text-xs font-medium text-slate-600 md:w-28 flex items-center gap-1">
                {elementName}
                <Tooltip content={description} />
              </div>
              <div className="flex-1">
                <GeneratedChip
                  rerollId={elementName}
                  content={content}
                  onReroll={onReroll}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

