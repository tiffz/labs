import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import MaterialIcon from '../../icons/MaterialIcon';
import HeartIcon from '../../icons/HeartIcon';
import FishIcon from '../../icons/FishIcon';
import { gameAwards, type Award } from '../../data/awardData';

interface AwardPanelProps {
  earnedAwards: Award[];
  availableAwards: Award[];
  specialActions: {
    noseClicks: number;
    earClicks: number;
    cheekPets: number;
    happyJumps: number;
  };
}

const AwardPanel: React.FC<AwardPanelProps> = ({
  earnedAwards,
  specialActions,
}) => {
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0, arrowPosition: '140px' });

  const handleAwardHover = (award: Award, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const tooltipWidth = 280; // fixed width
    const tooltipHeight = 100; // fixed height
    
    // Position tooltip above, ensuring it doesn't go off screen
    const topPosition = Math.max(10, rect.top - tooltipHeight - 24);
    const leftPosition = Math.max(10, Math.min(window.innerWidth - tooltipWidth - 10, rect.left + rect.width / 2 - tooltipWidth / 2));
    
    // Calculate arrow position relative to tooltip (in pixels)
    const elementCenter = rect.left + rect.width / 2;
    const tooltipLeft = leftPosition;
    const relativeArrowPos = elementCenter - tooltipLeft;
    const clampedArrowPos = Math.max(16, Math.min(tooltipWidth - 16, relativeArrowPos));
    
    setTooltipPosition({
      top: topPosition,
      left: leftPosition,
      arrowPosition: `${clampedArrowPos}px`
    });
    setShowTooltip(award.id);
  };

  const handleAwardLeave = () => {
    setShowTooltip(null);
  };

  // Get the progress for an award (if applicable)
  const getAwardProgress = (award: Award): number | null => {
    if (!award.target || award.target.count === 1) return null;
    
    const requiredCount = award.target.count || 1;
    let currentCount = 0;
    
    switch (award.target.actionType) {
      case 'nose_click':
        currentCount = specialActions.noseClicks;
        break;
      case 'happy_jump':
        currentCount = specialActions.happyJumps;
        break;
      case 'ear_wiggle':
        currentCount = specialActions.earClicks;
        break;
      case 'cheek_pet':
        currentCount = specialActions.cheekPets;
        break;
      default:
        return null;
    }
    
    return Math.min(100, (currentCount / requiredCount) * 100);
  };

  // Show all awards - let the badge design handle the mystery

  return (
    <div className="award-panel">
      <p className="award-flavor-text">Uncover the secrets of cat.</p>
      
      <div className="awards-badges-container">
        {gameAwards.map(award => {
          const isEarned = earnedAwards.some(e => e.id === award.id);
          const progress = getAwardProgress(award);
          const shouldShowProgress = !isEarned && progress !== null && progress > 0;
          
          return (
            <div 
              key={award.id} 
              className="merit-badge-wrapper"
              onMouseEnter={(e) => handleAwardHover(award, e)}
              onMouseLeave={handleAwardLeave}
            >
              <div 
                className={`merit-badge ${isEarned ? 'earned' : 'locked'}`}
              >
                {/* Main Badge Circle */}
                <div 
                  className="badge-circle"
                  style={{ 
                    '--merit-color': award.color,
                    '--merit-rgb': award.color.replace('#', '').match(/.{2}/g)?.map(hex => parseInt(hex, 16)).join(', ')
                  } as React.CSSProperties}
                >
                  {/* Badge Inner Ring with dynamic color */}
                  <div 
                    className="badge-inner-ring"
                    style={{ 
                      '--merit-color': award.color,
                      '--merit-color-light': award.color + '40'
                    } as React.CSSProperties}
                  >
                    <MaterialIcon 
                      icon={isEarned ? award.icon : 'help_outline'} 
                      className="badge-icon"
                    />
                  </div>
                  
                  {/* Earned Badge Shine Effect */}
                  {isEarned && <div className="badge-shine"></div>}
                </div>
                
                {/* Badge Title */}
                <div className="badge-title">
                  {isEarned ? award.title : '???'}
                </div>
                
                {/* Progress indicator for awards in progress */}
                {shouldShowProgress && (
                  <div className="badge-progress">
                    <div 
                      className="badge-progress-fill"
                      style={{ 
                        width: `${progress}%`,
                        backgroundColor: award.color 
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Award Tooltip */}
      {showTooltip && ReactDOM.createPortal(
        (() => {
          const award = gameAwards.find(a => a.id === showTooltip);
          if (!award) return null;
          
          const isEarned = earnedAwards.some(e => e.id === award.id);
          
          return (
            <div 
              className="award-tooltip left-side"
              style={{
                position: 'fixed',
                top: `${tooltipPosition.top}px`,
                left: `${tooltipPosition.left}px`,
                '--arrow-position': tooltipPosition.arrowPosition,
              } as React.CSSProperties}
            >
              <div className="award-tooltip-header">
                <MaterialIcon icon={award.icon} className="award-tooltip-icon" />
                <h4 className="award-tooltip-title">{isEarned ? award.title : '???'}</h4>
                <div className={`award-status-badge ${isEarned ? 'earned' : 'locked'}`}>
                  {isEarned ? '✓ Unlocked' : 'In Progress'}
                </div>
              </div>
              <p className="award-tooltip-description">{isEarned ? award.description : 'A mysterious secret awaits discovery...'}</p>
              <div className="award-tooltip-details">
                {isEarned && award.target && (
                  <div className="award-tooltip-requirement">
                    <strong>Requirement:</strong> {(() => {
                      const target = award.target;
                      const requiredCount = target.count || 1;
                      
                      switch (target.actionType) {
                        case 'nose_click':
                          return requiredCount === 1 ? 'Click your cat\'s nose' : `Click your cat's nose ${requiredCount} times`;
                        case 'happy_jump':
                          return requiredCount === 1 ? 'Make your cat happy jump' : `Make your cat happy jump ${requiredCount} times`;
                        case 'ear_wiggle':
                          return requiredCount === 1 ? 'Click your cat\'s ear' : `Click your cat's ears ${requiredCount} times`;
                        case 'cheek_pet':
                          return requiredCount === 1 ? 'Pet your cat\'s cheek' : `Pet your cat's cheeks ${requiredCount} times`;
                        default:
                          return 'Secret requirement';
                      }
                    })()}
                  </div>
                )}

                {award.reward && (
                  <div className="award-tooltip-rewards">
                    <strong>Rewards:</strong>
                    {award.reward.love && (
                      <span className="reward-detail love-reward">
                        +{award.reward.love} <HeartIcon className="tooltip-breakdown-icon love-icon" />
                      </span>
                    )}
                    {award.reward.treats && (
                      <span className="reward-detail treats-reward">
                        +{award.reward.treats} <FishIcon className="tooltip-breakdown-icon treats-icon" />
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
    </div>
  );
};

export default AwardPanel;