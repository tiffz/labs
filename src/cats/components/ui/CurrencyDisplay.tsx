/**
 * Currency Display Component
 * 
 * Displays love and treats with tooltips. Extracted from App.tsx to improve
 * component organization and reusability.
 */

import React from 'react';
import HeartIcon from '../../icons/HeartIcon';
import FishIcon from '../../icons/FishIcon';
import CurrencyTooltip from './CurrencyTooltip';
import type { EconomyCalculations } from '../../services/GameEconomyService';

interface CurrencyDisplayProps {
  love: number;
  treats: number;
  economy: EconomyCalculations;
}

const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  love,
  treats,
  economy
}) => {
  const { treatsPerSecond, conversionRate, loveMultiplier, baseLovePerInteraction } = economy;

  return (
    <div className="currency-display">
      <CurrencyTooltip
        type="love"
        treatsPerSecond={treatsPerSecond}
        conversionRate={conversionRate}
        loveMultiplier={loveMultiplier}
        currentTreats={treats}
        baseLovePerInteraction={baseLovePerInteraction}
      >
        <div className="currency-chip">
          <HeartIcon className="currency-icon" />
          <span className="currency-value">{love.toFixed(0)}</span>
        </div>
      </CurrencyTooltip>
      <CurrencyTooltip
        type="treats"
        treatsPerSecond={treatsPerSecond}
        conversionRate={conversionRate}
        loveMultiplier={loveMultiplier}
        currentTreats={treats}
      >
        <div className="currency-chip">
          <FishIcon className="currency-icon" />
          <span className="currency-value" data-testid="treats-amount">{treats.toFixed(0)}</span>
        </div>
      </CurrencyTooltip>
    </div>
  );
};

export default CurrencyDisplay;