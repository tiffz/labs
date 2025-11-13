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
  const firstName = generate(false, true, 'any');  // realistic, first name, any gender
  const lastName = generate(false, false, 'any');  // realistic, last name, any gender
  return `${firstName} ${lastName}`;
}

/**
 * Generates a realistic female full name
 */
export function femaleFullName(): string {
  const firstName = generate(false, true, 'female');
  const lastName = generate(false, false, 'any');
  return `${firstName} ${lastName}`;
}

/**
 * Generates a realistic male full name
 */
export function maleFullName(): string {
  const firstName = generate(false, true, 'male');
  const lastName = generate(false, false, 'any');
  return `${firstName} ${lastName}`;
}

/**
 * Generates a random full name (any gender)
 */
export function anyFullName(): string {
  return fullName();
}

/**
 * Character name storage for consistent first/last name usage
 * The Kimberly System convention: use full name on first mention, first name after
 */
const characterNames = new Map<string, { first: string; last: string; full: string }>();

/**
 * Generates or retrieves a character's full name (First Last)
 * Use this for the first mention of a character
 * Example: "Kimberly Brown"
 */
export function KimberlySmith(characterId: string = 'default'): string {
  if (!characterNames.has(characterId)) {
    const firstName = generate(false, true, 'any');
    const lastName = generate(false, false, 'any');
    characterNames.set(characterId, {
      first: firstName,
      last: lastName,
      full: `${firstName} ${lastName}`
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
 * Clears all stored character names (useful for generating new stories)
 */
export function clearCharacterNames(): void {
  characterNames.clear();
}

