import type { JobData } from '../data/jobData';

export interface TrainingResult {
  experienceGained: number;
  loveCost: number;
  wasLucky: boolean; // For juicy feedback when player gets bonus experience
  bonusAmount?: number;
}

export interface TrainingConfig {
  baseLoveCost: number;
  baseExperienceGain: number;
  randomnessRange: number; // +/- percentage variance
  luckChance: number; // Chance for bonus experience
  luckMultiplier: number; // Bonus multiplier when lucky
}

// Training configurations for different job types
export const trainingConfigs: { [jobId: string]: TrainingConfig } = {
  box_factory: {
    baseLoveCost: 2,
    baseExperienceGain: 4,
    randomnessRange: 0.4, // ±40% variance
    luckChance: 0.20, // 20% chance for bonus
    luckMultiplier: 2.0, // Double experience when lucky
  },
  software_developer: {
    baseLoveCost: 3,
    baseExperienceGain: 5,
    randomnessRange: 0.5, // ±50% variance (more unpredictable)
    luckChance: 0.25, // 25% chance for bonus
    luckMultiplier: 1.8,
  },
  librarian: {
    baseLoveCost: 4,
    baseExperienceGain: 6,
    randomnessRange: 0.3, // ±30% variance (more stable)
    luckChance: 0.30, // 30% chance for bonus
    luckMultiplier: 1.5,
  },
};

// Default config for jobs without specific training configs
const defaultTrainingConfig: TrainingConfig = {
  baseLoveCost: 3,
  baseExperienceGain: 4,
  randomnessRange: 0.4,
  luckChance: 0.20,
  luckMultiplier: 1.8,
};

export function getTrainingConfig(jobId: string): TrainingConfig {
  return trainingConfigs[jobId] || defaultTrainingConfig;
}

export function calculateTrainingCost(jobId: string, currentExperience: number): number {
  const config = getTrainingConfig(jobId);
  
  // Training gets slightly more expensive as you gain experience
  const experienceMultiplier = 1 + (currentExperience * 0.01); // 1% increase per experience point
  
  return Math.ceil(config.baseLoveCost * experienceMultiplier);
}

export function performTraining(jobId: string, currentExperience: number): TrainingResult {
  const config = getTrainingConfig(jobId);
  const loveCost = calculateTrainingCost(jobId, currentExperience);
  
  // Base experience with randomness
  const randomVariance = (Math.random() - 0.5) * 2 * config.randomnessRange; // -range to +range
  const baseExperience = config.baseExperienceGain * (1 + randomVariance);
  
  // Check for luck bonus
  const isLucky = Math.random() < config.luckChance;
  const bonusAmount = isLucky ? Math.ceil(baseExperience * (config.luckMultiplier - 1)) : 0;
  
  const totalExperience = Math.ceil(baseExperience + bonusAmount);
  
  return {
    experienceGained: Math.max(1, totalExperience), // Always gain at least 1 experience
    loveCost,
    wasLucky: isLucky,
    bonusAmount: isLucky ? bonusAmount : undefined,
  };
}

export function canAffordTraining(currentLove: number, jobId: string, currentExperience: number): boolean {
  const cost = calculateTrainingCost(jobId, currentExperience);
  return currentLove >= cost;
}

// Note: This function requires jobData to be passed in to avoid circular dependencies
export function getExperienceRequiredForPromotion(jobData: JobData[], jobId: string, currentLevel: number): number | null {
  const job = jobData.find((j: JobData) => j.id === jobId);
  
  if (!job || currentLevel >= job.levels.length) {
    return null; // Max level reached
  }
  
  // Return experience required for the level we want to promote TO
  // When currentLevel is 0 (unemployed), we want to promote to job.levels[0] (first job)
  return job.levels[currentLevel].experienceRequired;
}

export function canPromoteToNextLevel(jobData: JobData[], jobId: string, currentLevel: number, currentExperience: number): boolean {
  const requiredExperience = getExperienceRequiredForPromotion(jobData, jobId, currentLevel);
  
  if (requiredExperience === null) {
    return false; // Max level reached
  }
  
  return currentExperience >= requiredExperience;
} 