/**
 * The Kimberly System - Occupation Generators
 * 
 * Functions for generating job titles and occupations, organized by field.
 */

import { pick, pickGenerator } from './core';

// Scientists and researchers
const scientists = [
  'biologist', 'chemist', 'physicist', 'astronomer', 'geologist',
  'neuroscientist', 'geneticist', 'botanist', 'zoologist', 'ecologist',
  'marine biologist', 'archaeologist', 'anthropologist', 'psychologist', 'researcher'
];

// Teachers and educators
const teachers = [
  'teacher', 'professor', 'instructor', 'tutor', 'lecturer',
  'educator', 'principal', 'dean', 'counselor', 'librarian',
  'coach', 'mentor', 'trainer', 'academic advisor', 'teaching assistant'
];

// Office workers
const officeWorkers = [
  'accountant', 'manager', 'consultant', 'analyst', 'administrator',
  'executive', 'supervisor', 'coordinator', 'assistant', 'clerk',
  'secretary', 'receptionist', 'HR specialist', 'project manager', 'team leader'
];

// Medical professionals
const medicalProfessionals = [
  'doctor', 'surgeon', 'nurse', 'paramedic', 'pharmacist',
  'therapist', 'dentist', 'psychiatrist', 'radiologist', 'anesthesiologist',
  'pediatrician', 'cardiologist', 'neurologist', 'veterinarian', 'midwife'
];

// Artists and creatives
const artists = [
  'painter', 'sculptor', 'illustrator', 'photographer', 'filmmaker',
  'writer', 'poet', 'musician', 'composer', 'dancer',
  'actor', 'designer', 'animator', 'craftsperson', 'artist'
];

// Tech workers
const techWorkers = [
  'software engineer', 'developer', 'programmer', 'data scientist', 'IT specialist',
  'systems administrator', 'network engineer', 'cybersecurity analyst', 'web developer',
  'database administrator', 'UX designer', 'product manager', 'tech support', 'DevOps engineer'
];

// Service workers
const serviceWorkers = [
  'waiter', 'bartender', 'chef', 'barista', 'cashier',
  'retail worker', 'sales associate', 'customer service rep', 'flight attendant',
  'hotel manager', 'hairstylist', 'barber', 'massage therapist', 'personal trainer'
];

// Skilled trades
const skilledTrades = [
  'electrician', 'plumber', 'carpenter', 'mechanic', 'welder',
  'construction worker', 'HVAC technician', 'locksmith', 'painter', 'mason',
  'roofer', 'glazier', 'metalworker', 'machinist', 'contractor'
];

// Legal and law enforcement
const legalProfessionals = [
  'lawyer', 'attorney', 'judge', 'paralegal', 'legal assistant',
  'police officer', 'detective', 'FBI agent', 'marshal', 'sheriff',
  'correctional officer', 'bailiff', 'prosecutor', 'public defender', 'court reporter'
];

// Military and emergency
const militaryEmergency = [
  'soldier', 'marine', 'sailor', 'airman', 'officer',
  'firefighter', 'EMT', 'search and rescue specialist', 'coast guard', 'ranger',
  'special forces operative', 'pilot', 'combat medic', 'military engineer', 'drill sergeant'
];

// Business and finance
const businessFinance = [
  'entrepreneur', 'CEO', 'CFO', 'investor', 'banker',
  'stockbroker', 'financial advisor', 'auditor', 'economist', 'actuary',
  'real estate agent', 'insurance agent', 'business owner', 'venture capitalist', 'trader'
];

// Agriculture and nature
const agricultureNature = [
  'farmer', 'rancher', 'veterinarian', 'forester', 'park ranger',
  'conservationist', 'wildlife biologist', 'fisherman', 'beekeeper', 'agronomist',
  'landscape architect', 'gardener', 'arborist', 'animal trainer', 'zookeeper'
];

// Media and journalism
const mediaJournalism = [
  'journalist', 'reporter', 'editor', 'broadcaster', 'news anchor',
  'correspondent', 'columnist', 'blogger', 'podcaster', 'videographer',
  'publicist', 'PR specialist', 'social media manager', 'content creator', 'copywriter'
];

// Transportation
const transportation = [
  'pilot', 'truck driver', 'bus driver', 'taxi driver', 'train conductor',
  'ship captain', 'delivery driver', 'courier', 'logistics coordinator', 'dispatcher',
  'air traffic controller', 'mechanic', 'chauffeur', 'rideshare driver', 'ferry operator'
];

/**
 * Generates a scientist or researcher occupation
 * Example: "scientist" → "biologist", "physicist", "neuroscientist"
 */
export function scientist(): string {
  return pick(scientists);
}

/**
 * Generates a teacher or educator occupation
 * Example: "teacher" → "professor", "instructor", "mentor"
 */
export function teacher(): string {
  return pick(teachers);
}

/**
 * Generates an office worker occupation
 * Example: "office worker" → "accountant", "manager", "analyst"
 */
export function officeWorker(): string {
  return pick(officeWorkers);
}

/**
 * Generates a medical professional occupation
 * Example: "doctor" → "surgeon", "nurse", "therapist"
 */
export function doctor(): string {
  return pick(medicalProfessionals);
}

/**
 * Generates an artist or creative occupation
 * Example: "artist" → "painter", "musician", "writer"
 */
export function artist(): string {
  return pick(artists);
}

/**
 * Generates a tech worker occupation
 * Example: "developer" → "software engineer", "data scientist", "UX designer"
 */
export function developer(): string {
  return pick(techWorkers);
}

/**
 * Generates a service worker occupation
 * Example: "waiter" → "chef", "bartender", "barista"
 */
export function waiter(): string {
  return pick(serviceWorkers);
}

/**
 * Generates a skilled trades occupation
 * Example: "electrician" → "plumber", "carpenter", "mechanic"
 */
export function electrician(): string {
  return pick(skilledTrades);
}

/**
 * Generates a legal or law enforcement occupation
 * Example: "lawyer" → "detective", "judge", "FBI agent"
 */
export function lawyer(): string {
  return pick(legalProfessionals);
}

/**
 * Generates a military or emergency services occupation
 * Example: "soldier" → "firefighter", "marine", "EMT"
 */
export function soldier(): string {
  return pick(militaryEmergency);
}

/**
 * Generates a business or finance occupation
 * Example: "CEO" → "entrepreneur", "banker", "investor"
 */
export function CEO(): string {
  return pick(businessFinance);
}

/**
 * Generates an agriculture or nature occupation
 * Example: "farmer" → "rancher", "park ranger", "conservationist"
 */
export function farmer(): string {
  return pick(agricultureNature);
}

/**
 * Generates a media or journalism occupation
 * Example: "journalist" → "reporter", "editor", "podcaster"
 */
export function journalist(): string {
  return pick(mediaJournalism);
}

/**
 * Generates a transportation occupation
 * Example: "pilot" → "truck driver", "ship captain", "train conductor"
 */
export function pilot(): string {
  return pick(transportation);
}

/**
 * Generates any worker occupation from all categories
 * Uses weighted distribution to balance across different job types
 */
export function worker(): string {
  // Equal weighting across job categories for balanced distribution
  return pickGenerator([
    scientist,
    teacher,
    officeWorker,
    doctor,
    artist,
    developer,
    waiter,
    electrician,
    lawyer,
    soldier,
    CEO,
    farmer,
    journalist,
    pilot
  ]);
}

/**
 * Generates any occupation (alias for worker)
 */
export function anyOccupation(): string {
  return worker();
}

