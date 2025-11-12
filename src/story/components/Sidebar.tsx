import React, { useState } from 'react';
import { genres } from '../data/genres';
import { RadioOption } from './RadioOption';

interface SidebarProps {
  selectedGenre: string;
  onGenreChange: (genre: string) => void;
  onGenerate: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ selectedGenre, onGenreChange, onGenerate }) => {
  const [tipIndex, setTipIndex] = useState(0);
  
  const tips = [
    'Click the dice icon to reroll one option',
    'Reroll any element to get new ideas',
    'Rerolls keep other elements the same, unless they\'re dependent',
    'Genre reroll regenerates the whole story',
    'Try different combinations to find your story'
  ];
  
  const handleRerollTip = () => {
    setTipIndex((prev) => (prev + 1) % tips.length);
  };
  return (
    <aside className="w-80 bg-gradient-to-b from-orange-50/80 via-pink-50/40 to-orange-50/80 border-r border-orange-200 h-screen overflow-y-auto fixed left-0 top-0 shadow-sm backdrop-blur-sm">
      <div className="p-6 space-y-4">
        {/* Logo and Title */}
        <div className="text-center pb-3 border-b border-orange-200">
          <img 
            src="/icons/cat-android.png" 
            alt="Save the Cat" 
            className="w-16 h-16 mx-auto mb-2"
          />
          <h1 className="text-2xl font-bold text-slate-800 mb-1">
            Save the Cat!
          </h1>
          <p className="text-sm text-slate-600 font-medium">Story Generator</p>
        </div>

        {/* About Section */}
        <div className="bg-white/70 backdrop-blur rounded-lg p-3 border border-orange-200">
          <p className="text-xs text-slate-700 leading-relaxed">
            Generates random story plots using the 15-beat Save the Cat! structure.{' '}
            <a
              href="https://www.jessicabrody.com/2020/11/how-to-write-your-novel-using-the-save-the-cat-beat-sheet/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-600 hover:text-orange-700 font-medium underline whitespace-nowrap"
            >
              Learn more.
            </a>
          </p>
        </div>

        {/* Genre Selection */}
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-2">
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

        {/* Generate Button */}
        <button
          onClick={onGenerate}
          className="w-full bg-gradient-to-br from-orange-500 via-orange-500 to-pink-500/80 hover:from-orange-600 hover:via-orange-600 hover:to-pink-600/80 text-white font-bold py-2.5 px-6 rounded-lg text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 shadow-sm hover:shadow-md"
        >
          Generate Story
        </button>

        {/* Interactive Tip Demo */}
        <div className="bg-white/70 backdrop-blur rounded-lg p-3 border border-orange-200">
          <div className="flex items-center gap-2">
            <button
              onClick={handleRerollTip}
              className="flex items-center justify-center w-5 h-5 rounded bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-orange-400 flex-shrink-0"
              aria-label="Get another tip"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height={14}
                viewBox="0 -960 960 960"
                width={14}
                fill="currentColor"
              >
                <path d="M220-160q-24 0-42-18t-18-42v-520q0-24 18-42t42-18h520q24 0 42 18t18 42v520q0 24-18 42t-42 18H220Zm0-60h520v-520H220v520Zm170-110q21 0 35.5-14.5T440-380q0-21-14.5-35.5T390-430q-21 0-35.5 14.5T340-380q0 21 14.5 35.5T390-330Zm180 0q21 0 35.5-14.5T620-380q0-21-14.5-35.5T570-430q-21 0-35.5 14.5T520-380q0 21 14.5 35.5T570-330ZM390-510q21 0 35.5-14.5T440-560q0-21-14.5-35.5T390-610q-21 0-35.5 14.5T340-560q0 21 14.5 35.5T390-510Zm180 0q21 0 35.5-14.5T620-560q0-21-14.5-35.5T570-610q-21 0-35.5 14.5T520-560q0 21 14.5 35.5T570-510ZM220-740v520-520Z" />
              </svg>
            </button>
            <span className="text-xs text-slate-700">{tips[tipIndex]}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-3 border-t border-orange-200">
          <p className="text-xs text-slate-500">
            Based on Jessica Brody&apos;s
            <br />
            <span className="font-medium">&ldquo;Save the Cat! Writes a Novel&rdquo;</span>
          </p>
        </div>
      </div>
    </aside>
  );
};

