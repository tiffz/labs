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

