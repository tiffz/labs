import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import MaterialIcon from '../../icons/MaterialIcon';
import HeartIcon from '../../icons/HeartIcon';
import FishIcon from '../../icons/FishIcon';
import { milestoneGroups, type MilestoneGroup, type Milestone } from '../../data/milestoneData';

interface MilestonePanelProps {
  earnedMilestones: Milestone[];
  availableMilestones: Milestone[];
  currentLove: number;
  currentTreats: number;
  currentJobLevels: { [key: string]: number };
  currentThingQuantities: { [key: string]: number };
}

const MilestonePanel: React.FC<MilestonePanelProps> = ({
  earnedMilestones,
  availableMilestones,
  currentLove,
  currentTreats,
  currentJobLevels,
  currentThingQuantities,
}) => {

  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ bottom: 0, left: 0, arrowPosition: '140px' });

  const handleMilestoneHover = (milestone: Milestone, event: React.MouseEvent | React.PointerEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const tooltipWidth = 280; // fixed width

    // Anchor the tooltip's bottom 24px above the hovered element so the
    // tooltip can grow upward as content wraps without clipping.
    const bottomPosition = window.innerHeight - rect.top + 24;
    const leftPosition = Math.max(10, Math.min(window.innerWidth - tooltipWidth - 10, rect.left + rect.width / 2 - tooltipWidth / 2));

    // Calculate arrow position relative to tooltip (in pixels)
    // Add small offset for milestone icons to center better (milestone icons are smaller than award badges)
    const elementCenter = rect.left + rect.width / 2;
    const tooltipLeft = leftPosition;
    const relativeArrowPos = elementCenter - tooltipLeft - 8; // Small adjustment for milestone icon visual center
    const clampedArrowPos = Math.max(16, Math.min(tooltipWidth - 16, relativeArrowPos));

    setTooltipPosition({
      bottom: bottomPosition,
      left: leftPosition,
      arrowPosition: `${clampedArrowPos}px`
    });
    setShowTooltip(milestone.id);
  };

  const handleMilestoneLeave = () => {
    setShowTooltip(null);
  };

  // Calculate progress for each milestone group
  const getGroupProgress = (group: MilestoneGroup) => {
    const milestones = group.milestones;
    const earnedCount = milestones.filter(m => earnedMilestones.some(e => e.id === m.id)).length;
    const totalCount = milestones.length;
    
    // Find the next milestone for progress calculation
    const nextMilestone = milestones.find(m => !earnedMilestones.some(e => e.id === m.id));
    let currentProgress = 0;
    
    if (nextMilestone) {
      currentProgress = getCurrentProgress(nextMilestone);
    }
    
    return {
      earnedCount,
      totalCount,
      currentProgress,
      nextMilestone,
      percentage: Math.round((earnedCount / totalCount) * 100)
    };
  };

  // Get current progress towards a milestone
  const getCurrentProgress = (milestone: Milestone): number => {
    const target = milestone.target;
    
    if (target.currencyType === 'love' && target.amount) {
      return Math.min(100, (currentLove / target.amount) * 100);
    }
    
    if (target.currencyType === 'treats' && target.amount) {
      return Math.min(100, (currentTreats / target.amount) * 100);
    }
    
    if (target.jobLevel) {
      const maxLevel = Math.max(...Object.values(currentJobLevels), 0);
      return Math.min(100, (maxLevel / target.jobLevel) * 100);
    }
    
    if (target.thingId) {
      const quantity = currentThingQuantities[target.thingId] || 0;
      return quantity > 0 ? 100 : 0;
    }
    
    return 0;
  };

  return (
    <div className="milestone-panel">
      <div className="milestone-groups-compact">
        {milestoneGroups.map((group) => {
          const progress = getGroupProgress(group);
          
          return (
            <div key={group.id} className="milestone-group-compact">
              <div className="milestone-group-header-compact">
                <div className="group-info-compact">
                  <MaterialIcon icon={group.icon} className="group-icon-small" />
                  <div className="group-details-compact">
                    <span className="group-name-compact">{group.name}</span>
                    <span className="group-progress-compact">
                      {progress.earnedCount}/{progress.totalCount}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="milestone-items-row">
                {group.milestones.map((milestone, index) => {
                  const isEarned = earnedMilestones.some(e => e.id === milestone.id);
                  const currentProg = getCurrentProgress(milestone);
                  const isNext = !isEarned && progress.nextMilestone?.id === milestone.id;
                  
                  const showProgressRing = isNext && currentProg > 0;
                  return (
                    <div 
                      key={milestone.id} 
                      className={`milestone-item-compact ${isEarned ? 'earned' : isNext ? 'next' : 'locked'}${showProgressRing ? ' has-progress' : ''}`}
                      onPointerEnter={(e) => handleMilestoneHover(milestone, e)}
                      onPointerLeave={handleMilestoneLeave}
                    >
                      <div 
                        className="milestone-icon-compact"
                        style={{ 
                          '--milestone-color': group.color,
                          '--milestone-rgb': group.color.replace('#', '').match(/.{2}/g)?.map(hex => parseInt(hex, 16)).join(', '),
                          // The progress ring is drawn entirely via CSS
                          // (conic-gradient background), which renders on the
                          // same pixel grid as the border so the in-progress
                          // circle stays exactly the same visual size as its
                          // locked siblings.
                          ...(showProgressRing ? { '--milestone-progress': `${currentProg}%` } : {}),
                        } as React.CSSProperties}
                      >
                        <MaterialIcon 
                          icon={isEarned ? 'check' : milestone.icon} 
                          className="milestone-icon-small"
                        />
                      </div>
                      
                      {/* Connector line */}
                      {index < group.milestones.length - 1 && (
                        <div 
                          className={`milestone-connector ${isEarned ? 'completed' : ''}`}
                          style={{ 
                            backgroundColor: isEarned ? group.color : '#e7e0ec'
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Milestone Tooltip */}
      {showTooltip && ReactDOM.createPortal(
        (() => {
          const milestone = [...earnedMilestones, ...availableMilestones].find(m => m.id === showTooltip);
          if (!milestone) return null;
          
          const isEarned = earnedMilestones.some(earned => earned.id === milestone.id);
          
          return (
            <div 
              className="milestone-tooltip left-side"
              style={{
                position: 'fixed',
                bottom: `${tooltipPosition.bottom}px`,
                left: `${tooltipPosition.left}px`,
                '--arrow-position': tooltipPosition.arrowPosition,
              } as React.CSSProperties}
            >
              <div className="milestone-tooltip-header">
                <MaterialIcon icon={milestone.icon} className="milestone-tooltip-icon" />
                <h4 className="milestone-tooltip-title">{milestone.title}</h4>
                <div className={`milestone-status-badge ${isEarned ? 'earned' : 'locked'}`}>
                  {isEarned ? '✓ Completed' : 'In Progress'}
                </div>
              </div>
              <p className="milestone-tooltip-description">{milestone.description}</p>
              {(milestone.reward?.love || milestone.reward?.treats) && (
                <div className="milestone-tooltip-details">
                  <div className="milestone-tooltip-rewards">
                    <strong>Rewards:</strong>
                    {milestone.reward.love && (
                      <span className="reward-detail love-reward">
                        +{milestone.reward.love} <HeartIcon className="tooltip-breakdown-icon love-icon" />
                      </span>
                    )}
                    {milestone.reward.treats && (
                      <span className="reward-detail treats-reward">
                        +{milestone.reward.treats} <FishIcon className="tooltip-breakdown-icon treats-icon" />
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })(),
        document.body
      )}
    </div>
  );
};

export default MilestonePanel;