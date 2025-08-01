import React from 'react';
import MaterialIcon from '../../icons/MaterialIcon';
import HeartIcon from '../../icons/HeartIcon';
import {
  getCurrentTrainingCost,
  canAffordSkillTraining,
} from '../../data/skillTrainingSystem';
import { skillData, getSkillProgress } from '../../data/skillData';
import type { SkillIncrementState } from '../../game/types';

interface SkillsPanelProps {
  skillLevels: { [key: string]: number };
  skillIncrements: { [skillId: string]: { [levelIndex: number]: number } };
  skillAttempts: { [skillId: string]: SkillIncrementState };
  onSkillTrain: (skillId: string) => void;
  currentLove: number;
}

const SkillsPanel: React.FC<SkillsPanelProps> = ({ 
  skillLevels, 
  skillIncrements, 
  skillAttempts, 
  onSkillTrain, 
  currentLove 
}) => {
  const renderSkill = (skill: typeof skillData[0]) => {
    const level = skillLevels[skill.id] || 0;
    const increments = skillIncrements[skill.id] || {};
    const attemptState = skillAttempts[skill.id];
    const { isMaxLevel, currentTarget } = getSkillProgress(skill.id, increments);
    
    // Training costs and affordability
    const trainingCost = getCurrentTrainingCost(skill.id, increments);
    const canAffordTrain = trainingCost !== null && canAffordSkillTraining(currentLove, skill.id, increments);
    
    const currentLevelData = level > 0 ? skill.levels[level - 1] : null;
    const currentTargetData = currentTarget ? skill.levels[currentTarget.levelIndex] : null;
    const currentIncrementData = currentTarget ? skill.levels[currentTarget.levelIndex].increments[currentTarget.incrementIndex] : null;

    // Create progress dots for current level
    const renderProgressDots = () => {
      if (!currentTargetData) return null;
      
      const totalIncrements = currentTargetData.increments.length;
      const unlockedIncrements = increments[currentTarget!.levelIndex] || 0;
      
      const dots = [];
      for (let i = 0; i < totalIncrements; i++) {
        dots.push(
          <span
            key={i}
            className={`progress-dot ${i < unlockedIncrements ? 'completed' : i === unlockedIncrements ? 'current' : 'locked'}`}
            title={currentTargetData.increments[i].title}
          >
            ●
          </span>
        );
      }
      return dots;
    };

    return (
      <div key={skill.id} className="skill-card-compact">
        <div className="skill-main-row">
          <MaterialIcon icon={skill.icon} className="skill-icon-small" />
          
          <div className="skill-info">
            <div className="skill-name-effect">
              <span className="skill-name">{skill.name}</span>
              {level > 0 && (
                <span className="skill-effect">
                  {skill.effectType === 'love_per_pet' && `+${level * skill.effectAmount}`}
                  {skill.effectType === 'love_per_pounce' && `+${level * skill.effectAmount}`}
                  {skill.effectType === 'furniture_love_multiplier' && `+${(level * skill.effectAmount * 100).toFixed(0)}%`}
                  {skill.effectType === 'feeding_effect_multiplier' && `+${(level * skill.effectAmount * 100).toFixed(0)}%`}
                  {skill.effectType === 'training_experience_multiplier' && `+${(level * skill.effectAmount * 100).toFixed(0)}%`}
                  {skill.effectType === 'job_treats_multiplier' && `+${(level * skill.effectAmount * 100).toFixed(0)}%`}
                  <HeartIcon className="love-icon-tiny" />
                  {skill.effectType === 'love_per_pet' && '/pet'}
                  {skill.effectType === 'love_per_pounce' && '/pounce'}
                </span>
              )}
            </div>
            
            <div className="skill-level-status">
              <span className="skill-level-name">
                {currentLevelData ? currentLevelData.title : 'Untrained'}
              </span>
              {level > 0 && (
                <span className="skill-level-indicator">
                  Lv. {level}
                </span>
              )}
              {currentIncrementData && (
                <span className="skill-current-increment">
                  → {currentIncrementData.title}
                </span>
              )}
            </div>

            {!isMaxLevel && currentTargetData && (
              <div className="skill-progress-dots">
                {renderProgressDots()}
              </div>
            )}

            {/* Last attempt feedback */}
            {attemptState?.lastAttemptMessage && (
              <div className={`skill-feedback ${attemptState.lastAttemptSuccess ? 'success' : 'failure'}`}>
                <em>&ldquo;{attemptState.lastAttemptMessage}&rdquo;</em>
              </div>
            )}
          </div>

          {/* Training action */}
          {!isMaxLevel && trainingCost && (
            <button 
              className={`skill-train-btn-compact ${canAffordTrain ? 'affordable' : 'expensive'}`}
              onClick={() => onSkillTrain(skill.id)}
              disabled={!canAffordTrain}
              title={`Train ${currentIncrementData?.title || 'skill'} for ${trainingCost} love`}
            >
              <MaterialIcon icon="auto_stories" />
              <span className="btn-text-compact">
                Train ({trainingCost}<HeartIcon className="love-icon-tiny" />)
              </span>
            </button>
          )}

          {isMaxLevel && (
            <div className="skill-mastered-compact">
              <MaterialIcon icon="workspace_premium" />
              <span>Mastered</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="panel">
      <p className="panel-intro">
        Work hard so you can play hard.
      </p>
      
      <div className="skills-section-compact">
        {skillData.map(renderSkill)}
      </div>
    </div>
  );
};

export default SkillsPanel;