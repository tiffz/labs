/**
 * The Kimberly System - Character Class
 * 
 * A stateful generator for characters with consistent attributes (name, pronouns, etc.)
 * This allows templates like: `${char.Kimberly()} looked at ${char.her()} reflection`
 */

import { pick } from './core';
import * as names from './names';

export type Gender = 'female' | 'male' | 'neutral';

export type CharacterRole = 
  | 'hero' 
  | 'villain' 
  | 'mentor' 
  | 'sidekick' 
  | 'love-interest'
  | 'rival'
  | 'supporting'
  | 'background';

interface PronounSet {
  subject: string;      // she/he/they
  object: string;       // her/him/them
  possessive: string;   // her/his/their
  possessivePronoun: string; // hers/his/theirs
  reflexive: string;    // herself/himself/themselves
}

const PRONOUNS: Record<Gender, PronounSet> = {
  female: {
    subject: 'she',
    object: 'her',
    possessive: 'her',
    possessivePronoun: 'hers',
    reflexive: 'herself'
  },
  male: {
    subject: 'he',
    object: 'him',
    possessive: 'his',
    possessivePronoun: 'his',
    reflexive: 'himself'
  },
  neutral: {
    subject: 'they',
    object: 'them',
    possessive: 'their',
    possessivePronoun: 'theirs',
    reflexive: 'themselves'
  }
};

/**
 * Character class for stateful generation
 * 
 * Usage:
 * ```
 * const hero = new Character('hero', 'female');
 * const text = `${hero.Kimberly()} looked at ${hero.her()} reflection and knew ${hero.she()} had to act.`;
 * ```
 */
export class Character {
  private name: string;
  private gender: Gender;
  private role: CharacterRole;
  private pronouns: PronounSet;
  
  constructor(role: CharacterRole = 'supporting', gender?: Gender) {
    this.role = role;
    
    // If no gender specified, randomly choose one
    if (!gender) {
      this.gender = pick<Gender>(['female', 'male', 'neutral'], [45, 45, 10]);
    } else {
      this.gender = gender;
    }
    
    this.pronouns = PRONOUNS[this.gender];
    this.name = this.generateName();
  }
  
  private generateName(): string {
    // Generate name based on gender and role
    switch (this.gender) {
      case 'female':
        return this.role === 'villain' ? names.Aria() : names.Kimberly();
      case 'male':
        return this.role === 'villain' ? names.Cassius() : names.Liam();
      case 'neutral':
        return names.Alex();
    }
  }
  
  /**
   * Returns the character's name
   * Example: "Kimberly"
   */
  public Kimberly(): string {
    return this.name;
  }
  
  /**
   * Returns the character's name (alias)
   */
  public name_(): string {
    return this.name;
  }
  
  /**
   * Subject pronoun (she/he/they)
   */
  public she(): string {
    return this.pronouns.subject;
  }
  
  /**
   * Subject pronoun capitalized (She/He/They)
   */
  public She(): string {
    return this.pronouns.subject.charAt(0).toUpperCase() + this.pronouns.subject.slice(1);
  }
  
  /**
   * Object pronoun (her/him/them)
   */
  public her(): string {
    return this.pronouns.object;
  }
  
  /**
   * Object pronoun capitalized (Her/Him/Them)
   */
  public Her(): string {
    return this.pronouns.object.charAt(0).toUpperCase() + this.pronouns.object.slice(1);
  }
  
  /**
   * Possessive adjective (her/his/their)
   */
  public hers(): string {
    return this.pronouns.possessive;
  }
  
  /**
   * Possessive adjective capitalized (Her/His/Their)
   */
  public Hers(): string {
    return this.pronouns.possessive.charAt(0).toUpperCase() + this.pronouns.possessive.slice(1);
  }
  
  /**
   * Possessive pronoun (hers/his/theirs)
   */
  public hersAlone(): string {
    return this.pronouns.possessivePronoun;
  }
  
  /**
   * Reflexive pronoun (herself/himself/themselves)
   */
  public herself(): string {
    return this.pronouns.reflexive;
  }
  
  /**
   * Returns the character's gender
   */
  public getGender(): Gender {
    return this.gender;
  }
  
  /**
   * Returns the character's role
   */
  public getRole(): CharacterRole {
    return this.role;
  }
  
  /**
   * Sets a custom name for the character
   */
  public setName(name: string): void {
    this.name = name;
  }
}

/**
 * Factory functions for creating characters with specific roles
 */

export function createHero(gender?: Gender): Character {
  return new Character('hero', gender);
}

export function createVillain(gender?: Gender): Character {
  return new Character('villain', gender);
}

export function createMentor(gender?: Gender): Character {
  return new Character('mentor', gender);
}

export function createSidekick(gender?: Gender): Character {
  return new Character('sidekick', gender);
}

export function createLoveInterest(gender?: Gender): Character {
  return new Character('love-interest', gender);
}

export function createRival(gender?: Gender): Character {
  return new Character('rival', gender);
}

export function createSupportingCharacter(gender?: Gender): Character {
  return new Character('supporting', gender);
}

