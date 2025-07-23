import React from 'react';
import type { JobData } from './jobData';

interface JobProps {
  job: JobData;
  currentLevel: number;
  onPromote: () => void;
  currentLove: number;
}

const Job: React.FC<JobProps> = ({ job, currentLevel, onPromote, currentLove }) => {
  const nextLevel = job.levels[currentLevel];
  const isMaxLevel = currentLevel >= job.levels.length;

  return (
    <div className="job">
      <h4>{job.name}</h4>
      <p>
        Current: {currentLevel > 0 ? job.levels[currentLevel - 1].title : 'Unemployed'}
      </p>
      <div className="job-action">
        {isMaxLevel ? (
          <p>Max Level!</p>
        ) : (
          <button onClick={onPromote} disabled={currentLove < nextLevel.cost}>
            Promote to {nextLevel.title}
            <br />
            (Cost: {nextLevel.cost} ❤️)
          </button>
        )}
      </div>
    </div>
  );
};

export default Job; 