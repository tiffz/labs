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
}

export interface JobInterviewState {
  hasOffer: boolean; // Whether player has received a job offer
  lastRejectionReason?: string; // Last rejection message to display
} 