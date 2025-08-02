import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import type { Merit } from '../../data/meritData';
import HeartIcon from '../../icons/HeartIcon';
import FishIcon from '../../icons/FishIcon';
import MaterialIcon from '../../icons/MaterialIcon';

interface MeritsPanelProps {
  earnedMerits: Merit[];
  availableMerits: Merit[];
}

const MeritsPanel: React.FC<MeritsPanelProps> = ({ earnedMerits, availableMerits }) => {
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  const getMeritTypeDescription = (merit: Merit) => {
    switch (merit.type) {
      case 'love_milestone':
        return `Reach ${merit.target?.amount?.toLocaleString()} love`;
      case 'treats_milestone':
        return `Earn ${merit.target?.amount?.toLocaleString()} treats`;
      case 'job_achievement':
        return 'First job achievement';
      case 'promotion_milestone':
        return `Reach job level ${merit.target?.jobLevel}`;
      case 'purchase_achievement':
        if (merit.target?.thingId === 'ceramic_bowl') return 'Buy first food bowl';
        if (merit.target?.thingId === 'feather_wand') return 'Buy first toy';
        if (merit.target?.thingId === 'premium_bowl') return 'Buy premium bowl';
        return 'Purchase achievement';
      default:
        return String(merit.type).replace('_', ' ');
    }
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>, meritId: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const tooltipWidth = 240;
    const tooltipHeight = 120;
    const spaceAbove = rect.top;
    
    // Always show tooltip on the left side for consistency
    
    // Position tooltip
    let top = rect.top + window.scrollY;
    
    // Adjust vertically if needed
    if (top + tooltipHeight > window.innerHeight + window.scrollY) {
      if (spaceAbove > tooltipHeight + 10) {
        top = rect.top + window.scrollY - tooltipHeight - 8;
      } else {
        top = window.innerHeight + window.scrollY - tooltipHeight - 10;
      }
    }
    
    // Always position on the left side with extra spacing
    const horizontalGap = 16;
    const left = rect.left + window.scrollX - tooltipWidth - horizontalGap;
    
    setTooltipPosition({ top, left });
    setShowTooltip(meritId);
  };

  const handleMouseLeave = () => {
    setShowTooltip(null);
  };

  const allMerits = [...earnedMerits, ...availableMerits];

  return (
    <div className="panel merits-panel">
      <p className="panel-intro">
        Help your cat live their best life.
      </p>
      <div className="merits-header">
        <h3 className="merits-title">
          <MaterialIcon icon="emoji_events" className="merits-title-icon" />
          Achievements ({earnedMerits.length}/{allMerits.length})
        </h3>
      </div>
      
      <div className="merit-badges-container">
        {allMerits.map((merit) => {
          const isEarned = earnedMerits.some(e => e.id === merit.id);
          
          return (
            <div 
              key={merit.id} 
              className="merit-badge-wrapper"
              onMouseEnter={(e) => handleMouseEnter(e, merit.id)}
              onMouseLeave={handleMouseLeave}
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

              {showTooltip === merit.id && ReactDOM.createPortal(
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
                      <strong>Requirement:</strong> {getMeritTypeDescription(merit)}
                    </div>
                    {merit.reward && (
                      <div className="merit-tooltip-rewards">
                        <strong>Rewards:</strong>
                        {merit.reward.love && (
                          <span className="reward-detail">
                            +{merit.reward.love} <HeartIcon className="tooltip-breakdown-icon" />
                          </span>
                        )}
                        {merit.reward.treats && (
                          <span className="reward-detail">
                            +{merit.reward.treats} <FishIcon className="tooltip-breakdown-icon" />
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>,
                document.body
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MeritsPanel;