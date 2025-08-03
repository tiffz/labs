import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import type { Merit } from '../../data/meritData';
import MaterialIcon from '../../icons/MaterialIcon';
// Using MaterialIcon for consistency
import HeartIcon from '../../icons/HeartIcon';
import FishIcon from '../../icons/FishIcon';
import { 
  meritUpgradeData, 
  getMeritUpgradeCost,
  getAvailableMeritPoints 
} from '../../data/meritUpgradeData';

interface MeritsPanelProps {
  earnedMerits: Merit[];
  availableMerits: Merit[];
  // Merit upgrades props
  spentMerits: { [upgradeId: string]: number };
  onPurchaseUpgrade: (upgradeId: string) => void;
}

const MeritsPanel: React.FC<MeritsPanelProps> = ({
  earnedMerits,
  availableMerits,
  spentMerits,
  onPurchaseUpgrade,
}) => {
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [showAchievements, setShowAchievements] = useState(false);
  const [showMeritBreakdown, setShowMeritBreakdown] = useState(false);
  const [meritBreakdownPosition, setMeritBreakdownPosition] = useState({ top: 0, left: 0 });


  const availablePoints = getAvailableMeritPoints(earnedMerits.map(m => m.id), spentMerits);

  const handleUpgradeClick = (upgradeId: string) => {
    const currentLevel = spentMerits[upgradeId] || 0;
    const upgrade = meritUpgradeData.find(u => u.id === upgradeId);
    if (!upgrade) return;

    const cost = getMeritUpgradeCost(currentLevel);
    
    if (availablePoints >= cost && currentLevel < upgrade.maxLevel) {
      onPurchaseUpgrade(upgradeId);
    }
  };

  const formatEffectDescription = (effectType: string, effectAmount: number, level: number) => {
    const totalEffect = (effectAmount * level * 100).toFixed(0);
    switch (effectType) {
      case 'love_per_pet_multiplier':
        return level === 0 ? `Each level: +${(effectAmount * 100).toFixed(0)}% love from petting` : `+${totalEffect}% love from petting`;
      case 'love_per_pounce_multiplier':
        return level === 0 ? `Each level: +${(effectAmount * 100).toFixed(0)}% love from pouncing` : `+${totalEffect}% love from pouncing`;
      case 'furniture_love_multiplier':
        return level === 0 ? `Each level: +${(effectAmount * 100).toFixed(0)}% love from furniture` : `+${totalEffect}% love from furniture`;
      case 'feeding_effect_multiplier':
        return level === 0 ? `Each level: +${(effectAmount * 100).toFixed(0)}% feeding effectiveness` : `+${totalEffect}% feeding effectiveness`;
      case 'job_treats_multiplier':
        return level === 0 ? `Each level: +${(effectAmount * 100).toFixed(0)}% treats from jobs` : `+${totalEffect}% treats from jobs`;
      case 'love_per_interaction_multiplier':
        return level === 0 ? `Each level: +${(effectAmount * 100).toFixed(0)}% to all love gains` : `+${totalEffect}% to all love gains`;
      default:
        return level === 0 ? `Each level: +${(effectAmount * 100).toFixed(0)}% effect` : `+${totalEffect}% effect`;
    }
  };

  const handleMeritHover = (merit: Merit, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      top: rect.top - 10,
      left: rect.left - 280, // Position further to the left to avoid cutoff
    });
    setShowTooltip(merit.id);
  };

  const handleMeritLeave = () => {
    setShowTooltip(null);
  };

  return (
    <div className="panel merits-panel">
      <div className="merits-header">
        <p className="merits-flavor-text">Help your cat live their best life.</p>
        


        {/* Sub-navigation */}
        <div className="merit-subtabs">
          <button
            className={`merit-subtab ${!showAchievements ? 'active' : ''}`}
            onClick={() => setShowAchievements(false)}
          >
            <MaterialIcon icon="kid_star" className="subtab-icon" />
            <span>Upgrades</span>
            {availablePoints > 0 && <span className="available-badge">{availablePoints}</span>}
          </button>
          <button
            className={`merit-subtab ${showAchievements ? 'active' : ''}`}
            onClick={() => setShowAchievements(true)}
          >
            <MaterialIcon icon="emoji_events" className="subtab-icon" />
            <span>Achievements</span>
            <span className="achievement-count">({earnedMerits.length}/{earnedMerits.length + availableMerits.length})</span>
          </button>
        </div>
      </div>

            {/* Player Upgrades Section - Only show when achievements are hidden */}
      {!showAchievements && (
        <div className="merit-upgrades-section">
          <div 
            className="upgrades-available-info"
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setMeritBreakdownPosition({
                top: rect.top - 10,
                left: rect.right + 10,
              });
              setShowMeritBreakdown(true);
            }}
            onMouseLeave={() => setShowMeritBreakdown(false)}
          >
            <MaterialIcon icon="kid_star" className="merit-icon" />
            {availablePoints}
          </div>
          
          <div className="merit-upgrades-compact">
            {meritUpgradeData.map((upgrade) => {
              const currentLevel = spentMerits[upgrade.id] || 0;
              const cost = getMeritUpgradeCost(currentLevel);
              const isMaxLevel = currentLevel >= upgrade.maxLevel;
              const canAfford = availablePoints >= cost && !isMaxLevel;
              
              return (
                <div key={upgrade.id} className="merit-upgrade-row">
                  <div className="upgrade-info">
                    <MaterialIcon icon={upgrade.icon} className="upgrade-icon" />
                    <div className="upgrade-details">
                      <div className="upgrade-name">{upgrade.name}</div>
                      <div className="upgrade-effect">
                        {formatEffectDescription(upgrade.effectType, upgrade.effectAmount, currentLevel)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="upgrade-progress">
                    <div className="level-indicators">
                      {Array.from({ length: upgrade.maxLevel }, (_, i) => (
                        <div
                          key={i}
                          className={`level-notch ${i < currentLevel ? 'filled' : ''}`}
                        />
                      ))}
                    </div>
                    <div className="level-text">{currentLevel}/{upgrade.maxLevel}</div>
                  </div>
                  
                  <div className="upgrade-action">
                    {isMaxLevel ? (
                      <div className="maxed-badge">MAX</div>
                    ) : (
                      <button
                          className={`upgrade-btn ${canAfford ? 'available' : 'disabled'}`}
                          onClick={() => handleUpgradeClick(upgrade.id)}
                          disabled={!canAfford}
                          title={`Upgrade for ${cost} merit${cost === 1 ? '' : 's'}`}
                        >
                          <MaterialIcon icon="kid_star" className="cost-star" />
                          <span>Buy ({cost})</span>
                        </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Merit Achievements Section - Only show when toggled */}
      {showAchievements && (
        <div className="merit-achievements-section">
          
          <div className="merit-badges-container">
            {[...earnedMerits, ...availableMerits].map((merit) => {
              const isEarned = earnedMerits.some(e => e.id === merit.id);
              
              return (
                <div 
                  key={merit.id} 
                  className="merit-badge-wrapper"
                  onMouseEnter={(e) => handleMeritHover(merit, e)}
                  onMouseLeave={handleMeritLeave}
                >
                  <div 
                    className={`merit-badge ${isEarned ? 'earned' : 'locked'}`}
                  >
                    {/* Main Badge Circle */}
                    <div 
                      className="badge-circle"
                      style={{ 
                        '--merit-color': merit.color,
                        '--merit-rgb': merit.color.replace('#', '').match(/.{2}/g)?.map(hex => parseInt(hex, 16)).join(', ')
                      } as React.CSSProperties}
                    >
                      {/* Badge Inner Ring with dynamic color */}
                      <div 
                        className="badge-inner-ring"
                        style={{ 
                          '--merit-color': merit.color,
                          '--merit-color-light': merit.color + '40' // Back to transparency approach for maximum visibility
                        } as React.CSSProperties}
                      >
                        <MaterialIcon 
                          icon={merit.icon} 
                          className="badge-icon"
                        />
                      </div>
                      
                      {/* Earned Badge Shine Effect */}
                      {isEarned && <div className="badge-shine"></div>}
                    </div>
                    
                    {/* Badge Title (always visible but small) */}
                    <div className="badge-title">{merit.title}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Merit Tooltip */}
      {showTooltip && ReactDOM.createPortal(
        (() => {
          const merit = [...earnedMerits, ...availableMerits].find(m => m.id === showTooltip);
          if (!merit) return null;
          
          const isEarned = earnedMerits.some(earned => earned.id === merit.id);
          
          return (
            <div 
              className="merit-badge-tooltip left-side"
              style={{
                position: 'fixed',
                top: `${tooltipPosition.top}px`,
                left: `${tooltipPosition.left}px`,
              }}
            >
              <div className="merit-tooltip-header">
                <MaterialIcon icon={merit.icon} className="merit-tooltip-icon" />
                <h4 className="merit-tooltip-title">{merit.title}</h4>
                <div className={`merit-status-badge ${isEarned ? 'earned' : 'locked'}`}>
                  {isEarned ? '✓ Earned' : 'Not Earned'}
                </div>
              </div>
              <p className="merit-tooltip-description">{merit.description}</p>
              <div className="merit-tooltip-details">
                <div className="merit-tooltip-requirement">
                  <strong>Requirement:</strong> {(() => {
                    switch (merit.type) {
                      case 'love_milestone':
                        return `Reach ${merit.target?.amount} love`;
                      case 'treats_milestone':
                        return `Reach ${merit.target?.amount} treats`;
                      case 'job_achievement':
                        return 'Get your first job';
                      case 'promotion_milestone':
                        return merit.target?.jobLevel ? `Reach level ${merit.target.jobLevel} in any job` : 'Get a promotion';
                      case 'purchase_achievement':
                        return 'Make a purchase';
                      default:
                        return merit.description;
                    }
                  })()}
                </div>
                {merit.reward && (
                  <div className="merit-tooltip-rewards">
                    <strong>Rewards:</strong>
                    {merit.reward.love && (
                      <span className="reward-detail love-reward">
                        +{merit.reward.love} <HeartIcon className="tooltip-breakdown-icon love-icon" />
                      </span>
                    )}
                    {merit.reward.treats && (
                      <span className="reward-detail treats-reward">
                        +{merit.reward.treats} <FishIcon className="tooltip-breakdown-icon treats-icon" />
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })(),
        document.body
      )}

      {/* Merit Breakdown Tooltip */}
      {showMeritBreakdown && ReactDOM.createPortal(
        (() => {
          const totalEarned = earnedMerits.length;
          const totalSpent = Object.values(spentMerits).reduce((sum, level) => {
            // Calculate total merits spent for this upgrade (1+2+3+...+level)
            return sum + (level * (level + 1)) / 2;
          }, 0);
          
          return (
            <div 
              className="merit-badge-tooltip right-side"
              style={{
                position: 'fixed',
                top: `${meritBreakdownPosition.top}px`,
                left: `${meritBreakdownPosition.left}px`,
              }}
            >
              <div className="merit-tooltip-header">
                <MaterialIcon icon="kid_star" className="merit-tooltip-icon" />
                <h4 className="merit-tooltip-title">Merit Points</h4>
              </div>
              <p className="merit-tooltip-description">
                Earned from completing achievements and reaching milestones.
              </p>
              <div className="merit-tooltip-details">
                <div className="merit-breakdown-line">
                  <strong>Total Earned:</strong> {totalEarned}
                </div>
                <div className="merit-breakdown-line">
                  <strong>Spent on Upgrades:</strong> {totalSpent}
                </div>
                <div className="merit-breakdown-line">
                  <strong>Available:</strong> {availablePoints}
                </div>
              </div>
            </div>
          );
        })(),
        document.body
      )}
    </div>
  );
};

export default MeritsPanel;