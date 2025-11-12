import React from 'react';
import type { StoryDNA } from '../types';
import { genres } from '../data/genres';

interface StoryHeaderProps {
  dna: StoryDNA;
}

export const StoryHeader: React.FC<StoryHeaderProps> = ({ dna }) => {
  return (
    <div className="bg-indigo-600 rounded-xl shadow-md p-4 md:p-6 text-center text-white">
      <h2 className="text-xl md:text-2xl font-bold mb-2">{dna.genre}</h2>
      <p className="text-indigo-100 text-xs md:text-sm leading-relaxed max-w-3xl mx-auto mb-3">
        {genres[dna.genre]}
      </p>
      <div className="inline-flex items-center gap-2 bg-indigo-500 rounded-full px-3 py-1">
        <span className="text-xs font-medium">Theme: {dna.theme}</span>
      </div>
    </div>
  );
};

