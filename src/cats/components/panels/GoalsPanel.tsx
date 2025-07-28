import React from 'react';
import type { Goal } from '../../data/goalData';
import HeartIcon from '../../icons/HeartIcon';
import FishIcon from '../../icons/FishIcon';

interface GoalsPanelProps {
  activeGoals: Goal[];
  completedGoals: Goal[];
}

const GoalsPanel: React.FC<GoalsPanelProps> = ({ activeGoals, completedGoals }) => {
  return (
    <div className="goals-panel">
      <p className="panel-intro">
        Help your cat live their best life.
      </p>
      
      {activeGoals.length > 0 && (
        <div className="goals-section">
          <h4 className="section-title">Active Goals ({activeGoals.length})</h4>
          <div className="goals-list">
            {activeGoals.map((goal, index) => (
              <div key={goal.id} className={`goal-card ${index === 0 ? 'primary' : 'secondary'}`}>
                <div className="goal-card-header">
                  <div className="goal-card-title">{goal.title}</div>
                  <div className="goal-card-header-right">
                    {goal.reward && (
                      <div className="goal-card-reward">
                        {goal.reward.treats && (
                          <span className="reward-item">
                            +{goal.reward.treats} <FishIcon className="reward-icon" />
                          </span>
                        )}
                        {goal.reward.love && (
                          <span className="reward-item">
                            +{goal.reward.love} <HeartIcon className="reward-icon" />
                          </span>
                        )}
                      </div>
                    )}
        
                  </div>
                </div>
                <div className="goal-card-description">{goal.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {completedGoals.length > 0 && (
        <div className="goals-section">
          <h4 className="section-title">Completed Goals ({completedGoals.length})</h4>
          <div className="goals-list">
            {completedGoals.map((goal) => (
              <div key={goal.id} className="goal-card completed">
                               <div className="goal-card-header">
                 <div className="goal-card-title">{goal.title}</div>
                 <div className="goal-card-header-right">
                   {goal.reward && (
                     <div className="goal-card-reward">
                       {goal.reward.treats && (
                         <span className="reward-item">
                           +{goal.reward.treats} <FishIcon className="reward-icon" />
                         </span>
                       )}
                       {goal.reward.love && (
                         <span className="reward-item">
                           +{goal.reward.love} <HeartIcon className="reward-icon" />
                         </span>
                       )}
                     </div>
                   )}
                   <span className="completed-badge">✓</span>
                 </div>
               </div>
               <div className="goal-card-description">{goal.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeGoals.length === 0 && completedGoals.length === 0 && (
        <div className="no-goals">
          <p>No goals yet! Keep playing to unlock new challenges.</p>
        </div>
      )}
    </div>
  );
};

export default GoalsPanel; 