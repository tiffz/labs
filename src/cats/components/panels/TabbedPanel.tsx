import React, { useState } from 'react';
import JobPanel from './JobPanel';
import SkillsPanel from '../skills/SkillsPanel';
import MeritsPanel from './MeritsPanel';
import ThingsPanel from '../things/ThingsPanel';
import type { Merit } from '../../data/meritData';
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
  
  // Merits panel props
  earnedMerits: Merit[];
  availableMerits: Merit[];
  
  // Shared currency props
  currentLove: number;
  currentTreats: number;
}

type TabId = 'jobs' | 'things' | 'skills' | 'merits';

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
  earnedMerits,
  availableMerits,
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
          className={`tab-header ${activeTab === 'merits' ? 'active' : ''}`}
          onClick={() => setActiveTab('merits')}
        >
          Merits
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
        {activeTab === 'merits' && (
          <MeritsPanel
            earnedMerits={earnedMerits}
            availableMerits={availableMerits}
          />
        )}
      </div>
    </div>
  );
};

export default TabbedPanel; 