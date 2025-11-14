/**
 * The Kimberly System - Genre-Aware Generators
 * 
 * Generators that adapt based on the story's genre to create
 * more specific, compelling content that fits genre conventions.
 */

import { pick } from './core';

/**
 * Generates genre-specific catalyst events
 * The inciting incident should match the genre's conventions
 */
export function genreSpecificCatalyst(genre: string): string {
  switch (genre) {
    case 'Buddy Love':
      return pick([
        'they meet someone who challenges everything they believe',
        'they\'re forced to work with someone they can\'t stand',
        'an old flame returns at the worst possible time',
        'they\'re paired with an unlikely partner',
        'someone sees through their carefully constructed walls',
        'they meet the one person who doesn\'t fall for their act',
        'they\'re assigned a partner who\'s their complete opposite',
        'someone from their past reappears',
        'they\'re forced into close quarters with a stranger',
        'they meet someone who reminds them what they\'ve lost'
      ]);
      
    case 'Monster in the House':
      return pick([
        'something ancient is awakened',
        'they unleash something they can\'t control',
        'the first victim is discovered',
        'they\'re trapped with an unknown threat',
        'the monster reveals itself',
        'they break a sacred rule',
        'the infection begins to spread',
        'they discover they\'re not alone',
        'the house locks them in',
        'the first death occurs'
      ]);
      
    case 'Golden Fleece':
      return pick([
        'they\'re offered a quest they can\'t refuse',
        'a map to something legendary falls into their hands',
        'they\'re recruited for an impossible mission',
        'they discover the location of something thought lost',
        'they\'re challenged to retrieve something valuable',
        'a dying person gives them a final mission',
        'they inherit a quest from someone who failed',
        'they\'re the only one who can find it',
        'a prophecy names them as the seeker',
        'they\'re given 72 hours to retrieve it'
      ]);
      
    case 'Out of the Bottle':
      return pick([
        'they make a wish they can\'t take back',
        'they discover they have a power with a price',
        'a deal with consequences is offered',
        'they get exactly what they asked for',
        'magic enters their mundane life',
        'they\'re granted three wishes',
        'they find a way to change everything',
        'reality bends to their will',
        'they wake up in a different life',
        'their deepest desire manifests'
      ]);
      
    case 'Dude with a Problem':
      return pick([
        'they\'re in the wrong place at the wrong time',
        'an ordinary day turns into a nightmare',
        'they witness something they shouldn\'t have',
        'they\'re caught in an attack',
        'their normal life explodes in violence',
        'they become a target',
        'disaster strikes without warning',
        'they\'re thrown into chaos',
        'everything goes wrong at once',
        'they\'re suddenly fighting for survival'
      ]);
      
    case 'Rites of Passage':
      return pick([
        'they receive devastating news',
        'a life-changing diagnosis',
        'someone close to them dies',
        'they hit rock bottom',
        'their carefully constructed life falls apart',
        'they\'re forced to confront their age',
        'a milestone forces self-reflection',
        'they lose something they thought defined them',
        'reality crashes through their denial',
        'they can\'t ignore the problem anymore'
      ]);
      
    case 'Whydunit':
      return pick([
        'a body is discovered',
        'they\'re assigned an impossible case',
        'a pattern of crimes emerges',
        'someone they know is murdered',
        'they receive a cryptic clue',
        'a cold case is reopened',
        'they discover a conspiracy',
        'evidence points to someone impossible',
        'they\'re drawn into a mystery',
        'the first clue appears'
      ]);
      
    case 'Fool Triumphant':
      return pick([
        'they\'re thrust into a world above their station',
        'they\'re mistaken for someone important',
        'they\'re given an opportunity they\'re not qualified for',
        'they lie their way into an elite circle',
        'they\'re the underdog in a rigged system',
        'they\'re underestimated by everyone',
        'they stumble into a high-stakes situation',
        'they\'re invited where they don\'t belong',
        'they fake their way into the inner circle',
        'they\'re given a chance to prove themselves'
      ]);
      
    case 'Institutionalized':
      return pick([
        'they join an organization with dark secrets',
        'they\'re inducted into a rigid system',
        'they enter a world with unspoken rules',
        'they\'re recruited by a powerful group',
        'they become part of something bigger',
        'they\'re initiated into the inner circle',
        'they take an oath they don\'t understand',
        'they\'re welcomed into the family',
        'they sign a contract they can\'t escape',
        'they\'re absorbed by the collective'
      ]);
      
    case 'Superhero':
      return pick([
        'they discover they have powers',
        'they\'re exposed to something that changes them',
        'they wake up different',
        'an accident gives them abilities',
        'they inherit a legacy',
        'they\'re chosen by fate',
        'their dormant powers activate',
        'they\'re transformed by tragedy',
        'they\'re given a gift and a curse',
        'destiny calls them'
      ]);
      
    default:
      return pick([
        'everything changes in an instant',
        'they receive news that changes everything',
        'an unexpected event disrupts their life',
        'they\'re forced to make a choice',
        'opportunity and danger arrive together',
        'the past catches up with them'
      ]);
  }
}

