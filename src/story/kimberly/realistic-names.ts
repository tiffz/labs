/**
 * The Kimberly System - Realistic Name Generation
 * 
 * Uses @likemybread/name-generator for realistic full names
 * 
 * The library's generate function takes parameters: (fantasy, first, gender)
 * - fantasy: false for realistic names
 * - first: true for first name, false for last name
 * - gender: 'male', 'female', 'androgynous', or 'any'
 */

// @ts-expect-error - no types available for this package
import generate from '@likemybread/name-generator';

/**
 * Generates a realistic full name (first + last)
 * Example: "Kimberly Brown", "Michael Chen", "Sarah O'Connor"
 */
export function fullName(): string {
  let firstName = generate(false, true, 'any');  // realistic, first name, any gender
  let lastName = generate(false, false, 'any');  // realistic, last name, any gender
  
  // Handle cases where generate returns undefined (fallback to defaults)
  if (!firstName || typeof firstName !== 'string') {
    firstName = 'Alex';
  }
  if (!lastName || typeof lastName !== 'string') {
    lastName = 'Smith';
  }
  
  return `${firstName} ${lastName}`;
}

/**
 * Generates a realistic female full name
 */
export function femaleFullName(): string {
  let firstName = generate(false, true, 'female');
  let lastName = generate(false, false, 'any');
  
  // Handle cases where generate returns undefined (fallback to defaults)
  if (!firstName || typeof firstName !== 'string') {
    firstName = 'Sarah';
  }
  if (!lastName || typeof lastName !== 'string') {
    lastName = 'Smith';
  }
  
  return `${firstName} ${lastName}`;
}

/**
 * Generates a realistic male full name
 */
export function maleFullName(): string {
  let firstName = generate(false, true, 'male');
  let lastName = generate(false, false, 'any');
  
  // Handle cases where generate returns undefined (fallback to defaults)
  if (!firstName || typeof firstName !== 'string') {
    firstName = 'Michael';
  }
  if (!lastName || typeof lastName !== 'string') {
    lastName = 'Smith';
  }
  
  return `${firstName} ${lastName}`;
}

/**
 * Generates a random full name (any gender)
 */
export function anyFullName(): string {
  return fullName();
}

/**
 * Pronoun sets for characters
 */
export interface Pronouns {
  subject: string;   // he/she/they
  object: string;    // him/her/them
  possessive: string; // his/her/their
  possessiveAdjective: string; // his/her/their (before noun)
  reflexive: string; // himself/herself/themselves
}

const PRONOUNS_HE: Pronouns = {
  subject: 'he',
  object: 'him',
  possessive: 'his',
  possessiveAdjective: 'his',
  reflexive: 'himself'
};

const PRONOUNS_SHE: Pronouns = {
  subject: 'she',
  object: 'her',
  possessive: 'hers',
  possessiveAdjective: 'her',
  reflexive: 'herself'
};

const PRONOUNS_THEY: Pronouns = {
  subject: 'they',
  object: 'them',
  possessive: 'theirs',
  possessiveAdjective: 'their',
  reflexive: 'themselves'
};

/**
 * Generates pronouns for a character
 * 90% chance of he/she (50/50 split), 10% chance of they
 * Returns both pronouns and the gender to use for name generation
 */
function generatePronounsAndGender(): { pronouns: Pronouns; gender: 'male' | 'female' | 'any' } {
  const rand = Math.random();
  if (rand < 0.45) {
    return { pronouns: PRONOUNS_HE, gender: 'male' };
  } else if (rand < 0.90) {
    return { pronouns: PRONOUNS_SHE, gender: 'female' };
  } else {
    return { pronouns: PRONOUNS_THEY, gender: 'any' };
  }
}

/**
 * Character name storage for consistent first/last name usage
 * The Kimberly System convention: use full name on first mention, first name after
 */
const characterNames = new Map<string, { 
  first: string; 
  last: string; 
  full: string;
  pronouns: Pronouns;
}>();

/**
 * Generates or retrieves a character's full name (First Last)
 * Use this for the first mention of a character
 * Example: "Kimberly Brown"
 * 
 * Names are generated to match the character's pronouns:
 * - he/him -> male names
 * - she/her -> female names  
 * - they/them -> any gender names
 */
export function KimberlySmith(characterId: string = 'default'): string {
  if (!characterNames.has(characterId)) {
    const { pronouns, gender } = generatePronounsAndGender();
    let firstName = generate(false, true, gender);
    let lastName = generate(false, false, 'any');
    
    // Handle cases where generate returns undefined (fallback to defaults)
    if (!firstName || typeof firstName !== 'string') {
      firstName = gender === 'male' ? 'Michael' : gender === 'female' ? 'Sarah' : 'Alex';
    }
    if (!lastName || typeof lastName !== 'string') {
      lastName = 'Smith';
    }
    
    characterNames.set(characterId, {
      first: firstName,
      last: lastName,
      full: `${firstName} ${lastName}`,
      pronouns
    });
  }
  return characterNames.get(characterId)!.full;
}

/**
 * Gets a character's first name only
 * Use this for subsequent mentions after KimberlySmith()
 * Example: "Kimberly"
 */
export function Kimberly(characterId: string = 'default'): string {
  if (!characterNames.has(characterId)) {
    // If not initialized, create the full name first
    KimberlySmith(characterId);
  }
  return characterNames.get(characterId)!.first;
}

/**
 * Gets a character's pronouns
 */
export function getPronouns(characterId: string = 'default'): Pronouns {
  if (!characterNames.has(characterId)) {
    KimberlySmith(characterId);
  }
  return characterNames.get(characterId)!.pronouns;
}

/**
 * Pronoun helper functions for easy access in templates
 */
export function he(characterId: string = 'default'): string {
  return getPronouns(characterId).subject;
}

export function him(characterId: string = 'default'): string {
  return getPronouns(characterId).object;
}

export function his(characterId: string = 'default'): string {
  return getPronouns(characterId).possessiveAdjective;
}

export function himself(characterId: string = 'default'): string {
  return getPronouns(characterId).reflexive;
}

/**
 * Clears all stored character names (useful for generating new stories)
 */
export function clearCharacterNames(): void {
  characterNames.clear();
}

