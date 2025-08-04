/**
 * GameStateManager Hook
 * 
 * Centralizes all game state mutations to reduce coupling and improve maintainability.
 * Replaces scattered setGameState calls throughout App.tsx with a clean, typed interface.
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { GameState } from '../game/types';
import { performTraining, canPromoteToNextLevel } from '../systems/jobTrainingSystem';
import { performInterview, canAffordInterview } from '../systems/interviewSystem';
import { getMeritUpgradeCost } from '../data/meritUpgradeData';
import { getThingPrice, thingsData } from '../data/thingsData';
import { jobData } from '../data/jobData';

interface GameStateManager {
  // Current state
  gameState: GameState;
  
  // Currency operations
  currency: {
    addLove: (amount: number) => void;
    addTreats: (amount: number) => void;
    applyPassiveIncome: (finalTreats: number, loveGained: number) => void;
  };
  
  // Job system operations
  jobs: {
    promoteJob: (jobId: string) => boolean;
    trainForJob: (jobId: string) => boolean;
    interviewForJob: (jobId: string) => boolean;
  };
  
  // Purchase operations
  purchases: {
    buyUpgrade: (upgradeId: string) => boolean;
    buyThing: (thingId: string) => boolean;
  };
  
  // Debug operations (only in dev mode)
  debug: {
    giveDebugLove: () => void;
    giveDebugTreats: () => void;
    skipTime: (finalTreats: number, loveGained: number) => void;
  };
  
  // Direct state access for external systems (like achievements)
  updateState: React.Dispatch<React.SetStateAction<GameState>>;
}

interface GameStateManagerProps {
  initialState: GameState;
}

export const useGameStateManager = ({ 
  initialState 
}: GameStateManagerProps): GameStateManager => {
  const [gameState, setGameState] = useState<GameState>(initialState);
  
  // === Currency Operations ===
  
  const addLove = useCallback((amount: number) => {
    setGameState(current => ({ 
      ...current, 
      love: current.love + amount
    }));
  }, []);
  
  const addTreats = useCallback((amount: number) => {
    setGameState(current => ({ 
      ...current, 
      treats: current.treats + amount 
    }));
  }, []);
  
  const applyPassiveIncome = useCallback((finalTreats: number, loveGained: number) => {
    setGameState(current => ({ 
      ...current, 
      treats: finalTreats, 
      love: current.love + loveGained 
    }));
  }, []);
  
  // === Job System Operations ===
  
  const promoteJob = useCallback((jobId: string): boolean => {
    const currentLevel = gameState.jobLevels[jobId] || 0;
    const currentExperience = gameState.jobExperience[jobId] || 0;
    const interviewState = gameState.jobInterviews[jobId];
    const job = jobData.find(j => j.id === jobId);
    
    if (!job || currentLevel >= job.levels.length) return false;
    
    // If level 0 (unemployed), this is accepting a job offer
    if (currentLevel === 0) {
      // Must have a job offer to accept
      if (!interviewState?.hasOffer) return false;
      
      // Accept the job offer - clear interview state and set to level 1
      setGameState(prev => ({
        ...prev,
        jobLevels: { ...prev.jobLevels, [jobId]: 1 },
        jobInterviews: { 
          ...prev.jobInterviews, 
          [jobId]: { hasOffer: false, lastRejectionReason: undefined } 
        },
      }));
      return true;
    } else {
      // Regular promotion (level > 0) - check experience requirements  
      if (!canPromoteToNextLevel(jobData, jobId, currentLevel, currentExperience)) return false;
      
      // Promotions are purely experience-based, no love cost
      setGameState(prev => ({
        ...prev,
        jobLevels: { ...prev.jobLevels, [jobId]: currentLevel + 1 },
      }));
      return true;
    }
  }, [gameState.jobLevels, gameState.jobExperience, gameState.jobInterviews]);
  
  const trainForJob = useCallback((jobId: string): boolean => {
    const currentExperience = gameState.jobExperience[jobId] || 0;
    const trainingResult = performTraining(jobId, currentExperience);
    
    if (gameState.love >= trainingResult.loveCost) {
      setGameState(prev => ({
        ...prev,
        love: prev.love - trainingResult.loveCost,
        jobExperience: { 
          ...prev.jobExperience, 
          [jobId]: (prev.jobExperience[jobId] || 0) + trainingResult.experienceGained 
        },
      }));
      
      // Training completed successfully
      return true;
    }
    return false;
  }, [gameState.love, gameState.jobExperience]);
  
  const interviewForJob = useCallback((jobId: string): boolean => {
    if (!canAffordInterview(gameState.love, jobId)) return false;
    
    const interviewResult = performInterview(jobId);
    
    // Deduct love cost and update interview state
    setGameState(prev => ({
      ...prev,
      love: prev.love - interviewResult.loveCost,
      jobInterviews: {
        ...prev.jobInterviews,
        [jobId]: {
          hasOffer: interviewResult.success,
          lastRejectionReason: interviewResult.success ? undefined : interviewResult.message,
        },
      },
    }));
    
    // Interview attempt completed
    return interviewResult.success;
  }, [gameState.love]);
  
  // === Purchase Operations ===
  
  const buyUpgrade = useCallback((upgradeId: string): boolean => {
    const currentLevel = gameState.spentMerits[upgradeId] || 0;
    const cost = getMeritUpgradeCost(currentLevel);
    const availablePoints = gameState.earnedMerits.length - Object.values(gameState.spentMerits).reduce((sum, spent) => sum + spent, 0);
    
    // Check if player can afford this upgrade
    if (availablePoints < cost) {
      return false;
    }
    
    // Apply the upgrade
    setGameState(prev => ({
      ...prev,
      spentMerits: {
        ...prev.spentMerits,
        [upgradeId]: currentLevel + 1
      }
    }));
    return true;
  }, [gameState.spentMerits, gameState.earnedMerits]);
  
  const buyThing = useCallback((thingId: string): boolean => {
    const currentQuantity = gameState.thingQuantities[thingId] || 0;
    const thing = thingsData.find(t => t.id === thingId);
    if (!thing) return false;
    
    const price = getThingPrice(thing, currentQuantity);
    
    if (gameState.treats >= price) {
      setGameState(prev => ({
        ...prev,
        treats: prev.treats - price,
        thingQuantities: { ...prev.thingQuantities, [thingId]: currentQuantity + 1 },
      }));
      return true;
    }
    return false;
  }, [gameState.treats, gameState.thingQuantities]);
  
  // === Debug Operations ===
  
  const giveDebugLove = useCallback(() => {
    setGameState(prev => ({ ...prev, love: prev.love + 1000 }));
  }, []);
  
  const giveDebugTreats = useCallback(() => {
    setGameState(prev => ({ ...prev, treats: prev.treats + 1000 }));
  }, []);
  
  const skipTime = useCallback((finalTreats: number, loveGained: number) => {
    setGameState(prev => ({ 
      ...prev, 
      treats: finalTreats, 
      love: prev.love + loveGained 
    }));
  }, []);
  
  // === Direct State Access (for external systems like achievements) ===
  
  const updateState = useCallback((value: React.SetStateAction<GameState>) => {
    setGameState(value);
  }, []);
  
  return useMemo(() => ({
    gameState,
    currency: {
      addLove,
      addTreats,
      applyPassiveIncome,
    },
    jobs: {
      promoteJob,
      trainForJob,
      interviewForJob,
    },
    purchases: {
      buyUpgrade,
      buyThing,
    },
    debug: {
      giveDebugLove,
      giveDebugTreats,
      skipTime,
    },
    updateState,
  }), [
    gameState,
    addLove,
    addTreats,
    applyPassiveIncome,
    promoteJob,
    trainForJob,
    interviewForJob,
    buyUpgrade,
    buyThing,
    giveDebugLove,
    giveDebugTreats,
    skipTime,
    updateState,
  ]);
};