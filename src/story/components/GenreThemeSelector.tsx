import React from 'react';
import { genres, themes } from '../data/genres';
import { RadioOption } from './RadioOption';

interface GenreThemeSelectorProps {
  selectedGenre: string;
  selectedTheme: string;
  onGenreChange: (genre: string) => void;
  onThemeChange: (theme: string) => void;
  onGenerate: () => void;
}

export const GenreThemeSelector: React.FC<GenreThemeSelectorProps> = ({
  selectedGenre,
  selectedTheme,
  onGenreChange,
  onThemeChange,
  onGenerate,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 md:p-8">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Select a Genre:
          </label>
          <div className="flex flex-wrap gap-2">
            <RadioOption
              group="genre"
              value="Random"
              isChecked={selectedGenre === 'Random'}
              onChange={() => onGenreChange('Random')}
            />
            {Object.keys(genres).map((genre) => (
              <RadioOption
                key={genre}
                group="genre"
                value={genre}
                isChecked={selectedGenre === genre}
                onChange={() => onGenreChange(genre)}
                tooltip={genres[genre]}
              />
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Select a Theme:
          </label>
          <div className="flex flex-wrap gap-2">
            <RadioOption
              group="theme"
              value="Random"
              isChecked={selectedTheme === 'Random'}
              onChange={() => onThemeChange('Random')}
            />
            {themes.map((theme) => (
              <RadioOption
                key={theme}
                group="theme"
                value={theme}
                isChecked={selectedTheme === theme}
                onChange={() => onThemeChange(theme)}
              />
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={onGenerate}
        className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg text-base transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        Generate Story Plot
      </button>
    </div>
  );
};

