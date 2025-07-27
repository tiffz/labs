import React from 'react';
import type { UpgradeData } from '../../data/upgradeData';
import { getInfiniteUpgradeCost, getInfiniteUpgradeEffect, getInfiniteUpgradeName } from '../../data/upgradeData';
import CostDisplay from '../ui/CostDisplay';

interface UpgradeProps {
  upgrade: UpgradeData;
  level: number;
  onUpgrade: () => void;
  canUpgrade: boolean;
  currentTreats: number;
  currentLove: number;
}

const Upgrade: React.FC<UpgradeProps> = ({ 
  upgrade, 
  level, 
  onUpgrade, 
  canUpgrade, 
  currentTreats, 
  currentLove 
}) => {

  const usePredefinedLevel = level < upgrade.levels.length;
  
  // Get next level info (predefined or infinite)
  const nextLevel = usePredefinedLevel 
    ? upgrade.levels[level]
    : null;
    
  const infiniteCost = usePredefinedLevel 
    ? null 
    : getInfiniteUpgradeCost(upgrade, level);
    
  const infiniteEffect = usePredefinedLevel 
    ? null 
    : getInfiniteUpgradeEffect(upgrade, level);
    
  const infiniteName = usePredefinedLevel 
    ? null 
    : getInfiniteUpgradeName(upgrade, level);
  
  // Calculate current effect
  let currentEffect = upgrade.baseEffect;
  // Add effects from predefined levels
  for (let i = 0; i < Math.min(level, upgrade.levels.length); i++) {
    currentEffect += upgrade.levels[i].effect;
  }
  // Add effects from infinite levels
  for (let i = upgrade.levels.length; i < level; i++) {
    const infiniteEffectValue = getInfiniteUpgradeEffect(upgrade, i);
    if (infiniteEffectValue) {
      currentEffect += infiniteEffectValue;
    }
  }

  const formatEffect = (value: number, type: string) => {
    if (type === 'conversion_rate') {
      return `${value.toFixed(1)} treats/sec`;
    } else {
      return `${value.toFixed(1)}x love`;
    }
  };

  return (
    <div className="upgrade-item">
      <div className="upgrade-header">
        <div className="upgrade-info">
          <h4 className="upgrade-name">{upgrade.name}</h4>
          <p className="upgrade-description">{upgrade.description}</p>
        </div>
      </div>
      
      <div className="upgrade-stats">
        <div className="current-effect">
          Current: {formatEffect(currentEffect, upgrade.type)}
        </div>
        {level > 0 && (
          <div className="upgrade-level">
            Level {level}
            {usePredefinedLevel && level > 0 ? `: ${upgrade.levels[level - 1].name}` : ''}
          </div>
        )}
      </div>

      <div className="upgrade-purchase">
        <div className="next-upgrade">
          <strong>Next:</strong> {usePredefinedLevel ? nextLevel!.name : infiniteName}
          <br />
          Effect: {formatEffect(
            currentEffect + (usePredefinedLevel ? nextLevel!.effect : infiniteEffect!), 
            upgrade.type
          )}
        </div>
        
        <CostDisplay
          treatCost={usePredefinedLevel ? nextLevel!.treatCost : infiniteCost!.treatCost}
          loveCost={usePredefinedLevel ? nextLevel!.loveCost : infiniteCost!.loveCost}
          currentTreats={currentTreats}
          currentLove={currentLove}
        />
        
        <button 
          className={`upgrade-button ${canUpgrade ? 'available' : 'disabled'}`}
          onClick={onUpgrade}
          disabled={!canUpgrade}
        >
          {canUpgrade ? 'Upgrade' : 'Can\'t Afford'}
        </button>
      </div>
    </div>
  );
};

export default Upgrade; 