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

  // Clear character names from previous story
  k.clearCharacterNames();
  
  // Reset Buddy Love cache for new story
  k.resetBuddyLoveCache();
  
  // Generate the hero using Kimberly system (full name on first mention)
  const heroName = k.KimberlySmith('hero'); // Full name: "Kimberly Smith"
  
  // Get genre-specific adjective (e.g., "inadequate" for Buddy Love, "culpable" for Monster in the House)
  const genreSpecificAdjective = k.genreSpecificHeroAdjective(genre);
  
  // Optional: Add a second opinion adjective for more depth (30% chance, max 2 adjectives total)
  const additionalAdjectives: string[] = [];
  if (Math.random() < 0.3) {
    const secondaryAdjectives = [
      'cynical', 'naive', 'cautious', 'burnt-out', 'grumpy', 'bitter',
      'stubborn', 'selfish', 'pessimistic', 'impulsive', 'insecure',
      'defensive', 'withdrawn', 'jaded', 'timid', 'charismatic',
      'compassionate', 'resourceful', 'courageous', 'creative',
      'empathetic', 'resilient', 'principled', 'passionate', 'humble',
      'mysterious', 'eccentric', 'pragmatic', 'analytical', 'spontaneous',
      'independent', 'sensitive', 'intense', 'quiet', 'meticulous', 'serious'
    ];
    additionalAdjectives.push(k.pick(secondaryAdjectives));
  }
  
  const heroIdentityRaw = k.heroIdentity(); // Uses weighted system (jobs, kids, animals, etc.)
  
  // Combine adjectives following proper order: genre-specific (opinion) + additional (opinion) + identity
  const allAdjectives = [genreSpecificAdjective, ...additionalAdjectives].join(' ');
  const hero = `${heroName}, ${k.a(`${allAdjectives} ${heroIdentityRaw}`)}`;

  // Generate names for all other characters
  const bStoryCharacterName = k.KimberlySmith('bStory');
  
  // For Buddy Love, use genre-specific "uniquely unlikely partner" concept
  const bStoryCharacterType = genre === 'Buddy Love' 
    ? k.uniquelyUnlikelyPartner()
    : k.bStoryCharacter();
  const bStoryCharacter = `${bStoryCharacterName}, ${k.a(bStoryCharacterType)}`;

  // Generate nemesis using genre-specific logic
  const nemesis = k.genreSpecificNemesis(genre);
  // Extract name if it's a person (contains a comma)
  const nemesisName = nemesis.includes(',') ? nemesis.split(',')[0] : '';

  const minorCharacterName = k.KimberlySmith('minor');

  // Generate logline WITH elements - this is the source of truth for ALL genres
  const heroIdentity = `${allAdjectives} ${heroIdentityRaw}`;
  const flaw = k.themeBasedFlaw(theme);
  
  // Generate logline with elements for ALL genres
  const loglineResult = k.generateLoglineWithElements(
    genre,
    heroName,
    bStoryCharacterName,
    nemesis,
    heroIdentity,
    theme
  );
  
  const logline = loglineResult.logline;
  const loglineElements = loglineResult.elements;
  
  // For Buddy Love, override some fields based on logline elements
  if (genre === 'Buddy Love') {
    const heroPossessive = k.his('hero');
    const heroObject = k.him('hero');
    const completion = loglineElements.completion
      .replace(/{object}/g, heroObject)
      .replace(/{possessive}/g, heroPossessive);
    const bStoryCharacterFromLogline = `${bStoryCharacterName}, who ${completion}`;
    
    return {
      genre,
      theme,
      hero,
      heroName,
      flaw: loglineElements.incompleteness, // Use incompleteness as flaw
      initialSetting,
      act2Setting,
      bStoryCharacter: bStoryCharacterFromLogline,
      bStoryCharacterName,
      nemesis: loglineElements.situation, // Use situation as nemesis
      nemesisName: '',
      minorCharacterName,
      logline,
      loglineElements,
      generatedContent: {},
    };
  }
  
  // For all other genres, use standard fields
  return {
    genre,
    theme,
    hero,
    heroName,
    flaw,
    initialSetting,
    act2Setting,
    bStoryCharacter,
    bStoryCharacterName,
    nemesis,
    nemesisName,
    minorCharacterName,
    logline,
    loglineElements,
    generatedContent: {},
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
    // Clear and regenerate hero name
    k.clearCharacterNames();
    const heroName = k.KimberlySmith('hero');
    
    // Use genre-specific adjective
    const genreSpecificAdjective = k.genreSpecificHeroAdjective(dna.genre);
    
    // Optional: Add a second opinion adjective for more depth (30% chance, max 2 adjectives total)
    const additionalAdjectives: string[] = [];
    if (Math.random() < 0.3) {
      const secondaryAdjectives = [
        'cynical', 'naive', 'cautious', 'burnt-out', 'grumpy', 'bitter',
        'stubborn', 'selfish', 'pessimistic', 'impulsive', 'insecure',
        'defensive', 'withdrawn', 'jaded', 'timid', 'charismatic',
        'compassionate', 'resourceful', 'courageous', 'creative',
        'empathetic', 'resilient', 'principled', 'passionate', 'humble',
        'mysterious', 'eccentric', 'pragmatic', 'analytical', 'spontaneous',
        'independent', 'sensitive', 'intense', 'quiet', 'meticulous', 'serious'
      ];
      additionalAdjectives.push(k.pick(secondaryAdjectives));
    }
    
    const heroIdentityRaw = k.heroIdentity();
    const allAdjectives = [genreSpecificAdjective, ...additionalAdjectives].join(' ');
    return `${heroName}, ${k.a(`${allAdjectives} ${heroIdentityRaw}`)}`;
  }
  
  if (rerollId === 'flaw') {
    return k.themeBasedFlaw(dna.theme);
  }
  
  if (rerollId === 'nemesis') {
    // Use genre-specific nemesis
    return k.genreSpecificNemesis(dna.genre);
  }

  // Genre Elements - use loglineElements if available for ALL genres
  if (dna.loglineElements && Object.keys(dna.loglineElements).length > 0) {
    // Helper to replace ALL pronouns and verb forms
    const replacePronouns = (text: string) => {
      const heroSubject = k.he('hero');
      const heroObject = k.him('hero');
      const heroPossessive = k.his('hero');
      const heroReflexive = k.himself('hero');
      const isVerb = heroSubject === 'they' ? 'are' : 'is';
      const hasVerb = heroSubject === 'they' ? 'have' : 'has';
      
      return text
        .replace(/{subject}/g, heroSubject)
        .replace(/{object}/g, heroObject)
        .replace(/{possessive}/g, heroPossessive)
        .replace(/{reflexive}/g, heroReflexive)
        .replace(/{is}/g, isVerb)
        .replace(/{has}/g, hasVerb);
    };
    
    // Map genre element IDs to loglineElements properties
    switch (dna.genre) {
      case 'Buddy Love':
        if (rerollId === 'The Incomplete Hero') return dna.loglineElements.incompleteness;
        if (rerollId === 'The Counterpart') return `${dna.bStoryCharacterName}, who ${replacePronouns(dna.loglineElements.completion)}`;
        if (rerollId === 'The Complication') return dna.loglineElements.complication;
        break;
      
      case 'Monster in the House':
        if (rerollId === 'The Monster') return dna.loglineElements.monster;
        if (rerollId === 'The House') return dna.loglineElements.house;
        if (rerollId === 'The Sin') return dna.loglineElements.sin;
        break;
      
      case 'Golden Fleece':
        if (rerollId === 'The Road') return dna.loglineElements.journey;
        if (rerollId === 'The Team') return dna.loglineElements.team;
        if (rerollId === 'The Prize') return dna.loglineElements.prize;
        break;
      
      case 'Out of the Bottle':
        if (rerollId === 'The Wish') return dna.loglineElements.wish;
        if (rerollId === 'The Spell') return replacePronouns(dna.loglineElements.consequence);
        if (rerollId === 'The Lesson') return dna.loglineElements.lesson;
        break;
      
      case 'Dude with a Problem':
        if (rerollId === 'The Sudden Event') return dna.loglineElements.suddenEvent;
        if (rerollId === 'The Life or Death Battle') return `save ${replacePronouns(dna.loglineElements.stakes)}`;
        break;
      
      case 'Rites of Passage':
        if (rerollId === 'The Life Problem') return dna.loglineElements.lifeCrisis;
        if (rerollId === 'The Wrong Way') return dna.loglineElements.wrongWay;
        break;
      
      case 'Whydunit':
        if (rerollId === 'The Secret') return dna.loglineElements.mystery;
        if (rerollId === 'The Dark Turn') return replacePronouns(dna.loglineElements.darkTurn);
        break;
      
      case 'Fool Triumphant':
        if (rerollId === 'The Establishment') return dna.loglineElements.establishment;
        if (rerollId === 'The Transmutation') return dna.loglineElements.underestimation;
        break;
      
      case 'Institutionalized':
        if (rerollId === 'The Group') return dna.loglineElements.group;
        if (rerollId === 'The Choice') return dna.loglineElements.choice;
        break;
      
      case 'Superhero':
        if (rerollId === 'The Power') return dna.loglineElements.power;
        if (rerollId === 'The Nemesis') return dna.loglineElements.villain;
        if (rerollId === 'The Curse') return replacePronouns(dna.loglineElements.curse);
        break;
    }
  }
  
  // Fallback to genreElementMap if loglineElements not available
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
      return `${k.KimberlySmith('hero')} ${k.openingAction()} in ${k.a(k.scenicLocation())}.`;
    
    case 'beat_OpeningImage_FlawShown':
      return `Their ${dna.flaw} ${k.flawShown()}.`;

    // Theme Stated
    case 'beat_ThemeStated_MinorCharacter':
      return `${k.KimberlySmith('minor')}, ${k.a(k.minorCharacter())}...`;
    
    case 'beat_ThemeStated_DismissedAdvice':
      return `Says ${k.themeSpecificAdvice(dna.theme)} ${k.dismissedAdvice().replace('{hero}', k.Kimberly('hero'))}.`;

    // Setup
    case 'beat_Setup_StasisDeath':
      return `${k.Kimberly('hero')} is ${k.stasisIsDeath()}.`;
    
    case 'beat_Setup_StatedGoalWant':
      return `${k.Kimberly('hero')} wants to ${k.statedGoal()}.`;

    // Catalyst
    case 'beat_Catalyst_IncitingIncident':
      return k.capitalize(k.genreSpecificCatalyst(dna.genre)) + '.';

    // Debate
    case 'beat_Debate_CoreQuestion':
      return `${k.Kimberly('hero')} ${k.debateQuestion()}`;

    // Break Into 2
    case 'beat_BreakInto2_NewWorld':
      return `${k.Kimberly('hero')} enters the ${dna.act2Setting}.`;
    
    case 'beat_BreakInto2_WrongDecision':
      return `${k.Kimberly('hero')} ${k.wrongDecision()}.`;

    // B Story
    case 'beat_BStory_NewCharacter':
      return `${k.KimberlySmith('bStory')} is introduced.`;
    
    case 'beat_BStory_ThemeEmbodied':
      return `${k.Kimberly('bStory')} ${k.themeEmbodied().replace('{theme}', dna.theme).replace('{hero}', k.Kimberly('hero'))}.`;

    // Fun and Games
    case 'beat_FunandGames_PromiseofPremise':
      return k.capitalize(k.promiseOfPremise()) + '.';
    
    case 'beat_FunandGames_SuccessFailure':
      return k.capitalize(k.successFailure()) + '.';

    // Midpoint
    case 'beat_Midpoint_TurningPoint':
      return k.capitalize(k.genreSpecificMidpoint(dna.genre)) + '.';
    
    case 'beat_Midpoint_StakesRaised':
      return k.capitalize(k.stakesRaised()) + '.';

    // Bad Guys Close In
    case 'beat_BadGuysCloseIn_ExternalPressure':
      return `${dna.nemesisName} applies direct force.`;
    
    case 'beat_BadGuysCloseIn_InternalPressure':
      return `${k.Kimberly('hero')}'s ${dna.flaw} makes things worse.`;

    // All Is Lost
    case 'beat_AllIsLost_WhiffofDeath':
      return k.capitalize(k.whiffOfDeath()) + '.';
    
    case 'beat_AllIsLost_RockBottom':
      return k.capitalize(k.rockBottom()) + '.';

    // Dark Night of the Soul
    case 'beat_DarkNightoftheSoul_MomentofReflection':
      return `${k.Kimberly('hero')} ${k.reflection()}.`;
    
    case 'beat_DarkNightoftheSoul_TheEpiphany':
      return k.capitalize(k.themeSpecificEpiphany(dna.theme)) + '.';

    // Break Into 3
    case 'beat_BreakInto3_RightDecision':
      return `${k.Kimberly('hero')} ${k.breakInto3()}.`;

    // Finale
    case 'beat_Finale_FinalBattle':
      return `${k.Kimberly('hero')} confronts ${dna.nemesisName}.`;
    
    case 'beat_Finale_DigDeepDown':
      return `${k.Kimberly('hero')} must overcome their ${dna.flaw} to win.`;
    
    case 'beat_Finale_HighStakes':
      return k.capitalize(k.finaleStake()) + '.';

    // Final Image
    case 'beat_FinalImage_MirroredImage':
      return k.capitalize(k.finalImage()) + '.';
    
    case 'beat_FinalImage_Transformation':
      return `${k.Kimberly('hero')} now acts with an understanding of ${dna.theme}.`;

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
