/**
 * Mapping between genre element IDs and logline element properties
 * This allows us to know which logline element to regenerate when a genre element is rerolled
 */

import { pick } from './core';
import { incompletenessAndCompletion, genreSpecificNemesis } from './genre-specific-elements';
import { 
  generateComplication,
  generateOutOfTheBottleElements,
  generateDudeWithAProblemElements,
  generateWhydunitElements,
  generateSuperheroElements
} from './logline-elements';

export interface ElementMapping {
  loglineProperty: string; // The property name in loglineElements
  regenerator: () => string; // Function to regenerate just this element
}

/**
 * Maps genre element IDs to their logline element properties and regenerators
 */
export const genreElementMappings: Record<string, Record<string, ElementMapping>> = {
  'Buddy Love': {
    'The Incomplete Hero': {
      loglineProperty: 'incompleteness',
      regenerator: () => {
        return incompletenessAndCompletion('hero').incompleteness;
      }
    },
    'The Counterpart': {
      loglineProperty: 'completion',
      regenerator: () => {
        return incompletenessAndCompletion('hero').completion;
      }
    },
    'The Complication': {
      loglineProperty: 'complication',
      regenerator: () => {
        return generateComplication();
      }
    }
  },
  
  'Monster in the House': {
    'The Monster': {
      loglineProperty: 'monster',
      regenerator: () => {
        return genreSpecificNemesis('Monster in the House');
      }
    },
    'The House': {
      loglineProperty: 'house',
      regenerator: () => {
        const houses = [
          'an isolated mansion', 'a remote research facility', 'a small town',
          'a space station', 'an underground bunker', 'a cruise ship',
          'a college campus', 'a family home', 'a military base', 'a remote island'
        ];
        return pick(houses);
      }
    },
    'The Sin': {
      loglineProperty: 'sin',
      regenerator: () => {
        const sins = [
          'reckless ambition', 'greed', 'curiosity', 'arrogance', 'negligence',
          'hubris', 'desire for power', 'forbidden experiments', 'playing god',
          'breaking sacred rules'
        ];
        return pick(sins);
      }
    }
  },
  
  'Golden Fleece': {
    'The Road': {
      loglineProperty: 'journey',
      regenerator: () => {
        const journeys = [
          'across a war-torn country', 'through hostile territory', 'into the criminal underworld',
          'across the ocean', 'through a dangerous wilderness', 'into enemy territory',
          'across the country', 'through a post-apocalyptic wasteland',
          'into the depths of space', 'through time itself'
        ];
        return pick(journeys);
      }
    },
    'The Team': {
      loglineProperty: 'team',
      regenerator: () => {
        const teams = [
          'a ragtag team', 'a group of misfits', 'unlikely allies',
          'a band of outcasts', 'a desperate crew', 'a motley crew',
          'a team of specialists', 'a group of strangers'
        ];
        return pick(teams);
      }
    },
    'The Prize': {
      loglineProperty: 'prize',
      regenerator: () => {
        const prizes = [
          'a legendary artifact', 'a stolen fortune', 'a cure for a deadly disease',
          'a missing person', 'proof of innocence', 'a sacred relic',
          'a powerful weapon', 'the truth about their past', 'a priceless treasure',
          'a way home', 'redemption', 'a second chance'
        ];
        return pick(prizes);
      }
    }
  },
  
  'Out of the Bottle': {
    'The Wish': {
      loglineProperty: 'wish',
      regenerator: () => {
        const wishes = [
          'unlimited power', 'a second chance at life', 'the ability to control time',
          'to be someone else', 'to have everything they desire', 'to change the past',
          'to be loved by everyone', 'to never feel pain again', 'eternal youth',
          'to be the best at everything'
        ];
        return pick(wishes);
      }
    },
    'The Spell': {
      loglineProperty: 'consequence',
      regenerator: () => {
        return generateOutOfTheBottleElements('hero').consequence;
      }
    },
    'The Lesson': {
      loglineProperty: 'lesson',
      regenerator: () => {
        const lessons = [
          'be careful what you wish for', 'you can\'t escape yourself',
          'the grass isn\'t always greener', 'power corrupts',
          'there are no shortcuts', 'you must earn what you want',
          'the price is too high', 'some things can\'t be undone'
        ];
        return pick(lessons);
      }
    }
  },
  
  'Dude with a Problem': {
    'The Sudden Event': {
      loglineProperty: 'suddenEvent',
      regenerator: () => {
        return genreSpecificNemesis('Dude with a Problem');
      }
    },
    'The Life or Death Battle': {
      loglineProperty: 'stakes',
      regenerator: () => {
        return generateDudeWithAProblemElements(genreSpecificNemesis('Dude with a Problem'), 'hero').stakes;
      }
    }
  },
  
  'Rites of Passage': {
    'The Life Problem': {
      loglineProperty: 'lifeCrisis',
      regenerator: () => {
        const lifeCrises = [
          'the death of a loved one', 'a devastating divorce', 'a career collapse',
          'a terminal diagnosis', 'the loss of everything', 'a midlife crisis',
          'coming of age', 'a betrayal', 'a personal failure', 'an identity crisis',
          'addiction', 'a crisis of faith'
        ];
        return pick(lifeCrises);
      }
    },
    'The Wrong Way': {
      loglineProperty: 'wrongWay',
      regenerator: () => {
        const wrongWays = [
          'self-destruction', 'denial', 'running away', 'lashing out at others',
          'numbing the pain', 'blaming everyone else', 'giving up',
          'refusing to change', 'clinging to the past', 'spiraling into darkness'
        ];
        return pick(wrongWays);
      }
    }
  },
  
  'Whydunit': {
    'The Secret': {
      loglineProperty: 'mystery',
      regenerator: () => {
        const mysteries = [
          'a series of impossible murders', 'a decades-old conspiracy',
          'a missing person case', 'a string of connected crimes',
          'a buried secret', 'a pattern of deaths', 'a cold case',
          'a web of lies and corruption', 'a puzzle that defies logic',
          'a crime that shouldn\'t exist'
        ];
        return pick(mysteries);
      }
    },
    'The Dark Turn': {
      loglineProperty: 'darkTurn',
      regenerator: () => {
        return generateWhydunitElements('hero').darkTurn;
      }
    }
  },
  
  'Fool Triumphant': {
    'The Establishment': {
      loglineProperty: 'establishment',
      regenerator: () => {
        return genreSpecificNemesis('Fool Triumphant');
      }
    },
    'The Transmutation': {
      loglineProperty: 'underestimation',
      regenerator: () => {
        const underestimations = [
          'naive innocence', 'lack of sophistication', 'humble origins',
          'simple honesty', 'unconventional methods', 'genuine kindness',
          'pure heart', 'outsider status', 'unpolished manner'
        ];
        return pick(underestimations);
      }
    }
  },
  
  'Institutionalized': {
    'The Group': {
      loglineProperty: 'group',
      regenerator: () => {
        return genreSpecificNemesis('Institutionalized');
      }
    },
    'The Choice': {
      loglineProperty: 'choice',
      regenerator: () => {
        const choices = [
          'conform or be destroyed', 'loyalty or freedom', 'survival or integrity',
          'obedience or exile', 'safety or truth', 'acceptance or authenticity',
          'power or principles', 'belonging or independence'
        ];
        return pick(choices);
      }
    }
  },
  
  'Superhero': {
    'The Power': {
      loglineProperty: 'power',
      regenerator: () => {
        const powers = [
          'superhuman strength', 'the ability to fly', 'control over elements',
          'telepathy', 'super speed', 'invulnerability', 'shape-shifting',
          'time manipulation', 'energy projection', 'healing powers'
        ];
        return pick(powers);
      }
    },
    'The Nemesis': {
      loglineProperty: 'villain',
      regenerator: () => {
        return genreSpecificNemesis('Superhero');
      }
    },
    'The Curse': {
      loglineProperty: 'curse',
      regenerator: () => {
        return generateSuperheroElements(genreSpecificNemesis('Superhero'), 'hero').curse;
      }
    }
  }
};

/**
 * Get the logline property name for a genre element
 */
export function getLoglineProperty(genre: string, elementId: string): string | null {
  const genreMap = genreElementMappings[genre];
  if (!genreMap) return null;
  const mapping = genreMap[elementId];
  if (!mapping) return null;
  return mapping.loglineProperty;
}

/**
 * Regenerate a specific logline element
 */
export function regenerateElement(genre: string, elementId: string): string | null {
  const genreMap = genreElementMappings[genre];
  if (!genreMap) return null;
  const mapping = genreMap[elementId];
  if (!mapping) return null;
  return mapping.regenerator();
}
