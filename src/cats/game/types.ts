import type { GlobalGameState } from "./GameState";

export interface GameState extends GlobalGameState {
  unlockedJobs: string[];
  jobLevels: { [key: string]: number };
  jobExperience: { [key: string]: number };
  upgradeLevels: { [key: string]: number };
  playingUpgradeLevels: { [key: string]: number };
  thingQuantities: { [key: string]: number };
  completedGoals: string[];
  activeGoals: string[];
} 