/**
 * Generates genre-specific midpoint events
 * The turning point should escalate in genre-appropriate ways
 */
export function genreSpecificMidpoint(genre: string): string {
  switch (genre) {
    case 'Buddy Love':
      return pick([
        'they kiss at the worst possible moment',
        'they confess feelings they can\'t take back',
        'they\'re caught together',
        'they cross a line they swore they wouldn\'t',
        'their partnership becomes something more',
        'they realize they\'re in love',
        'they sleep together and complicate everything',
        'they choose each other over everything else',
        'their secret relationship is exposed',
        'they can\'t deny it anymore'
      ]);
      
    case 'Monster in the House':
      return pick([
        'the monster is much worse than they thought',
        'they discover they\'re infected',
        'the monster is one of them',
        'escape is impossible',
        'the monster evolves',
        'they realize they created it',
        'the safe room is breached',
        'they discover the monster\'s origin',
        'the infection spreads to someone they love',
        'they learn the monster can\'t be killed'
      ]);
      
    case 'Golden Fleece':
      return pick([
        'they find the prize but it\'s a trap',
        'their team betrays them',
        'they discover the prize isn\'t what they thought',
        'they\'re closer but the cost is higher',
        'they lose half the team',
        'they find it but can\'t take it',
        'the real enemy is revealed',
        'they discover why the previous seekers failed',
        'they\'re forced to choose between the prize and each other',
        'they learn the truth about the quest'
      ]);
      
    case 'Out of the Bottle':
      return pick([
        'the wish backfires spectacularly',
        'they realize they can\'t undo it',
        'the price becomes clear',
        'they\'ve become the monster',
        'everyone they love is affected',
        'the magic is out of control',
        'they discover the true cost',
        'reality is unraveling',
        'they\'ve lost themselves',
        'the curse manifests fully'
      ]);
      
    case 'Dude with a Problem':
      return pick([
        'they think they\'ve escaped but walked into a trap',
        'the threat is much bigger than they knew',
        'they\'re captured',
        'someone they\'re protecting is taken',
        'they discover who\'s really behind it',
        'the stakes escalate to global',
        'they\'re betrayed by someone they trusted',
        'they realize they can\'t run anymore',
        'the enemy finds them',
        'time runs out'
      ]);
      
    case 'Rites of Passage':
      return pick([
        'they hit a new low',
        'their coping mechanism fails',
        'they push everyone away',
        'they have a breakthrough then relapse',
        'they face the thing they\'ve been avoiding',
        'they realize how far they\'ve fallen',
        'they hurt someone they love',
        'they see themselves clearly for the first time',
        'they can\'t hide anymore',
        'the truth they\'ve been denying surfaces'
      ]);
      
    case 'Whydunit':
      return pick([
        'they discover they\'re connected to the crime',
        'the killer targets them',
        'they solve it but the answer is worse',
        'someone they trust is the killer',
        'they\'re framed for the murder',
        'a new body appears',
        'they realize they\'ve been wrong all along',
        'the conspiracy goes higher than they thought',
        'they become the next target',
        'the case becomes personal'
      ]);
      
    case 'Fool Triumphant':
      return pick([
        'they\'re exposed as a fraud',
        'they succeed beyond their wildest dreams',
        'they\'re accepted by the elite',
        'their lie becomes the truth',
        'they realize they belong',
        'they\'re given real power',
        'they become what they pretended to be',
        'they\'re invited to the inner circle',
        'they win but at a cost',
        'they can\'t go back to who they were'
      ]);
      
    case 'Institutionalized':
      return pick([
        'they discover the organization\'s dark secret',
        'they\'re promoted to the inner circle',
        'they\'re forced to do something unforgivable',
        'they see the system for what it is',
        'they\'re given a test of loyalty',
        'they realize they can\'t leave',
        'they become complicit',
        'they\'re asked to betray someone',
        'they see what the group really does',
        'they\'re in too deep'
      ]);
      
    case 'Superhero':
      return pick([
        'they reveal their identity',
        'their powers fail at a critical moment',
        'they discover their powers are killing them',
        'the villain is someone they love',
        'they\'re forced to choose between power and humanity',
        'they lose control of their abilities',
        'they become public enemy number one',
        'they realize they\'re not the hero',
        'their loved one is taken',
        'they cross the line'
      ]);
      
    default:
      return pick([
        'they achieve a false victory',
        'they suffer a devastating setback',
        'the stakes are raised dramatically',
        'they discover the truth is worse than they thought',
        'they\'re forced to make an impossible choice',
        'they can\'t go back now'
      ]);
  }
}

