import React, { useState } from 'react';
import type { StoryDNA } from './types';
import { generateStoryDNA, getNewSuggestion } from './data/storyGenerator';
import { regenerateElement, getLoglineProperty } from './kimberly/logline-element-mapping';
import { regenerateLoglineFromElements } from './kimberly/loglines';
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
      const newDNA = generateStoryDNA('Random', 'Random');
      setStoryDNA(newDNA);
      return;
    }
    
    // Handle theme reroll - regenerate entire story with new theme
    if (rerollId === 'theme') {
      const newDNA = generateStoryDNA(storyDNA.genre, 'Random');
      setStoryDNA(newDNA);
      return;
    }

    // Check if this is a genre element that maps to logline elements
    const loglineProperty = getLoglineProperty(storyDNA.genre, rerollId);
    
    if (loglineProperty && storyDNA.loglineElements) {
      // This is a genre element - regenerate it and update the logline
      const updatedDNA = { ...storyDNA };
      const regeneratedData = regenerateElement(storyDNA.genre, rerollId);
      
      if (regeneratedData) {
        // Update loglineElements with the regenerated data
        updatedDNA.loglineElements = {
          ...updatedDNA.loglineElements,
          [loglineProperty]: regeneratedData
        };
        
        // Regenerate the logline using the UPDATED elements (not generating new ones)
        updatedDNA.logline = regenerateLoglineFromElements(
          updatedDNA.genre,
          updatedDNA.heroName,
          updatedDNA.bStoryCharacterName,
          updatedDNA.hero.split(', ')[1] || '', // hero identity
          updatedDNA.theme,
          updatedDNA.loglineElements // Use the updated elements
        );
        
        // Clear the cached content for this element (create new object to trigger React update)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [rerollId]: _, ...remainingContent } = updatedDNA.generatedContent;
        updatedDNA.generatedContent = remainingContent;
        
        // Also update any core DNA fields that map to this logline element
        if (loglineProperty === 'incompleteness' || loglineProperty === 'sin' || 
            loglineProperty === 'obsession' || loglineProperty === 'desire' ||
            loglineProperty === 'wrongWay' || loglineProperty === 'rebelliousNature' ||
            loglineProperty === 'gift' || loglineProperty === 'underestimation') {
          updatedDNA.flaw = updatedDNA.loglineElements[loglineProperty];
        }
        if (loglineProperty === 'situation' || loglineProperty === 'monster' ||
            loglineProperty === 'journey' || loglineProperty === 'consequence' ||
            loglineProperty === 'suddenEvent' || loglineProperty === 'group' ||
            loglineProperty === 'establishment' || loglineProperty === 'mystery') {
          updatedDNA.nemesis = updatedDNA.loglineElements[loglineProperty];
        }
      }
      
      setStoryDNA(updatedDNA);
      return;
    }

    // Handle core element rerolls (hero, flaw, nemesis, etc.)
    const newContent = getNewSuggestion(rerollId, storyDNA);
    const updatedDNA = { ...storyDNA };
    
    if (rerollId === 'hero') {
      updatedDNA.hero = newContent;
      const namePart = newContent.split(',')[0];
      updatedDNA.heroName = namePart;
      
      // Regenerate logline using existing elements, just with new hero name
      updatedDNA.logline = regenerateLoglineFromElements(
        updatedDNA.genre,
        namePart,
        updatedDNA.bStoryCharacterName,
        newContent.split(', ')[1] || '',
        updatedDNA.theme,
        updatedDNA.loglineElements
      );
      
      // Clear all generated content that uses the hero name
      updatedDNA.generatedContent = {};
    } else if (rerollId === 'flaw') {
      updatedDNA.flaw = newContent;
      
      // For flaw, we need to check if it's a logline element property
      // and update the loglineElements accordingly
      let flawProperty = null;
      if (updatedDNA.genre === 'Buddy Love') flawProperty = 'incompleteness';
      else if (updatedDNA.genre === 'Monster in the House') flawProperty = 'sin';
      else if (updatedDNA.genre === 'Golden Fleece') flawProperty = 'obsession';
      else if (updatedDNA.genre === 'Out of the Bottle') flawProperty = 'desire';
      else if (updatedDNA.genre === 'Rites of Passage') flawProperty = 'wrongWay';
      else if (updatedDNA.genre === 'Whydunit') flawProperty = 'obsession';
      else if (updatedDNA.genre === 'Fool Triumphant') flawProperty = 'underestimation';
      else if (updatedDNA.genre === 'Institutionalized') flawProperty = 'rebelliousNature';
      else if (updatedDNA.genre === 'Superhero') flawProperty = 'gift';
      
      if (flawProperty && updatedDNA.loglineElements) {
        updatedDNA.loglineElements = {
          ...updatedDNA.loglineElements,
          [flawProperty]: newContent
        };
      }
      
      // Regenerate logline using updated elements
      updatedDNA.logline = regenerateLoglineFromElements(
        updatedDNA.genre,
        updatedDNA.heroName,
        updatedDNA.bStoryCharacterName,
        updatedDNA.hero.split(', ')[1] || '',
        updatedDNA.theme,
        updatedDNA.loglineElements
      );
    } else if (rerollId === 'nemesis') {
      updatedDNA.nemesis = newContent;
      const namePart = newContent.split(',')[0];
      updatedDNA.nemesisName = namePart;
      
      // For nemesis, check if it's a logline element property
      let nemesisProperty = null;
      if (updatedDNA.genre === 'Monster in the House') nemesisProperty = 'monster';
      else if (updatedDNA.genre === 'Buddy Love') nemesisProperty = 'situation';
      else if (updatedDNA.genre === 'Golden Fleece') nemesisProperty = 'journey';
      else if (updatedDNA.genre === 'Out of the Bottle') nemesisProperty = 'consequence';
      else if (updatedDNA.genre === 'Dude with a Problem') nemesisProperty = 'suddenEvent';
      else if (updatedDNA.genre === 'Whydunit') nemesisProperty = 'mystery';
      else if (updatedDNA.genre === 'Fool Triumphant') nemesisProperty = 'establishment';
      else if (updatedDNA.genre === 'Institutionalized') nemesisProperty = 'group';
      else if (updatedDNA.genre === 'Superhero') nemesisProperty = 'villain';
      
      if (nemesisProperty && updatedDNA.loglineElements) {
        updatedDNA.loglineElements = {
          ...updatedDNA.loglineElements,
          [nemesisProperty]: newContent
        };
      }
      
      // Regenerate logline using updated elements
      updatedDNA.logline = regenerateLoglineFromElements(
        updatedDNA.genre,
        updatedDNA.heroName,
        updatedDNA.bStoryCharacterName,
        updatedDNA.hero.split(', ')[1] || '',
        updatedDNA.theme,
        updatedDNA.loglineElements
      );
      
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50/60 via-pink-50/30 to-purple-50/40">
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

