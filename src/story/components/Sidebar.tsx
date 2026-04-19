import React, { useState } from 'react';
import { genres } from '../data/genres';
import { RadioOption } from './RadioOption';
import DiceIcon from '../../shared/components/DiceIcon';

interface SidebarProps {
  selectedGenre: string;
  onGenreChange: (genre: string) => void;
  onGenerate: () => void;
  /**
   * Fires on hover/focus of the Generate button so the app can warm up
   * the generator data + component chunks before the click actually lands.
   * Cheap to call repeatedly (downloads are memoised).
   */
  onGenerateIntent?: () => void;
  /** Mobile drawer: when false, sidebar is off-canvas below `md`. */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  selectedGenre,
  onGenreChange,
  onGenerate,
  onGenerateIntent,
  mobileOpen = false,
  onMobileClose,
}) => {
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
    <aside
      className={`story-sidebar-drawer w-[min(100vw,20rem)] max-w-[min(100vw,20rem)] rounded-r-2xl bg-gradient-to-b from-orange-50/90 via-pink-50/50 to-orange-50/85 border-r border-orange-200/90 h-[100dvh] min-h-0 overflow-y-auto overscroll-contain fixed left-0 top-0 z-[50] shadow-[4px_0_24px_-4px_rgba(124,45,18,0.12)] backdrop-blur-md transition-transform duration-300 ease-out md:translate-x-0 md:rounded-none md:shadow-sm ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex flex-col gap-5 p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] md:p-6 md:pb-6 md:pt-6">
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

        {/* Genre Selection — matches production: rounded pills, flex-wrap */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">
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

        <button
          type="button"
          onClick={() => {
            onGenerate();
            onMobileClose?.();
          }}
          onPointerEnter={onGenerateIntent}
          onFocus={onGenerateIntent}
          className="w-full bg-gradient-to-br from-orange-500 via-orange-500 to-pink-500/80 hover:from-orange-600 hover:via-orange-600 hover:to-pink-600/80 text-white font-bold py-2.5 px-6 rounded-lg text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 shadow-sm hover:shadow-md"
        >
          Generate Story
        </button>

        {/* Interactive Tip Demo */}
        <div className="bg-white/70 backdrop-blur rounded-lg p-3 border border-orange-200">
          <div className="flex items-center gap-2">
            <button
              onClick={handleRerollTip}
              className="flex items-center justify-center w-5 h-5 rounded bg-orange-50 text-orange-500 hover:text-orange-600 hover:bg-orange-100 transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-orange-400 flex-shrink-0"
              aria-label="Get another tip"
            >
              <DiceIcon variant="single" size={14} opacity={0.8} />
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

