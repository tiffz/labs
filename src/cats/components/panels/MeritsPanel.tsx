import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import type { Milestone, Award } from '../../data/achievementData';
import MaterialIcon from '../../icons/MaterialIcon';
import { 
  meritUpgradeData, 
  getMeritUpgradeCost,
  getAvailableMeritPoints 
} from '../../data/meritUpgradeData';
import MilestonePanel from './MilestonePanel';
import AwardPanel from './AwardPanel';

interface MeritsPanelProps {
  earnedMerits: Milestone[];
  availableMerits: Milestone[];
  earnedAwards: Award[];
  availableAwards: Award[];
  // Merit upgrades props
  spentMerits: { [upgradeId: string]: number };
  onPurchaseUpgrade: (upgradeId: string) => void;
  // Game state for progress tracking
  currentLove: number;
  currentTreats: number;
  currentJobLevels: { [key: string]: number };
  currentThingQuantities: { [key: string]: number };
  specialActions: {
    noseClicks: number;
    earClicks: number;
    cheekPets: number;
    happyJumps: number;
  };
}

const MeritsPanel: React.FC<MeritsPanelProps> = ({
  earnedMerits,
  availableMerits,
  earnedAwards,
  availableAwards,
  spentMerits,
  onPurchaseUpgrade,
  currentLove,
  currentTreats,
  currentJobLevels,
  currentThingQuantities,
  specialActions,
}) => {
  const [activeTab, setActiveTab] = useState<'upgrades' | 'milestones' | 'awards'>('upgrades');
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

  // Removed unused merit hover handlers - now handled by individual panels

  return (
    <div className="panel merits-panel">
      <div className="merits-header">
        <p className="merits-flavor-text">Help your cat live their best life.</p>
        


        {/* Sub-navigation */}
        <div className="merit-subtabs">
          <button
            className={`merit-subtab ${activeTab === 'upgrades' ? 'active' : ''}`}
            onClick={() => setActiveTab('upgrades')}
          >
            <MaterialIcon icon="kid_star" className="subtab-icon" />
            <span>Upgrades</span>
            {availablePoints > 0 && <span className="available-badge">{availablePoints}</span>}
          </button>
          <button
            className={`merit-subtab ${activeTab === 'milestones' ? 'active' : ''}`}
            onClick={() => setActiveTab('milestones')}
          >
            <MaterialIcon icon="timeline" className="subtab-icon" />
            <span>Milestones</span>
            <span className="achievement-count">({earnedMerits.length}/{earnedMerits.length + availableMerits.length})</span>
          </button>
          <button
            className={`merit-subtab ${activeTab === 'awards' ? 'active' : ''}`}
            onClick={() => setActiveTab('awards')}
          >
            <MaterialIcon icon="emoji_events" className="subtab-icon" />
            <span>Awards</span>
            <span className="achievement-count">({earnedAwards.length}/{earnedAwards.length + availableAwards.length})</span>
          </button>
        </div>
      </div>

            {/* Player Upgrades Section */}
      {activeTab === 'upgrades' && (
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

      {/* Milestones Section */}
      {activeTab === 'milestones' && (
        <MilestonePanel
          earnedMilestones={earnedMerits}
          availableMilestones={availableMerits}
          currentLove={currentLove}
          currentTreats={currentTreats}
          currentJobLevels={currentJobLevels}
          currentThingQuantities={currentThingQuantities}
        />
      )}

      {/* Awards Section */}
      {activeTab === 'awards' && (
        <AwardPanel
          earnedAwards={earnedAwards}
          availableAwards={availableAwards}
          specialActions={specialActions}
        />
      )}

      {/* Tooltips are now handled by individual panels */}

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