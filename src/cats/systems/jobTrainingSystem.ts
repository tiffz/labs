import type { JobData } from '../data/jobData';

interface TrainingResult {
  experienceGained: number;
  loveCost: number;
  wasLucky: boolean; // For juicy feedback when player gets bonus experience
  bonusAmount?: number;
}

interface TrainingConfig {
  baseLoveCost: number;
  baseExperienceGain: number;
  randomnessRange: number; // +/- percentage variance
  luckChance: number; // Chance for bonus experience
  luckMultiplier: number; // Bonus multiplier when lucky
}

// Training configurations for different job types
const trainingConfigs: { [jobId: string]: TrainingConfig } = {
  box_factory: {
    baseLoveCost: 3,
    baseExperienceGain: 4,
    randomnessRange: 0.4, // ±40% variance
    luckChance: 0.20, // 20% chance for bonus
    luckMultiplier: 2.0, // Double experience when lucky
  },
  software_developer: {
    baseLoveCost: 5,
    baseExperienceGain: 5,
    randomnessRange: 0.5, // ±50% variance (more unpredictable)
    luckChance: 0.25, // 25% chance for bonus
    luckMultiplier: 1.8,
  },
  librarian: {
    baseLoveCost: 8,
    baseExperienceGain: 6,
    randomnessRange: 0.3, // ±30% variance (more stable)
    luckChance: 0.30, // 30% chance for bonus
    luckMultiplier: 1.5,
  },
  chef: {
    baseLoveCost: 12,
    baseExperienceGain: 7,
    randomnessRange: 0.35, // ±35% variance (creative but precise)
    luckChance: 0.22, // 22% chance for bonus
    luckMultiplier: 2.2, // High rewards for culinary inspiration
  },
  artist: {
    baseLoveCost: 15,
    baseExperienceGain: 6,
    randomnessRange: 0.6, // ±60% variance (very creative/unpredictable)
    luckChance: 0.35, // 35% chance for bonus
    luckMultiplier: 1.6, // Steady artistic growth
  },
  detective: {
    baseLoveCost: 20,
    baseExperienceGain: 8,
    randomnessRange: 0.3, // ±30% variance (methodical investigation)
    luckChance: 0.18, // 18% chance for bonus
    luckMultiplier: 2.5, // Big breakthroughs when they happen
  },
  scientist: {
    baseLoveCost: 25,
    baseExperienceGain: 9,
    randomnessRange: 0.4, // ±40% variance (experimental nature)
    luckChance: 0.15, // 15% chance for bonus
    luckMultiplier: 3.0, // Major discoveries have huge impact
  },
  astronaut: {
    baseLoveCost: 35,
    baseExperienceGain: 10,
    randomnessRange: 0.25, // ±25% variance (precision required)
    luckChance: 0.12, // 12% chance for bonus
    luckMultiplier: 2.8, // Space missions are high-stakes
  },
  entrepreneur: {
    baseLoveCost: 50,
    baseExperienceGain: 12,
    randomnessRange: 0.7, // ±70% variance (most unpredictable)
    luckChance: 0.20, // 20% chance for bonus
    luckMultiplier: 3.5, // Startup success can be explosive
  },
};

// Default config for jobs without specific training configs
const defaultTrainingConfig: TrainingConfig = {
  baseLoveCost: 15,
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
  
  // Gentle start, aggressive later scaling for better player experience
  // First 20 experience points: gentle polynomial growth (1.6 exponent)
  // After 20 experience: exponential growth kicks in
  let experienceMultiplier: number;
  
  if (currentExperience <= 20) {
    // Gentle polynomial scaling: starts at 1x, grows slowly
    experienceMultiplier = 1 + Math.pow(currentExperience, 1.6) * 0.008;
  } else {
    // Switch to exponential after experience 20
    const gentlePhaseMax = 1 + Math.pow(20, 1.6) * 0.008; // ~2.4x at experience 20
    const exponentialGrowth = Math.pow(1.12, currentExperience - 20); // 1.12^(exp-20)
    experienceMultiplier = gentlePhaseMax * exponentialGrowth;
  }
  
  // Additional job-tier scaling - later jobs cost more
  const jobTierMultipliers: { [key: string]: number } = {
    'box_factory': 1.0,
    'software_developer': 1.2,
    'librarian': 1.4,
    'chef': 1.8,
    'artist': 2.2,
    'detective': 2.8,
    'scientist': 3.5,
    'astronaut': 4.5,
    'entrepreneur': 6.0
  };
  
  const tierMultiplier = jobTierMultipliers[jobId] || 1.0;
  
  return Math.ceil(config.baseLoveCost * experienceMultiplier * tierMultiplier);
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