import React from 'react';
import type { PlayingUpgradeData } from '../../data/playingUpgradeData';
import { getInfinitePlayingUpgradeCost, getInfinitePlayingUpgradeEffect, getInfinitePlayingUpgradeName } from '../../data/playingUpgradeData';
import CostDisplay from '../ui/CostDisplay';

interface PlayingUpgradeProps {
  upgrade: PlayingUpgradeData;
  level: number;
  onUpgrade: () => void;
  canUpgrade: boolean;
  currentLove: number;
}

const PlayingUpgrade: React.FC<PlayingUpgradeProps> = ({ 
  upgrade, 
  level, 
  onUpgrade, 
  canUpgrade, 
  currentLove 
}) => {

  const usePredefinedLevel = level < upgrade.levels.length;
  
  // Get next level info (predefined or infinite)
  const nextLevel = usePredefinedLevel 
    ? upgrade.levels[level]
    : null;
    
  const infiniteCost = usePredefinedLevel 
    ? null 
    : getInfinitePlayingUpgradeCost(upgrade, level);
    
  const infiniteEffect = usePredefinedLevel 
    ? null 
    : getInfinitePlayingUpgradeEffect(upgrade, level);
    
  const infiniteName = usePredefinedLevel 
    ? null 
    : getInfinitePlayingUpgradeName(upgrade, level);
  
  // Calculate current value based on upgrades
  let currentValue = upgrade.currentValue;
  // Add effects from predefined levels
  for (let i = 0; i < Math.min(level, upgrade.levels.length); i++) {
    currentValue += upgrade.levels[i].effect;
  }
  // Add effects from infinite levels
  for (let i = upgrade.levels.length; i < level; i++) {
    const infiniteEffectValue = getInfinitePlayingUpgradeEffect(upgrade, i);
    if (infiniteEffectValue) {
      currentValue += infiniteEffectValue;
    }
  }

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
          Current: {Math.round(currentValue)} ❤️ per action
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
          Effect: {Math.round(currentValue + (usePredefinedLevel ? nextLevel!.effect : infiniteEffect!))} ❤️ per action
        </div>
        
        <CostDisplay
          loveCost={usePredefinedLevel ? nextLevel!.loveCost : infiniteCost!.loveCost}
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

export default PlayingUpgrade; 