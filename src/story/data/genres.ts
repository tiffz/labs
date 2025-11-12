import type { Genres, GenreElements, GenreElementDescriptions } from '../types';

export const genres: Genres = {
  Whydunit:
    'A mystery where the hero seeks to uncover a truth, forcing them to confront a dark secret from their own past.',
  'Rites of Passage':
    'A story about coping with a universal life problem (pain, loss, coming-of-age) where the real monster is internal.',
  Institutionalized:
    "A story about a group or institution and an individual's place within it. The hero must choose between their own desires and the good of the group.",
  Superhero:
    'An extraordinary person in an ordinary world who must bear a great burden or sacrifice.',
  'Dude with a Problem':
    'An ordinary person in an extraordinary circumstance who must rise to the occasion to survive.',
  'Fool Triumphant':
    'An underdog who is underestimated by everyone, but whose hidden wisdom and luck help them defeat a more powerful "establishment" figure.',
  'Buddy Love':
    "A story about the power of relationships (not just romantic) where the hero's journey is catalyzed by someone else.",
  'Out of the Bottle':
    'A story involving magic, a wish granted, or a sudden stroke of luck that forces the hero to deal with the consequences, both good and bad.',
  'Golden Fleece':
    'A quest or road trip story where the hero is in pursuit of a tangible prize, but the real growth happens on the journey itself.',
  'Monster in the House':
    'A story where a monster (literal or metaphorical) confines the hero to a limited space, and there is a "sin" that has brought the monster forth.',
};

export const genreElements: GenreElements = {
  Whydunit: ['The Detective', 'The Secret', 'The Dark Turn'],
  'Rites of Passage': ['The Life Problem', 'The Wrong Way', 'The Acceptance'],
  Institutionalized: ['The Group', 'The Choice', 'The Sacrifice'],
  Superhero: ['The Power', 'The Nemesis', 'The Curse'],
  'Dude with a Problem': [
    'The Innocent Hero',
    'The Sudden Event',
    'The Life or Death Battle',
  ],
  'Fool Triumphant': ['The Fool', 'The Establishment', 'The Transmutation'],
  'Buddy Love': ['The Incomplete Hero', 'The Counterpart', 'The Complication'],
  'Out of the Bottle': ['The Wish', 'The Spell', 'The Lesson'],
  'Golden Fleece': ['The Road', 'The Team', 'The Prize'],
  'Monster in the House': ['The Monster', 'The House', 'The Sin'],
};

export const genreElementDescriptions: GenreElementDescriptions = {
  'The Detective':
    'The hero, not always a literal detective, who is compelled to find the truth.',
  'The Secret':
    'The dark truth at the heart of the mystery, often with personal ties to the detective.',
  'The Dark Turn':
    'A twist that reveals the secret is much more sinister than it first appeared.',
  'The Life Problem':
    'A universal issue the hero is struggling with, like grief, divorce, or puberty.',
  'The Wrong Way': "The hero's initial, flawed approach to solving the Life Problem.",
  'The Acceptance':
    'The final realization that the problem cannot be beaten, only understood and accepted.',
  'The Group':
    'The family, company, or society with its own set of rules and values.',
  'The Choice':
    "A moment where the hero must choose between their own desires and the group's needs.",
  'The Sacrifice':
    'What the hero must give up for the good of the group, or what the group sacrifices for them.',
  'The Power': "The hero's unique ability, which is both a gift and a burden.",
  'The Nemesis':
    'The villain who is the thematic opposite of the hero and often a dark reflection of them.',
  'The Curse': "The downside of the hero's power; the personal sacrifice it demands.",
  'The Innocent Hero':
    'An ordinary person who is completely unprepared for the extraordinary situation.',
  'The Sudden Event':
    'The unexpected incident that plunges the hero into a life-or-death struggle.',
  'The Life or Death Battle':
    'The hero must tap into primal survival instincts to overcome the odds.',
  'The Fool': 'An underestimated underdog who is seen as foolish by the world.',
  'The Establishment':
    'A powerful and respected person or institution that the Fool opposes.',
  'The Transmutation':
    'The moment the Fool is revealed to have a hidden, unique wisdom.',
  'The Incomplete Hero': 'A hero who is missing something crucial in their life.',
  'The Counterpart':
    "The person (or animal) who comes into the hero's life and helps them become whole.",
  'The Complication':
    'The internal or external force that threatens to keep the hero and their counterpart apart.',
  'The Wish': 'The magical element or sudden opportunity that the hero is granted.',
  'The Spell': 'The rules, limitations, or unforeseen consequences of the magic.',
  'The Lesson':
    'The moral the hero must learn to properly handle the magic or give it up.',
  'The Road': 'The physical and spiritual journey the hero undertakes.',
  'The Team': 'The companions or allies the hero gathers along the way.',
  'The Prize':
    'The tangible goal the hero is seeking, which often turns out to be a MacGuffin.',
  'The Monster': 'A supernatural or metaphorical creature driven by a primal need.',
  'The House': 'A confined space where the hero cannot escape the monster.',
  'The Sin':
    'A past transgression committed by the hero or someone else that has summoned the monster.',
};

export const themes = [
  'Forgiveness',
  'Love',
  'Acceptance',
  'Faith',
  'Fear',
  'Trust',
  'Survival',
  'Selflessness',
  'Responsibility',
  'Redemption',
];

