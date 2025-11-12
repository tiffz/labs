/**
 * Story Generator - Powered by the Kimberly System
 * 
 * This version fixes:
 * 1. Reroll bug - stores all generated content to prevent unwanted regeneration
 * 2. Part of speech consistency - flaws are always nouns
 * 3. Hero naming - includes full name and reuses it throughout
 */

import type { StoryDNA } from '../types';
import { genres, themes } from './genres';
import { k } from '../kimberly';

/**
 * Generates a complete StoryDNA object with all initial values
 */
export function generateStoryDNA(selectedGenre: string, selectedTheme: string): StoryDNA {
  // Pick random genre/theme if "Random" selected
  const genresList = Object.keys(genres);
  const genre = selectedGenre === 'Random' ? k.pick(genresList) : selectedGenre;
  const theme = selectedTheme === 'Random' ? k.pick(themes) : selectedTheme;

  // Generate two different settings for Act 1 and Act 2
  const initialSetting = k.act1Setting();
  const act2Setting = k.differentAct2Setting(initialSetting);

  // Generate the hero name and full description
  const heroName = k.fullName();
  const heroAdjective = k.pick([
    'cynical', 'naive', 'disgraced', 'cautious', 'washed-up',
    'ambitious', 'lonely', 'burnt-out', 'idealistic', 'ruthless',
    'clumsy', 'charismatic', 'grumpy', 'optimistic'
  ]);
  const heroOccupation = k.worker();
  const hero = `${heroName}, a ${heroAdjective} ${heroOccupation}`;

  // Generate names for all other characters
  const bStoryCharacterName = k.fullName();
  const bStoryCharacterType = k.bStoryCharacter();
  const bStoryCharacter = `${bStoryCharacterName}, a ${bStoryCharacterType}`;

  const nemesisName = k.fullName();
  const { adjective: nemesisAdjective, noun: nemesisNoun } = generateNemesisParts();
  const nemesis = `${nemesisName}, a ${nemesisAdjective} ${nemesisNoun}`;

  const minorCharacterName = k.fullName();

  // Initialize DNA with empty generated content storage
  return {
    genre,
    theme,
    hero,
    heroName,
    flaw: k.themeBasedFlaw(theme),
    initialSetting,
    act2Setting,
    bStoryCharacter,
    bStoryCharacterName,
    nemesis,
    nemesisName,
    minorCharacterName,
    generatedContent: {}, // Will be populated as content is generated
  };
}

/**
 * Generates nemesis adjective and noun parts (without name)
 */
function generateNemesisParts(): { adjective: string; noun: string } {
  const nemesisAdjectives = [
    'megalomaniac', 'shadowy', 'twisted', 'unseen', 'ancient',
    'charismatic', 'deceitful', 'brilliant', 'obsessed', 'ruthless',
    'fanatical', 'corrupt', 'vain', 'petty'
  ];
  
  const nemesisNouns = [
    'CEO', 'government agent', 'cult leader', 'psychological force',
    'cosmic horror', 'rival scientist', 'family matriarch', 'AI',
    'corporation', 'former mentor', 'conspiracy', 'political opponent'
  ];
  
  return {
    adjective: k.pick(nemesisAdjectives),
    noun: k.pick(nemesisNouns)
  };
}


/**
 * Gets a new suggestion for a reroll ID
 * This function GENERATES new content - it does not retrieve stored content
 * Returns an object with the new content and any updated character names
 */
export function getNewSuggestion(rerollId: string, dna: StoryDNA): string {
  // Theme
  if (rerollId === 'theme') {
    return k.pick(themes);
  }
  
  // Core DNA elements
  if (rerollId === 'hero') {
    const heroName = k.fullName();
    const heroAdjective = k.pick([
      'cynical', 'naive', 'disgraced', 'cautious', 'washed-up',
      'ambitious', 'lonely', 'burnt-out', 'idealistic', 'ruthless',
      'clumsy', 'charismatic', 'grumpy', 'optimistic'
    ]);
    const heroOccupation = k.worker();
    return `${heroName}, a ${heroAdjective} ${heroOccupation}`;
  }
  
  if (rerollId === 'flaw') {
    return k.themeBasedFlaw(dna.theme);
  }
  
  if (rerollId === 'nemesis') {
    const nemesisName = k.fullName();
    const { adjective, noun } = generateNemesisParts();
    return `${nemesisName}, a ${adjective} ${noun}`;
  }

  // Genre Elements - use the genreElementMap
  if (k.genreElementMap[rerollId]) {
    return k.genreElementMap[rerollId]();
  }

  // Beat Sub-Elements
  if (rerollId.startsWith('beat_')) {
    return generateBeatContent(rerollId, dna);
  }

  console.warn(`Unknown rerollId: ${rerollId}`);
  return 'Error';
}

/**
 * Gets content for a reroll ID, using stored content if available, otherwise generating new
 * This is what components should call to get consistent content
 */
