import React from 'react';
import type { StoryDNA } from '../types';
import { genreElements, genreElementDescriptions } from '../data/genres';
import { GeneratedChip } from './GeneratedChip';
import { Tooltip } from './Tooltip';
import { getNewSuggestion } from '../data/storyGenerator';

interface GenreElementsProps {
  dna: StoryDNA;
  onReroll: (rerollId: string) => void;
}

export const GenreElements: React.FC<GenreElementsProps> = ({ dna, onReroll }) => {
  const currentGenreElements = genreElements[dna.genre] || [];

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 md:p-8">
      <h3 className="text-xl font-bold text-slate-800 mb-6">Key Genre Elements</h3>
      <div className="space-y-4">
        {currentGenreElements.map((elementName) => {
          const description =
            genreElementDescriptions[elementName] || 'A key component of this story type.';
          const initialContent = getNewSuggestion(elementName, dna);

          return (
            <div key={elementName} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
              <div className="text-sm font-medium text-slate-600 md:w-32 flex items-center gap-1">
                {elementName}
                <Tooltip content={description} />
              </div>
              <div className="flex-1">
                <GeneratedChip
                  rerollId={elementName}
                  content={initialContent}
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

