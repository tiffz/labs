import React, { useState } from 'react';
import type { StoryDNA } from './types';
import { generateStoryDNA, getNewSuggestion } from './data/storyGenerator';
import { Sidebar } from './components/Sidebar';
import { FixedStoryHeader } from './components/FixedStoryHeader';
import { BeatChart } from './components/BeatChart';
import './styles/story.css';

const App: React.FC = () => {
  const [storyDNA, setStoryDNA] = useState<StoryDNA | null>(null);
  const [selectedGenre, setSelectedGenre] = useState('Random');

  const handleGenerate = (genre: string = selectedGenre) => {
    const newDNA = generateStoryDNA(genre, 'Random');
    setStoryDNA(newDNA);
  };

  const handleReroll = (rerollId: string) => {
    if (!storyDNA) return;

    // Handle genre reroll - regenerate entire story
    if (rerollId === 'genre') {
      // Generate a completely new story
      const newDNA = generateStoryDNA('Random', 'Random');
      setStoryDNA(newDNA);
      return;
    }
    
    // Handle theme reroll - just change the theme
    if (rerollId === 'theme') {
      const newDNA = { ...storyDNA };
      const newTheme = getNewSuggestion('theme', storyDNA);
      newDNA.theme = newTheme;
      setStoryDNA(newDNA);
      return;
    }

    const newContent = getNewSuggestion(rerollId, storyDNA);

    // Create new DNA with updated content
    const updatedDNA = { ...storyDNA };
    
    // Update core DNA and extract character names if needed
    if (rerollId === 'hero') {
      updatedDNA.hero = newContent;
      // Extract just the name part for heroName (before the comma)
      const namePart = newContent.split(',')[0];
      updatedDNA.heroName = namePart;
      
      // Clear all generated content that uses the hero name
      // This forces regeneration with the new name
      updatedDNA.generatedContent = {};
    } else if (rerollId === 'flaw') {
      updatedDNA.flaw = newContent;
    } else if (rerollId === 'nemesis') {
      updatedDNA.nemesis = newContent;
      // Extract just the name part for nemesisName
      const namePart = newContent.split(',')[0];
      updatedDNA.nemesisName = namePart;
      
      // Clear generated content that uses the nemesis name
      updatedDNA.generatedContent = Object.fromEntries(
        Object.entries(updatedDNA.generatedContent).filter(
          ([key]) => !key.includes('Nemesis') && !key.includes('BadGuysCloseIn') && !key.includes('Finale')
        )
      );
    } else {
      // Store the new content in the generatedContent cache
      updatedDNA.generatedContent = {
        ...updatedDNA.generatedContent,
        [rerollId]: newContent,
      };
    }
    
    setStoryDNA(updatedDNA);
  };

  return (
    <div className="min-h-screen bg-orange-50">
      {/* Sidebar */}
      <Sidebar 
        selectedGenre={selectedGenre}
        onGenreChange={setSelectedGenre}
        onGenerate={() => handleGenerate()}
      />

      {/* Main Content Area */}
      <div className="ml-80">
        {storyDNA ? (
          <>
            {/* Fixed Header with Story Summary */}
            <FixedStoryHeader dna={storyDNA} onReroll={handleReroll} />

            {/* Beat Chart */}
            <main className="px-6 py-6">
              <BeatChart dna={storyDNA} onReroll={handleReroll} />
            </main>
          </>
        ) : (
          /* Welcome Screen */
          <div className="flex items-center justify-center h-screen">
            <div className="text-center max-w-md px-6">
              <img 
                src="/icons/cat-android.png" 
                alt="Save the Cat" 
                className="w-32 h-32 mx-auto mb-6"
              />
              <h2 className="text-3xl font-bold text-slate-800 mb-4">
                Welcome to Save the Cat!
              </h2>
              <p className="text-lg text-slate-600 mb-6">
                Select a genre from the sidebar, then click &ldquo;Generate Story&rdquo; to create a
                random plot using the 15-beat Save the Cat! structure.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;

