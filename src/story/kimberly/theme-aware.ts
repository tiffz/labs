/**
 * The Kimberly System - Theme-Aware Generators
 * 
 * Generators that adapt based on the story's theme to create
 * more specific, compelling content.
 */

import { pick } from './core';

/**
 * Generates theme-specific dismissed advice
 * Instead of "says something about [theme]", gives actual advice
 */
export function themeSpecificAdvice(theme: string): string {
  const themeLower = theme.toLowerCase();
  
  // Map themes to specific advice
  if (themeLower.includes('love') || themeLower.includes('connection')) {
    return pick([
      '"You can\'t love someone else until you love yourself."',
      '"Real love means being vulnerable."',
      '"Love isn\'t about control, it\'s about trust."',
      '"You\'re pushing away the people who care about you."',
      '"Sometimes the person you need is right in front of you."',
      '"You can\'t run from love forever."',
      '"Opening your heart is worth the risk."',
      '"Love requires sacrifice, not selfishness."',
      '"You deserve to be loved, flaws and all."',
      '"The walls you built to protect yourself are your prison."'
    ]);
  }
  
  if (themeLower.includes('truth') || themeLower.includes('honesty')) {
    return pick([
      '"The truth will set you free, but first it will hurt."',
      '"Lies have a way of catching up to you."',
      '"You can\'t build a life on deception."',
      '"The truth you\'re avoiding is the one you need most."',
      '"Honesty starts with being honest with yourself."',
      '"Every lie you tell makes the next one easier."',
      '"The truth doesn\'t care about your feelings."',
      '"You can run from the truth, but you can\'t hide."',
      '"Your secrets are eating you alive."',
      '"Sometimes the hardest person to be honest with is yourself."'
    ]);
  }
  
  if (themeLower.includes('redemption') || themeLower.includes('forgive')) {
    return pick([
      '"Everyone deserves a second chance."',
      '"You can\'t change the past, but you can change who you become."',
      '"Forgiveness is for you, not them."',
      '"Your mistakes don\'t define you unless you let them."',
      '"Redemption starts with taking responsibility."',
      '"You\'re not your worst moment."',
      '"The person you hurt most is yourself."',
      '"It\'s never too late to make things right."',
      '"Carrying that guilt will destroy you."',
      '"You can\'t move forward while looking back."'
    ]);
  }
  
  if (themeLower.includes('courage') || themeLower.includes('fear') || themeLower.includes('brave')) {
    return pick([
      '"Courage isn\'t the absence of fear, it\'s acting despite it."',
      '"The only thing to fear is living a life of fear."',
      '"You\'re braver than you think."',
      '"Fear is a liar."',
      '"What you\'re running from is what you need to face."',
      '"Bravery is choosing to stand when you want to run."',
      '"Your fear is keeping you small."',
      '"The thing you\'re most afraid of is usually what you need most."',
      '"You can\'t let fear make your decisions."',
      '"Being brave doesn\'t mean not being scared."'
    ]);
  }
  
  if (themeLower.includes('family') || themeLower.includes('belonging')) {
    return pick([
      '"Family isn\'t just blood, it\'s who shows up."',
      '"You can\'t choose your family, but you can choose to forgive them."',
      '"The family you need isn\'t always the one you were born into."',
      '"Home is where people know you and love you anyway."',
      '"You belong somewhere, you just have to find it."',
      '"Family means showing up, even when it\'s hard."',
      '"You can\'t run from your family forever."',
      '"The people who matter will accept you as you are."',
      '"You don\'t have to earn love from family."',
      '"Sometimes you have to leave home to find it."'
    ]);
  }
  
  if (themeLower.includes('identity') || themeLower.includes('self') || themeLower.includes('who you are')) {
    return pick([
      '"You are not what happened to you."',
      '"Stop trying to be who they want you to be."',
      '"You can\'t find yourself by becoming someone else."',
      '"Your identity isn\'t your job, your looks, or your mistakes."',
      '"The person you\'re pretending to be is exhausting."',
      '"You\'ll never be happy living someone else\'s life."',
      '"Authenticity is the only path to peace."',
      '"You can\'t hide from yourself."',
      '"Who you are is enough."',
      '"Stop performing and start being."'
    ]);
  }
  
  if (themeLower.includes('change') || themeLower.includes('growth')) {
    return pick([
      '"People don\'t change unless they want to."',
      '"Change is painful, but staying the same is worse."',
      '"You can\'t grow in your comfort zone."',
      '"The only constant is change."',
      '"You\'re not the same person you were yesterday."',
      '"Growth requires letting go of who you were."',
      '"Change starts with a single choice."',
      '"You can\'t heal in the same environment that hurt you."',
      '"Transformation is uncomfortable."',
      '"You have to break to rebuild."'
    ]);
  }
  
  if (themeLower.includes('power') || themeLower.includes('control')) {
    return pick([
      '"Real power is knowing when to let go."',
      '"Control is an illusion."',
      '"The more you try to control, the less power you have."',
      '"Power without purpose is just destruction."',
      '"You can\'t control everything, and that\'s okay."',
      '"True strength is vulnerability."',
      '"Power doesn\'t make you immune to consequences."',
      '"The need for control is born from fear."',
      '"You\'re not responsible for everything."',
      '"Sometimes surrender is the strongest choice."'
    ]);
  }
  
  if (themeLower.includes('justice') || themeLower.includes('fairness')) {
    return pick([
      '"Justice and revenge aren\'t the same thing."',
      '"The world isn\'t fair, but that doesn\'t mean you shouldn\'t try."',
      '"Sometimes doing the right thing costs everything."',
      '"Justice delayed is justice denied."',
      '"You can\'t fight injustice by becoming unjust."',
      '"The law and justice aren\'t always aligned."',
      '"Everyone deserves justice, even those you hate."',
      '"Fighting for justice means fighting for everyone."',
      '"You can\'t compromise on what\'s right."',
      '"Justice requires sacrifice."'
    ]);
  }
  
  if (themeLower.includes('sacrifice') || themeLower.includes('selfless')) {
    return pick([
      '"Sometimes love means letting go."',
      '"You can\'t save everyone, but you can save someone."',
      '"Sacrifice without purpose is just loss."',
      '"The greatest love is laying down your life for another."',
      '"You have to lose yourself to find yourself."',
      '"What you give up defines who you become."',
      '"Sacrifice is only meaningful if it\'s chosen."',
      '"You can\'t pour from an empty cup."',
      '"Martyrdom isn\'t the same as sacrifice."',
      '"Sometimes the hardest sacrifice is accepting help."'
    ]);
  }
  
  // Default/generic advice for themes we don't have specific mappings for
  return pick([
    `"The answer to ${theme} is simpler than you think."`,
    `"You already know the truth about ${theme}."`,
    `"${theme} isn't something you find, it's something you choose."`,
    `"You can't learn ${theme} from a book."`,
    `"${theme} requires action, not intention."`,
    `"The path to ${theme} goes through pain."`,
    `"You're closer to ${theme} than you realize."`,
    `"${theme} starts with a single step."`,
    `"You can't achieve ${theme} alone."`,
    `"${theme} is a journey, not a destination."`
  ]);
}

