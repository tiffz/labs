import type { GlobalGameState } from "./GameState";

export interface GameState extends GlobalGameState {
  unlockedJobs: string[];
  jobLevels: { [key: string]: number };
  jobExperience: { [key: string]: number };
  jobInterviews: { [key: string]: JobInterviewState };
  thingQuantities: { [key: string]: number };
  earnedMerits: string[];
  // New merit upgrade system
  spentMerits: { [upgradeId: string]: number }; // Track merit points spent on each upgrade
  // Award tracking system for special interactions
  earnedAwards: string[]; // List of earned award IDs
  awardProgress: { [awardId: string]: number }; // Track progress for awards requiring multiple actions
  specialActions: {
    noseClicks: number;
    earClicks: number;
    cheekPets: number;
    happyJumps: number;
  };
}

export interface JobInterviewState {
  hasOffer: boolean; // Whether player has received a job offer
  lastRejectionReason?: string; // Last rejection message to display
} 