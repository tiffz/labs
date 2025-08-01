import type { GlobalGameState } from "./GameState";

export interface GameState extends GlobalGameState {
  unlockedJobs: string[];
  jobLevels: { [key: string]: number };
  jobExperience: { [key: string]: number };
  jobInterviews: { [key: string]: JobInterviewState };
  playingUpgradeLevels: { [key: string]: number };
  thingQuantities: { [key: string]: number };
  completedGoals: string[];
  activeGoals: string[];
}

export interface JobInterviewState {
  hasOffer: boolean; // Whether player has received a job offer
  lastRejectionReason?: string; // Last rejection message to display
} 