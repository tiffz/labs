import React, { useState } from 'react';
import JobPanel from './JobPanel';
import SkillsPanel from '../skills/SkillsPanel';
import GoalsPanel from './GoalsPanel';
import ThingsPanel from '../things/ThingsPanel';
import type { Goal } from '../../data/goalData';
import type { JobInterviewState, SkillIncrementState } from '../../game/types';

interface TabbedPanelProps {
  // Job panel props
  jobLevels: { [key: string]: number };
  jobExperience: { [key: string]: number };
  jobInterviews: { [key: string]: JobInterviewState };
  onPromote: (jobId: string) => void;
  onTrain: (jobId: string) => void;
  onInterview: (jobId: string) => void;
  unlockedJobs: string[];
  
  // Legacy upgrade props removed - replaced by Things system
  
  // Things panel props
  thingQuantities: { [key: string]: number };
  onPurchaseThing: (thingId: string) => void;
  
  // Skills panel props
  skillLevels: { [key: string]: number };
  skillIncrements: { [skillId: string]: { [levelIndex: number]: number } };
  skillAttempts: { [skillId: string]: SkillIncrementState };
  onSkillTrain: (skillId: string) => void;
  lovePerClick: number;
  lovePerPounce: number;
  
  // Goals panel props
  activeGoals: Goal[];
  completedGoals: Goal[];
  
  // Shared currency props
  currentLove: number;
  currentTreats: number;
}

type TabId = 'jobs' | 'things' | 'skills' | 'goals';

const TabbedPanel: React.FC<TabbedPanelProps> = ({
  jobLevels,
  jobExperience,
  jobInterviews,
  onPromote,
  onTrain,
  onInterview,
  unlockedJobs,
  thingQuantities,
  onPurchaseThing,
  skillLevels,
  skillIncrements,
  skillAttempts,
  onSkillTrain,
  activeGoals,
  completedGoals,
  currentLove,
  currentTreats,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('jobs');

  return (
    <div className="tabbed-panel">
      {/* Tab Headers */}
      <div className="tab-headers">
        <button
          className={`tab-header ${activeTab === 'jobs' ? 'active' : ''}`}
          onClick={() => setActiveTab('jobs')}
        >
          Jobs
        </button>
        <button
          className={`tab-header ${activeTab === 'things' ? 'active' : ''}`}
          onClick={() => setActiveTab('things')}
        >
          Things
        </button>
        <button
          className={`tab-header ${activeTab === 'skills' ? 'active' : ''}`}
          onClick={() => setActiveTab('skills')}
        >
          Skills
        </button>
        <button
          className={`tab-header ${activeTab === 'goals' ? 'active' : ''}`}
          onClick={() => setActiveTab('goals')}
        >
          Goals
          {activeGoals.length > 0 && (
            <span className="tab-badge">{activeGoals.length}</span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'jobs' && (
          <JobPanel
            jobLevels={jobLevels}
            jobExperience={jobExperience}
            jobInterviews={jobInterviews}
            onPromote={onPromote}
            onTrain={onTrain}
            onInterview={onInterview}
            currentLove={currentLove}
            unlockedJobs={unlockedJobs}
          />
        )}
        {activeTab === 'things' && (
          <ThingsPanel
            thingQuantities={thingQuantities}
            onPurchaseThing={onPurchaseThing}
            currentTreats={currentTreats}
          />
        )}
        {activeTab === 'skills' && (
          <SkillsPanel
            skillLevels={skillLevels}
            skillIncrements={skillIncrements}
            skillAttempts={skillAttempts}
            onSkillTrain={onSkillTrain}
            currentLove={currentLove}
          />
        )}
        {activeTab === 'goals' && (
          <GoalsPanel
            activeGoals={activeGoals}
            completedGoals={completedGoals}
          />
        )}
      </div>
    </div>
  );
};

export default TabbedPanel; 