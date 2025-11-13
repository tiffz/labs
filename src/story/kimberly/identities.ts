/**
 * The Kimberly System - Identity Generation
 * 
 * Generates weighted identity types for characters (jobs, kids, animals, etc.)
 */

import { pick } from './core';

/**
 * Generates a child identity
 */
export function kid(): string {
  const ages = [
    'young', 'preteen', 'teenage', 'elementary school', 'middle school',
    'high school', '10-year-old', '12-year-old', '15-year-old', '17-year-old'
  ];
  // Note: Removed 'gifted', 'special', 'blessed', 'chosen' to avoid duplicates with genre-specific adjectives
  const descriptors = [
    'curious', 'rebellious', 'shy', 'adventurous', 'bookish', 'athletic',
    'precocious', 'imaginative', 'mischievous', 'studious', 'creative',
    'outgoing', 'introverted', 'fearless', 'anxious', 'confident',
    'nerdy', 'popular', 'misunderstood', 'troubled', 'energetic', 'quiet'
  ];
  
  return `${pick(descriptors)} ${pick(ages)} kid`;
}

/**
 * Generates an animal identity
 * Following Cambridge adjective order: opinion adjectives come first
 */
export function animal(): string {
  const animals = [
    // Domestic
    'dog', 'cat', 'horse', 'rabbit', 'guinea pig', 'hamster', 'parrot',
    // Wild mammals
    'wolf', 'bear', 'fox', 'deer', 'raccoon', 'squirrel', 'otter',
    'lion', 'tiger', 'leopard', 'cheetah', 'panther', 'jaguar',
    'elephant', 'giraffe', 'zebra', 'rhinoceros', 'hippopotamus',
    'monkey', 'gorilla', 'orangutan', 'chimpanzee',
    'kangaroo', 'koala', 'panda', 'polar bear', 'grizzly bear',
    // Birds
    'owl', 'eagle', 'hawk', 'falcon', 'raven', 'crow', 'peacock',
    'penguin', 'flamingo', 'hummingbird', 'swan', 'pelican',
    // Marine
    'dolphin', 'whale', 'shark', 'octopus', 'seal', 'sea lion',
    'sea turtle', 'stingray', 'jellyfish',
    // Reptiles & Amphibians
    'snake', 'lizard', 'turtle', 'crocodile', 'alligator', 'frog', 'toad',
    // Mythical
    'dragon', 'phoenix', 'unicorn', 'griffin'
  ];
  
  // Opinion adjectives (personality/character)
  const opinionAdjectives = [
    'loyal', 'clever', 'brave', 'wise', 'cunning', 'noble',
    'mysterious', 'playful', 'protective', 'mischievous', 'gentle'
  ];
  
  // Physical quality adjectives
  const physicalAdjectives = [
    'fierce', 'wild', 'majestic', 'stealthy', 'swift',
    'powerful', 'graceful', 'sleek', 'agile'
  ];
  
  // Randomly choose 1-2 adjectives following proper order
  const rand = Math.random();
  const animal = pick(animals);
  
  if (rand < 0.6) {
    // Single opinion adjective (most common)
    return `${pick(opinionAdjectives)} ${animal}`;
  } else if (rand < 0.85) {
    // Single physical adjective
    return `${pick(physicalAdjectives)} ${animal}`;
  } else {
    // Two adjectives: opinion + physical (proper order)
    return `${pick(opinionAdjectives)} ${pick(physicalAdjectives)} ${animal}`;
  }
}

/**
 * Generates a supernaturalBeing/fantasy identity
 * Following Cambridge adjective order
 */
export function supernaturalBeing(): string {
  const beings = [
    // Classic supernatural
    'vampire', 'werewolf', 'ghost', 'zombie', 'mummy', 'ghoul',
    // Celestial
    'angel', 'demon', 'fallen angel', 'deity', 'demigod',
    // Magic users
    'witch', 'wizard', 'sorcerer', 'warlock', 'necromancer', 'enchanter',
    // Fae & mythical
    'fairy', 'elf', 'dwarf', 'goblin', 'troll', 'ogre',
    'nymph', 'dryad', 'mermaid', 'siren', 'centaur', 'satyr',
    // Sci-fi
    'android', 'cyborg', 'robot', 'AI', 'clone', 'mutant',
    'alien', 'extraterrestrial', 'hybrid', 'genetically modified human',
    // Other
    'time traveler', 'psychic', 'telepath', 'shapeshifter',
    'immortal', 'reincarnated soul', 'possessed person', 'medium',
    'superhuman', 'metahuman', 'enhanced individual'
  ];
  
  // Opinion adjectives (character/moral quality)
  const opinionAdjectives = [
    'reformed', 'rogue', 'struggling', 'reluctant', 'ambitious',
    'mysterious', 'dangerous', 'benevolent', 'malevolent', 'legendary'
  ];
  
  // Age adjectives
  const ageAdjectives = ['ancient', 'young', 'newly-turned', 'forgotten'];
  
  // State/condition adjectives (type)
  const stateAdjectives = ['exiled', 'cursed', 'blessed', 'hunted'];
  
  // Randomly choose adjective type
  const rand = Math.random();
  const being = pick(beings);
  
  if (rand < 0.5) {
    // Single opinion adjective (most common)
    return `${pick(opinionAdjectives)} ${being}`;
  } else if (rand < 0.75) {
    // Single age adjective
    return `${pick(ageAdjectives)} ${being}`;
  } else if (rand < 0.9) {
    // Single state adjective
    return `${pick(stateAdjectives)} ${being}`;
  } else {
    // Two adjectives: opinion + age (proper order)
    return `${pick(opinionAdjectives)} ${pick(ageAdjectives)} ${being}`;
  }
}

