import type { GlobalGameState } from "./GameState";

export interface SkillIncrementState {
  lastAttemptMessage?: string;
  lastAttemptSuccess?: boolean;
}

export interface GameState extends GlobalGameState {
  unlockedJobs: string[];
  jobLevels: { [key: string]: number };
  jobExperience: { [key: string]: number };
  jobInterviews: { [key: string]: JobInterviewState };
  skillLevels: { [key: string]: number };
  skillIncrements: { [skillId: string]: { [levelIndex: number]: number } };
  skillAttempts: { [skillId: string]: SkillIncrementState };
  thingQuantities: { [key: string]: number };
  earnedMerits: string[];
}

export interface JobInterviewState {
  hasOffer: boolean; // Whether player has received a job offer
  lastRejectionReason?: string; // Last rejection message to display
} 