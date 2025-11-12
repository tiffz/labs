import React, { useState } from 'react';
import type { StoryDNA } from './types';
import { generateStoryDNA, getNewSuggestion } from './data/storyGenerator';
import { GenreThemeSelector } from './components/GenreThemeSelector';
import { StoryHeader } from './components/StoryHeader';
import { CoreElements } from './components/CoreElements';
import { GenreElements } from './components/GenreElements';
import { BeatChart } from './components/BeatChart';
import './styles/story.css';

const App: React.FC = () => {
  const [selectedGenre, setSelectedGenre] = useState('Random');
  const [selectedTheme, setSelectedTheme] = useState('Random');
  const [storyDNA, setStoryDNA] = useState<StoryDNA | null>(null);

  const handleGenerate = () => {
    const newDNA = generateStoryDNA(selectedGenre, selectedTheme);
    setStoryDNA(newDNA);
  };

  const handleReroll = (rerollId: string) => {
    if (!storyDNA) return;

    const newContent = getNewSuggestion(rerollId, storyDNA);

    // Update core DNA if needed
    if (['hero', 'flaw', 'nemesis'].includes(rerollId)) {
      setStoryDNA({
        ...storyDNA,
        [rerollId]: newContent,
      });
    } else {
      // For non-core elements, we just need to trigger a re-render
      // The component will call getNewSuggestion again
      setStoryDNA({ ...storyDNA });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-5xl">
        <header className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-1">
            Save the Cat!
          </h1>
          <p className="text-base md:text-lg text-slate-600">Random Story Generator</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate story plots using the Save the Cat! beat structure
          </p>
        </header>

        <main className="space-y-4">
          <GenreThemeSelector
            selectedGenre={selectedGenre}
            selectedTheme={selectedTheme}
            onGenreChange={setSelectedGenre}
            onThemeChange={setSelectedTheme}
            onGenerate={handleGenerate}
          />

          {storyDNA && (
            <div className="space-y-4 animate-in">
              <StoryHeader dna={storyDNA} />
              <CoreElements dna={storyDNA} onReroll={handleReroll} />
              <GenreElements dna={storyDNA} onReroll={handleReroll} />
              <BeatChart dna={storyDNA} onReroll={handleReroll} />
            </div>
          )}
        </main>

        <footer className="text-center mt-8 text-slate-500 text-xs pb-6">
          <p>
            Based on the story structures from &ldquo;Save the Cat! Writes a Novel&rdquo; by
            Jessica Brody.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;

