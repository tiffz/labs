/**
 * The Kimberly System - Logline Generation
 * 
 * Based on Save the Cat! genre logline templates
 * Source: https://savethecat.com/genre/your-logline-template-for-each-save-the-cat-genre
 * 
 * Each genre has three key elements that define its logline structure
 */

import * as LoglineElements from './logline-elements';
import { his, him, he, himself } from './realistic-names';

/**
 * Monster in the House: Monster, House, Sin
 * A culpable hero is forced to save a trapped group of people from being killed 
 * by a monster he inadvertently unleashed.
 */
export function monsterInTheHouseLogline(
  heroName: string,
  elements: LoglineElements.MonsterInTheHouseElements
): string {
  const heroPossessive = his('hero');
  const heroSubject = he('hero');
  return `When ${heroName} unleashes ${elements.monster} due to ${heroPossessive} ${elements.sin}, ${heroSubject} must ${elements.stakes} in ${elements.house}.`;
}

/**
 * Golden Fleece: Road, Team, Prize
 * A driven hero must lead a group of allies to retrieve a prized possession 
 * through a perilous journey that wasn't what the hero expected.
 */
export function goldenFleeceLogline(
  heroName: string,
  elements: LoglineElements.GoldenFleeceElements
): string {
  const heroPossessive = his('hero');
  return `Driven by ${heroPossessive} obsession, ${heroName} must lead ${elements.team} to retrieve ${elements.prize} ${elements.journey}, ${elements.challenge}.`;
}

/**
 * Out of the Bottle: Wish, Spell, Lesson
 * A covetous hero must learn to undo a spell he wished for before it turns 
 * into a curse he can't undo.
 */
export function outOfTheBottleLogline(
  heroName: string,
  elements: LoglineElements.OutOfTheBottleElements
): string {
  const heroObject = him('hero');
  const heroSubject = he('hero');
  const heroPossessive = his('hero');
  const heroReflexive = himself('hero');
  
  // Handle wishes that start with "to" vs those that don't
  // Remove "to" from wishes that start with it, then add "to wish to"
  const wishText = elements.wish.startsWith('to ') ? elements.wish.substring(3) : elements.wish;
  const wishPrefix = elements.wish.startsWith('to ') ? 'to wish to ' : 'to wish for ';

  // Replace pronouns in consequence
  const consequence = elements.consequence
    .replace(/{possessive}/g, heroPossessive)
    .replace(/{subject}/g, heroSubject)
    .replace(/{object}/g, heroObject)
    .replace(/{reflexive}/g, heroReflexive);

  return `When ${heroName}'s desire leads ${heroObject} ${wishPrefix}${wishText}, ${heroSubject} must ${elements.undoMethod} before ${consequence}.`;
}

/**
 * Dude with a Problem: Innocent Hero, Sudden Event, Life or Death
 * An unwitting hero must survive at all costs when he is dragged into a 
 * life or death situation he never saw coming and cannot escape.
 */
export function dudeWithAProblemLogline(
  heroName: string,
  elements: LoglineElements.DudeWithAProblemElements
): string {
  const heroSubject = he('hero');
  const heroPossessive = his('hero');

  // Replace pronouns in stakes
  const stakes = elements.stakes
    .replace(/{possessive}/g, heroPossessive)
    .replace(/{subject}/g, heroSubject);

  return `When ${heroName} is caught in ${elements.suddenEvent}, ${heroSubject} must ${elements.action} ${stakes} ${elements.escalation}.`;
}

/**
 * Rites of Passage: Life Problem, Wrong Way, Acceptance
 * A troubled hero's only way to overcome a spiraling life crisis is to 
 * defeat his worst enemy – himself.
 */
export function ritesOfPassageLogline(
  heroName: string,
  elements: LoglineElements.RitesOfPassageElements,
  theme: string
): string {
  const heroPossessive = his('hero');
  const heroReflexive = himself('hero');
  const heroSubject = he('hero');
  const themeLower = theme.toLowerCase();
  const mustVerb = heroSubject === 'they' ? 'must' : 'must';
  return `Facing ${elements.lifeCrisis}, ${heroName} spirals into ${elements.wrongWay}, and ${mustVerb} discover ${themeLower} to overcome ${heroPossessive} worst enemy: ${heroReflexive}.`;
}

/**
 * Buddy Love: Incomplete Hero, Counterpart, Complication
 * An inadequate hero must rise above an extremely difficult situation to be 
 * with a uniquely unlikely partner who is the only one capable of bringing him peace.
 */
