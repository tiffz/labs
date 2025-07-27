import React from 'react';
import { playingUpgradeData, getInfinitePlayingUpgradeCost } from '../../data/playingUpgradeData';
import PlayingUpgrade from './PlayingUpgrade';

interface PlayingPanelProps {
  playingUpgradeLevels: { [key: string]: number };
  onPlayingUpgrade: (upgradeId: string) => void;
  currentLove: number;
  lovePerClick: number;
  lovePerPounce: number;
}

const PlayingPanel: React.FC<PlayingPanelProps> = ({ 
  playingUpgradeLevels, 
  onPlayingUpgrade, 
  currentLove,
  lovePerClick,
  lovePerPounce
}) => {
  const canAffordUpgrade = (upgradeId: string) => {
    const currentLevel = playingUpgradeLevels[upgradeId] || 0;
    const upgrade = playingUpgradeData.find(u => u.id === upgradeId);
    if (!upgrade) return false;
    
    // Determine if using predefined or infinite level
    const usePredefinedLevel = currentLevel < upgrade.levels.length;
    
    if (usePredefinedLevel) {
      const upgradeLevel = upgrade.levels[currentLevel];
      return currentLove >= upgradeLevel.loveCost;
    } else {
      const infiniteCost = getInfinitePlayingUpgradeCost(upgrade, currentLevel);
      if (!infiniteCost) return false;
      return currentLove >= infiniteCost.loveCost;
    }
  };

  return (
    <div className="playing-panel">
      <h3>Playing & Interaction</h3>
      <p className="panel-intro">
        Improve your relationship and interaction skills with your cat.
      </p>
      
      <div className="playing-section">
        {playingUpgradeData.map((upgrade) => {
          // Pass the current actual values
          const upgradeWithValue = {
            ...upgrade,
            currentValue: upgrade.id === 'love_per_pet' ? lovePerClick : lovePerPounce
          };
          
          return (
            <PlayingUpgrade
              key={upgrade.id}
              upgrade={upgradeWithValue}
              level={playingUpgradeLevels[upgrade.id] || 0}
              onUpgrade={() => onPlayingUpgrade(upgrade.id)}
              canUpgrade={canAffordUpgrade(upgrade.id)}
              currentLove={currentLove}
            />
          );
        })}
      </div>
    </div>
  );
};

export default PlayingPanel; 