/**
 * Generates a job-based identity (most common)
 * Combines various occupation types for diversity
 */
export function job(): string {
  const jobs = [
    // Scientists & Researchers
    'biologist', 'chemist', 'physicist', 'astronomer', 'geologist',
    'data scientist', 'research scientist', 'lab technician', 'marine biologist',
    'geneticist', 'neuroscientist', 'archaeologist', 'anthropologist', 'botanist',
    'zoologist', 'ecologist', 'meteorologist', 'paleontologist',
    
    // Teachers & Educators
    'teacher', 'professor', 'tutor', 'school counselor', 'librarian',
    'principal', 'teaching assistant', 'education coordinator', 'curriculum developer',
    'college advisor', 'special education teacher', 'ESL instructor',
    
    // Office workers & Business
    'accountant', 'analyst', 'consultant', 'manager', 'administrator',
    'HR specialist', 'marketing coordinator', 'project manager', 'executive assistant',
    'financial advisor', 'business analyst', 'operations manager', 'sales representative',
    'recruiter', 'office manager', 'paralegal', 'auditor', 'bookkeeper',
    'insurance agent', 'real estate agent', 'stockbroker', 'investment banker',
    
    // Service workers
    'barista', 'waiter', 'chef', 'retail worker', 'cashier',
    'delivery driver', 'security guard', 'flight attendant', 'hotel manager',
    'tour guide', 'personal trainer', 'hairstylist', 'bartender',
    'housekeeper', 'janitor', 'parking attendant', 'receptionist',
    
    // Creative & Arts
    'artist', 'writer', 'musician', 'photographer', 'designer',
    'filmmaker', 'actor', 'dancer', 'sculptor', 'illustrator',
    'animator', 'art director', 'copywriter', 'journalist', 'editor',
    'podcaster', 'voice actor', 'comedian', 'playwright', 'poet',
    'fashion designer', 'interior designer', 'graphic designer', 'web designer',
    
    // Blue collar & Trades
    'mechanic', 'electrician', 'plumber', 'carpenter', 'construction worker',
    'welder', 'roofer', 'painter', 'landscaper', 'HVAC technician',
    'auto mechanic', 'machinist', 'locksmith', 'mason', 'glazier',
    
    // Medical & Healthcare
    'doctor', 'nurse', 'surgeon', 'dentist', 'veterinarian',
    'pharmacist', 'paramedic', 'physical therapist', 'occupational therapist',
    'radiologist', 'anesthesiologist', 'pediatrician', 'psychiatrist',
    'medical examiner', 'lab technician', 'dental hygienist', 'optometrist',
    
    // Professional Services
    'lawyer', 'engineer', 'architect', 'social worker', 'therapist',
    'psychologist', 'counselor', 'urban planner', 'civil engineer',
    'software engineer', 'mechanical engineer', 'electrical engineer',
    'environmental consultant', 'forensic scientist', 'private investigator',
    
    // Tech & IT
    'programmer', 'software developer', 'systems administrator', 'IT specialist',
    'cybersecurity analyst', 'database administrator', 'UX designer', 'game developer',
    'network engineer', 'tech support specialist', 'DevOps engineer',
    
    // Entrepreneur & Freelance
    'startup founder', 'small business owner', 'freelancer', 'consultant',
    'independent contractor', 'entrepreneur', 'life coach', 'career coach',
    'personal shopper', 'event planner', 'wedding planner', 'caterer',
    
    // Public Service & Government
    'police officer', 'firefighter', 'detective', 'FBI agent', 'park ranger',
    'postal worker', 'city council member', 'diplomat', 'judge', 'politician',
    'military officer', 'coast guard', 'border patrol agent',
    
    // Media & Communications
    'news anchor', 'reporter', 'producer', 'publicist', 'social media manager',
    'content creator', 'influencer', 'radio host', 'TV host', 'blogger',
    
    // Miscellaneous
    'pilot', 'ship captain', 'train conductor', 'bus driver', 'taxi driver',
    'truck driver', 'astronaut', 'professional athlete', 'coach', 'referee',
    'museum curator', 'auctioneer', 'appraiser', 'translator', 'interpreter'
  ];
  
  return pick(jobs);
}

/**
 * Generates a weighted hero identity
 * Distribution:
 * - 70% jobs (most common)
 * - 15% kids
 * - 10% supernaturalBeing
 * - 5% animals
 */
export function heroIdentity(): string {
  const rand = Math.random();
  
  if (rand < 0.70) {
    return job();
  } else if (rand < 0.85) {
    return kid();
  } else if (rand < 0.95) {
    return supernaturalBeing();
  } else {
    return animal();
  }
}