/**
 * Helper to replace pronouns in completion text
 */
function replacePronouns(text: string, characterId: string = 'hero'): string {
  const possessive = his(characterId);
  const object = him(characterId);
  return text
    .replace(/{object}/g, object)
    .replace(/{possessive}/g, possessive);
}

export function buddyLoveLogline(
  heroName: string, 
  bStoryName: string,
  elements: LoglineElements.BuddyLoveElements
): string {
  const heroPossessive = his('hero');
  const heroSubject = he('hero');
  const completion = replacePronouns(elements.completion, 'hero');
  const contractionAre = heroSubject === 'they' ? "they're" : heroSubject === 'he' ? "he's" : "she's";
  
  return `Despite ${heroPossessive} ${elements.incompleteness}, ${heroName} must overcome ${elements.situation} to be with ${bStoryName}, the only person who ${completion}—even though ${contractionAre} ${elements.complication}.`;
}

/**
 * Whydunit: Detective, Secret, Dark Turn
 * A single-minded hero must find the truth to a mystery so intriguing before 
 * he is swallowed by the darkness he desperately seeks to expose.
 */
export function whydunitLogline(
  heroName: string,
  elements: LoglineElements.WhydunitElements
): string {
  const heroPossessive = his('hero');
  const heroSubject = he('hero');
  const heroObject = him('hero');
  
  // Handle verb conjugations for contractions
  const isVerb = heroSubject === 'they' ? 'are' : 'is';
  const hasVerb = heroSubject === 'they' ? 'have' : 'has';
  
  // Replace pronouns in darkTurn
  const darkTurn = elements.darkTurn
    .replace(/{possessive}/g, heroPossessive)
    .replace(/{subject}/g, heroSubject)
    .replace(/{object}/g, heroObject)
    .replace(/{is}/g, isVerb)
    .replace(/{has}/g, hasVerb);
  
  return `Obsessed by ${heroPossessive} need for truth, ${heroName} must solve ${elements.mystery} before ${darkTurn}.`;
}

/**
 * Fool Triumphant: Fool, Establishment, Transmutation
 * An innocent hero's only way to defeat the prejudices of a group is to 
 * change himself without losing what made him the group's target of disdain 
 * in the first place – his uniqueness.
 */
export function foolTriumphantLogline(
  heroName: string,
  heroIdentity: string,
  elements: LoglineElements.FoolTriumphantElements
): string {
  const heroPossessive = his('hero');
  const heroObject = him('hero');
  return `${heroName}, ${heroIdentity}, must outwit ${elements.establishment} and prove ${heroPossessive} worth without losing ${heroPossessive} ${elements.underestimation}—the very thing that makes ${heroObject} a target.`;
}

/**
 * Institutionalized: Group, Choice, Sacrifice
 * An outsider's only way to save his individuality is by going against the 
 * many who wish to integrate him into their fold.
 */
export function institutionalizedLogline(
  heroName: string,
  elements: LoglineElements.InstitutionalizedElements
): string {
  const heroPossessive = his('hero');
  const heroObject = him('hero');
  return `When ${heroName} challenges ${elements.group}, ${heroPossessive} rebellious nature forces ${heroObject} to choose: ${elements.choice}.`;
}

/**
 * Superhero: Special Power, Nemesis, Curse
 * A uniquely special hero must defeat an opponent with stronger capabilities 
 * by using the same powers that disconnect him from the people he hopes to save.
 */
export function superheroLogline(
  heroName: string,
  elements: LoglineElements.SuperheroElements
): string {
  const heroPossessive = his('hero');
  const heroSubject = he('hero');
  const heroObject = him('hero');
  
  // Replace pronouns in curse
  const curse = elements.curse
    .replace(/{possessive}/g, heroPossessive)
    .replace(/{subject}/g, heroSubject)
    .replace(/{object}/g, heroObject);
  
  // Handle powers that start with "the" - remove it when using possessive
  const power = elements.power.startsWith('the ') ? elements.power.substring(4) : elements.power;
  
  return `Burdened by ${heroPossessive} gift, ${heroName} must use ${heroPossessive} ${power} to stop ${elements.villain}, even though these same powers risk ${curse}.`;
}

/**
 * Generate logline WITH elements - returns both the logline string and the elements
 * This ensures the logline and story elements are perfectly synchronized
 */
export interface LoglineResult {
  logline: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  elements: any; // Genre-specific elements (union of all element types)
}

/**
 * Regenerate logline from existing elements (for rerolls)
 * This uses the current loglineElements instead of generating new ones
 */
