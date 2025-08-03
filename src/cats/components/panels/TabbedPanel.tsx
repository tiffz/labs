import React, { useState } from 'react';
import JobPanel from './JobPanel';
import MeritsPanel from './MeritsPanel';
import ThingsPanel from './ThingsPanel';
import type { Milestone, Award } from '../../data/achievementData';
import type { JobInterviewState } from '../../game/types';

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
  
  // Merit upgrades panel props
  spentMerits: { [upgradeId: string]: number };
  onPurchaseUpgrade: (upgradeId: string) => void;
  
  // Achievement system props
  earnedMerits: Milestone[];
  availableMerits: Milestone[];
  earnedAwards: Award[];
  availableAwards: Award[];
  specialActions: {
    noseClicks: number;
    earClicks: number;
    cheekPets: number;
    happyJumps: number;
  };
  
  // Shared currency props
  currentLove: number;
  currentTreats: number;
}

type TabId = 'jobs' | 'things' | 'merits';

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
  spentMerits,
  onPurchaseUpgrade,
  earnedMerits,
  availableMerits,
  earnedAwards,
  availableAwards,
  specialActions,
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

        {activeTab === 'merits' && (
          <MeritsPanel
            earnedMerits={earnedMerits}
            availableMerits={availableMerits}
            earnedAwards={earnedAwards}
            availableAwards={availableAwards}
            spentMerits={spentMerits}
            onPurchaseUpgrade={onPurchaseUpgrade}
            currentLove={currentLove}
            currentTreats={currentTreats}
            currentJobLevels={jobLevels}
            currentThingQuantities={thingQuantities}
            specialActions={specialActions}
          />
        )}
      </div>
    </div>
  );
};

export default TabbedPanel; 