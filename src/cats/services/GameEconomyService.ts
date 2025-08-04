/**
 * Game Economy Service
 * 
 * Centralizes all complex economic calculations previously scattered in App.tsx.
 * Handles treats per second, conversion rates, multipliers, and passive income.
 */

import { jobData } from '../data/jobData';
import { thingsData, getThingTotalEffect } from '../data/thingsData';
import { getTotalMeritUpgradeMultiplier } from '../data/meritUpgradeData';
import { calculateBaseLovePerInteraction } from '../systems/lovePerInteractionSystem';
import type { GameState } from '../game/types';

export interface EconomyCalculations {
  treatsPerSecond: number;
  conversionRate: number;
  loveMultiplier: number;
  autoLovePerSecond: number;
  baseLovePerInteraction: number;
  meritMultipliers: {
    lovePetMultiplier: number;
    lovePounceMultiplier: number;
    loveInteractionMultiplier: number;
  };
}

interface PassiveIncomeResult {
  treatsGained: number;
  treatsToConvert: number;
  loveGained: number;
  autoLoveGained: number;
  finalTreats: number;
}

export class GameEconomyService {
  /**
   * Calculate all economic values based on current game state
   */
  static calculateEconomy(gameState: GameState): EconomyCalculations {
    const { jobLevels, thingQuantities, spentMerits, love } = gameState;

    // Calculate treats per second from jobs
    const treatsPerSecond = jobData.reduce((total, job) => {
      const currentLevel = jobLevels[job.id] || 0;
      if (currentLevel > 0) {
        return total + job.levels[currentLevel - 1].treatsPerSecond;
      }
      return total;
    }, 0);

    // Calculate treat-to-love conversion rate from Things effects
    const conversionRate = thingsData
      .filter(thing => thing.category === 'feeding' && thing.effectType === 'treat_consumption_rate')
      .reduce((total, thing) => {
        const quantity = thingQuantities[thing.id] || 0;
        return total + getThingTotalEffect(thing, quantity);
      }, 0); // Base conversion rate is 0 - must buy food bowl or ceramic bowl to start conversion

    // Calculate love multiplier from love per treat Things
    const loveMultiplier = 1 + thingsData
      .filter(thing => thing.category === 'feeding' && thing.effectType === 'love_per_treat')
      .reduce((total, thing) => {
        const quantity = thingQuantities[thing.id] || 0;
        return total + getThingTotalEffect(thing, quantity);
      }, 0); // Base love multiplier is 1 love per treat

    // Calculate auto love per second from environment Things
    const autoLovePerSecond = thingsData
      .filter(thing => thing.category === 'environment' && thing.effectType === 'auto_love_rate')
      .reduce((total, thing) => {
        const quantity = thingQuantities[thing.id] || 0;
        return total + getThingTotalEffect(thing, quantity);
      }, 0);

    // Calculate base love per interaction from current love on hand
    const baseLovePerInteraction = calculateBaseLovePerInteraction(love);

    // Calculate merit-based multipliers
    const meritMultipliers = {
      lovePetMultiplier: getTotalMeritUpgradeMultiplier(spentMerits, 'love_per_pet_multiplier'),
      lovePounceMultiplier: getTotalMeritUpgradeMultiplier(spentMerits, 'love_per_pounce_multiplier'),
      loveInteractionMultiplier: getTotalMeritUpgradeMultiplier(spentMerits, 'love_per_interaction_multiplier'),
    };

    return {
      treatsPerSecond,
      conversionRate,
      loveMultiplier,
      autoLovePerSecond,
      baseLovePerInteraction,
      meritMultipliers,
    };
  }

  /**
   * Calculate passive income for a given time period
   */
  static calculatePassiveIncome(
    currentTreats: number,
    deltaTimeSeconds: number,
    economy: EconomyCalculations
  ): PassiveIncomeResult {
    const { treatsPerSecond, conversionRate, loveMultiplier, autoLovePerSecond } = economy;

    // Calculate treats gained from jobs
    const treatsGained = treatsPerSecond * deltaTimeSeconds;
    
    // Calculate total treats after gaining from jobs
    const totalTreats = currentTreats + treatsGained;
    
    // Calculate how many treats can be converted to love
    const maxConvertibleTreats = conversionRate * deltaTimeSeconds;
    const treatsToConvert = Math.min(totalTreats, maxConvertibleTreats);
    
    // Calculate love gained from treats and auto-generation
    const loveFromTreats = treatsToConvert * loveMultiplier;
    const autoLoveGained = autoLovePerSecond * deltaTimeSeconds;
    const totalLoveGained = loveFromTreats + autoLoveGained;
    const finalTreats = totalTreats - treatsToConvert;
    
    return {
      treatsGained,
      treatsToConvert,
      loveGained: totalLoveGained,
      autoLoveGained,
      finalTreats
    };
  }

  /**
   * Convenience method for calculating passive income with automatic economy calculation
   */
  static calculatePassiveIncomeFromState(
    gameState: GameState,
    deltaTimeSeconds: number
  ): PassiveIncomeResult {
    const economy = this.calculateEconomy(gameState);
    return this.calculatePassiveIncome(gameState.treats, deltaTimeSeconds, economy);
  }
}