export function regenerateLoglineFromElements(
  genre: string,
  heroName: string,
  bStoryName: string,
  heroIdentity: string,
  theme: string,
  elements: LoglineElements.BuddyLoveElements | 
           LoglineElements.MonsterInTheHouseElements | 
           LoglineElements.GoldenFleeceElements | 
           LoglineElements.OutOfTheBottleElements | 
           LoglineElements.DudeWithAProblemElements | 
           LoglineElements.RitesOfPassageElements | 
           LoglineElements.WhydunitElements | 
           LoglineElements.FoolTriumphantElements | 
           LoglineElements.InstitutionalizedElements | 
           LoglineElements.SuperheroElements
): string {
  switch (genre) {
    case 'Monster in the House':
      return monsterInTheHouseLogline(heroName, elements as LoglineElements.MonsterInTheHouseElements);
    case 'Golden Fleece':
      return goldenFleeceLogline(heroName, elements as LoglineElements.GoldenFleeceElements);
    case 'Out of the Bottle':
      return outOfTheBottleLogline(heroName, elements as LoglineElements.OutOfTheBottleElements);
    case 'Dude with a Problem':
      return dudeWithAProblemLogline(heroName, elements as LoglineElements.DudeWithAProblemElements);
    case 'Rites of Passage':
      return ritesOfPassageLogline(heroName, elements as LoglineElements.RitesOfPassageElements, theme);
    case 'Buddy Love':
      return buddyLoveLogline(heroName, bStoryName, elements as LoglineElements.BuddyLoveElements);
    case 'Whydunit':
      return whydunitLogline(heroName, elements as LoglineElements.WhydunitElements);
    case 'Fool Triumphant':
      return foolTriumphantLogline(heroName, heroIdentity, elements as LoglineElements.FoolTriumphantElements);
    case 'Institutionalized':
      return institutionalizedLogline(heroName, elements as LoglineElements.InstitutionalizedElements);
    case 'Superhero':
      return superheroLogline(heroName, elements as LoglineElements.SuperheroElements);
    default:
      return `${heroName} must overcome their challenges to achieve their goal.`;
  }
}

export function generateLoglineWithElements(
  genre: string,
  heroName: string,
  bStoryName: string,
  nemesis: string,
  heroIdentity: string,
  theme: string
): LoglineResult {
  switch (genre) {
    case 'Monster in the House': {
      const elements = LoglineElements.generateMonsterInTheHouseElements(nemesis);
      const logline = monsterInTheHouseLogline(heroName, elements);
      return { logline, elements };
    }
    
    case 'Golden Fleece': {
      const elements = LoglineElements.generateGoldenFleeceElements();
      const logline = goldenFleeceLogline(heroName, elements);
      return { logline, elements };
    }
    
    case 'Out of the Bottle': {
      const elements = LoglineElements.generateOutOfTheBottleElements();
      const logline = outOfTheBottleLogline(heroName, elements);
      return { logline, elements };
    }
    
    case 'Dude with a Problem': {
      const elements = LoglineElements.generateDudeWithAProblemElements(nemesis);
      const logline = dudeWithAProblemLogline(heroName, elements);
      return { logline, elements };
    }
    
    case 'Rites of Passage': {
      const elements = LoglineElements.generateRitesOfPassageElements();
      const logline = ritesOfPassageLogline(heroName, elements, theme);
      return { logline, elements };
    }
    
    case 'Buddy Love': {
      const elements = LoglineElements.generateBuddyLoveElements();
      const logline = buddyLoveLogline(heroName, bStoryName, elements);
      return { logline, elements };
    }
    
    case 'Whydunit': {
      const elements = LoglineElements.generateWhydunitElements();
      const logline = whydunitLogline(heroName, elements);
      return { logline, elements };
    }
    
    case 'Fool Triumphant': {
      const elements = LoglineElements.generateFoolTriumphantElements(nemesis);
      const logline = foolTriumphantLogline(heroName, heroIdentity, elements);
      return { logline, elements };
    }
    
    case 'Institutionalized': {
      const elements = LoglineElements.generateInstitutionalizedElements(nemesis);
      const logline = institutionalizedLogline(heroName, elements);
      return { logline, elements };
    }
    
    case 'Superhero': {
      const elements = LoglineElements.generateSuperheroElements(nemesis);
      const logline = superheroLogline(heroName, elements);
      return { logline, elements };
    }
    
    default:
      return {
        logline: `${heroName} must overcome their challenges to achieve their goal.`,
        elements: {}
      };
  }
}