/**
 * Generates theme-specific epiphanies
 * The dark night realization should connect to the theme
 */
export function themeSpecificEpiphany(theme: string): string {
  const themeLower = theme.toLowerCase();
  
  if (themeLower.includes('love') || themeLower.includes('connection')) {
    return pick([
      'Love isn\'t about being perfect, it\'s about being real.',
      'The person they need has been there all along.',
      'Pushing people away doesn\'t protect them, it hurts them.',
      'They can\'t love anyone until they love themselves.',
      'Being vulnerable is the only way to truly connect.',
      'Love means letting someone see all of you.',
      'The walls they built are keeping out the wrong people.',
      'They\'re worthy of love exactly as they are.',
      'Love requires risk, and that\'s okay.',
      'Connection is worth the pain of potential loss.'
    ]);
  }
  
  if (themeLower.includes('truth') || themeLower.includes('honesty')) {
    return pick([
      'The truth they\'ve been running from is the key to freedom.',
      'Lies only delay the inevitable.',
      'Honesty with themselves is where it starts.',
      'The truth is painful, but the lies are killing them.',
      'They can\'t build a real life on a false foundation.',
      'The people who matter will accept the truth.',
      'Living a lie is not living at all.',
      'The truth will hurt, but hiding hurts more.',
      'They owe themselves honesty.',
      'Authenticity is the only path to peace.'
    ]);
  }
  
  if (themeLower.includes('redemption') || themeLower.includes('forgive')) {
    return pick([
      'They can\'t change the past, but they can change the future.',
      'Forgiveness starts with forgiving themselves.',
      'Their mistakes don\'t define them.',
      'Redemption is a choice, not a destination.',
      'They\'re not their worst moment.',
      'Making amends is how they heal.',
      'They deserve a second chance.',
      'The person they hurt most was themselves.',
      'Carrying guilt won\'t fix what they broke.',
      'They can\'t move forward while chained to the past.'
    ]);
  }
  
  if (themeLower.includes('courage') || themeLower.includes('fear') || themeLower.includes('brave')) {
    return pick([
      'Courage is acting despite the fear.',
      'The thing they fear most is what they need to face.',
      'Fear is a liar that keeps them small.',
      'They\'re braver than they believe.',
      'Running from fear only makes it stronger.',
      'Bravery is choosing to stand up.',
      'Fear has been making their decisions.',
      'They can survive what scares them.',
      'The only way out is through.',
      'Fear loses its power when faced.'
    ]);
  }
  
  if (themeLower.includes('family') || themeLower.includes('belonging')) {
    return pick([
      'Family isn\'t just blood, it\'s who shows up.',
      'They belong somewhere, they just have to accept it.',
      'Home is where people love them despite knowing them.',
      'They don\'t have to earn love from real family.',
      'The family they need has been there all along.',
      'Belonging means being accepted as they are.',
      'They can\'t run from family forever.',
      'Home isn\'t a place, it\'s people.',
      'They\'re not alone, they just have to let people in.',
      'Family means showing up, even when it\'s hard.'
    ]);
  }
  
  if (themeLower.includes('identity') || themeLower.includes('self') || themeLower.includes('who you are')) {
    return pick([
      'They are not what happened to them.',
      'Pretending to be someone else is exhausting.',
      'Their authentic self is enough.',
      'They can\'t find themselves by being someone else.',
      'Who they are is not their job, looks, or mistakes.',
      'They\'ve been performing instead of being.',
      'Authenticity is the only path to happiness.',
      'They can\'t hide from themselves forever.',
      'Their true self deserves to exist.',
      'Being themselves is the bravest thing they can do.'
    ]);
  }
  
  if (themeLower.includes('change') || themeLower.includes('growth')) {
    return pick([
      'Change is painful, but staying the same is worse.',
      'They can\'t grow in their comfort zone.',
      'Growth requires letting go of who they were.',
      'Change starts with a single choice.',
      'They can\'t heal in the environment that hurt them.',
      'Transformation requires breaking first.',
      'They\'re not the same person they were.',
      'Change is the only constant.',
      'Growth means embracing discomfort.',
      'They have to die to who they were to become who they need to be.'
    ]);
  }
  
  if (themeLower.includes('power') || themeLower.includes('control')) {
    return pick([
      'Real power is knowing when to let go.',
      'Control is an illusion.',
      'Trying to control everything gives them no power.',
      'True strength is vulnerability.',
      'Power without purpose is just destruction.',
      'They can\'t control everything, and that\'s okay.',
      'The need for control comes from fear.',
      'They\'re not responsible for everything.',
      'Surrender can be the strongest choice.',
      'Power means choosing what to let go.'
    ]);
  }
  
  if (themeLower.includes('justice') || themeLower.includes('fairness')) {
    return pick([
      'Justice and revenge aren\'t the same.',
      'Doing the right thing is worth the cost.',
      'They can\'t fight injustice by becoming unjust.',
      'Justice requires sacrifice.',
      'Everyone deserves justice, even those they hate.',
      'The law and justice aren\'t always the same.',
      'Fighting for justice means fighting for everyone.',
      'They can\'t compromise on what\'s right.',
      'Justice delayed is justice denied.',
      'Sometimes doing right means losing everything.'
    ]);
  }
  
  if (themeLower.includes('sacrifice') || themeLower.includes('selfless')) {
    return pick([
      'Sometimes love means letting go.',
      'They can\'t save everyone, but they can save someone.',
      'Sacrifice is only meaningful if it\'s chosen.',
      'The greatest love is giving up everything.',
      'What they give up defines who they become.',
      'They have to lose themselves to find themselves.',
      'Sacrifice without purpose is just loss.',
      'They can\'t pour from an empty cup.',
      'Martyrdom isn\'t the same as sacrifice.',
      'Accepting help is sometimes the hardest sacrifice.'
    ]);
  }
  
  // Default
  return pick([
    `${theme} was inside them all along.`,
    `The path to ${theme} requires letting go.`,
    `${theme} isn't something to achieve, it's something to become.`,
    `They already have everything they need for ${theme}.`,
    `${theme} starts with accepting who they are.`,
    `The answer to ${theme} is simpler than they thought.`,
    `${theme} requires action, not just intention.`,
    `They can't find ${theme} alone.`,
    `${theme} means choosing differently.`,
    `The journey to ${theme} goes through pain.`
  ]);
}