export function getContent(rerollId: string, dna: StoryDNA): string {
  // Check if we have stored content for this ID
  if (dna.generatedContent[rerollId]) {
    return dna.generatedContent[rerollId];
  }

  // Generate new content and store it
  const content = getNewSuggestion(rerollId, dna);
  dna.generatedContent[rerollId] = content;
  return content;
}

/**
 * Generates content for specific story beats
 */
function generateBeatContent(beatId: string, dna: StoryDNA): string {
  // Parse the beat ID to extract beat name and sub-element
  const parts = beatId.split('_');
  if (parts.length < 3) {
    return 'Error: Invalid beat ID';
  }

  // Beat-specific generation - using hero NAME not full description
  // Note: beatName and subElement could be extracted from parts if needed for debugging
  switch (beatId) {
    // Opening Image
    case 'beat_OpeningImage_VisualSnapshot':
      return `${k.capitalize(k.openingAction())} in ${dna.initialSetting}.`;
    
    case 'beat_OpeningImage_FlawShown':
      return `Their ${dna.flaw} is on full display.`;

    // Theme Stated
    case 'beat_ThemeStated_MinorCharacter':
      return `${dna.minorCharacterName}, a ${k.minorCharacter()}...`;
    
    case 'beat_ThemeStated_DismissedAdvice':
      return `Says something wise about ${dna.theme} that ${dna.heroName} ignores.`;

    // Setup
    case 'beat_Setup_StasisDeath':
      return `${dna.heroName} is ${k.stasisIsDeath()}.`;
    
    case 'beat_Setup_StatedGoalWant':
      return `${dna.heroName} wants to ${k.statedGoal()}.`;

    // Catalyst
    case 'beat_Catalyst_IncitingIncident':
      return k.capitalize(k.catalystEvent()) + '.';

    // Debate
    case 'beat_Debate_CoreQuestion':
      return `${dna.heroName} ${k.debateQuestion()}`;

    // Break Into 2
    case 'beat_BreakInto2_NewWorld':
      return `${dna.heroName} enters the ${dna.act2Setting}.`;
    
    case 'beat_BreakInto2_WrongDecision':
      return `Actively chooses this new path based on 'Want', not 'Need'.`;

    // B Story
    case 'beat_BStory_NewCharacter':
      return `${dna.bStoryCharacterName} is introduced.`;
    
    case 'beat_BStory_ThemeEmbodied':
      return `${dna.bStoryCharacterName} represents the lesson of ${dna.theme}.`;

    // Fun and Games
    case 'beat_FunandGames_PromiseofPremise':
      return k.capitalize(k.promiseOfPremise()) + '.';
    
    case 'beat_FunandGames_SuccessFailure':
      return k.capitalize(k.successFailure()) + '.';

    // Midpoint
    case 'beat_Midpoint_TurningPoint':
      return k.capitalize(k.midpointEvent()) + '.';
    
    case 'beat_Midpoint_StakesRaised':
      return k.capitalize(k.stakesRaised()) + '.';

    // Bad Guys Close In
    case 'beat_BadGuysCloseIn_ExternalPressure':
      return `${dna.nemesisName} applies direct force.`;
    
    case 'beat_BadGuysCloseIn_InternalPressure':
      return `${dna.heroName}'s ${dna.flaw} makes things worse.`;

    // All Is Lost
    case 'beat_AllIsLost_WhiffofDeath':
      return k.capitalize(k.whiffOfDeath()) + '.';
    
    case 'beat_AllIsLost_RockBottom':
      return k.capitalize(k.rockBottom()) + '.';

    // Dark Night of the Soul
    case 'beat_DarkNightoftheSoul_MomentofReflection':
      return `${dna.heroName} ${k.reflection()}.`;
    
    case 'beat_DarkNightoftheSoul_TheEpiphany':
      return `${dna.heroName} ${k.epiphany()}.`;

    // Break Into 3
    case 'beat_BreakInto3_RightDecision':
      return `${dna.heroName} ${k.breakInto3()}.`;

    // Finale
    case 'beat_Finale_FinalBattle':
      return `${dna.heroName} confronts ${dna.nemesisName}.`;
    
    case 'beat_Finale_DigDeepDown':
      return `${dna.heroName} must overcome their ${dna.flaw} to win.`;
    
    case 'beat_Finale_HighStakes':
      return k.capitalize(k.finaleStake()) + '.';

    // Final Image
    case 'beat_FinalImage_MirroredImage':
      return k.capitalize(k.finalImage()) + '.';
    
    case 'beat_FinalImage_Transformation':
      return `${dna.heroName} now acts with an understanding of ${dna.theme}.`;

    default:
      // Generic fallback for any unmapped beats
      return k.capitalize(k.pick([
        k.openingAction(),
        k.catalystEvent(),
        k.reflection(),
        k.epiphany(),
        k.midpointEvent(),
      ])) + '.';
  }
}
