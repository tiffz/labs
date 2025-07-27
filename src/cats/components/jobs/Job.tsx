import React from 'react';
import type { JobData } from '../../data/jobData';
import CostDisplay from '../ui/CostDisplay';

interface JobProps {
  job: JobData;
  level: number;
  onPromote: () => void;
  canPromote: boolean;
  currentLove: number;
}

const Job: React.FC<JobProps> = ({ job, level, onPromote, canPromote, currentLove }) => {
  const currentLevel = level > 0 ? job.levels[level - 1] : null;
  const nextLevel = level < job.levels.length ? job.levels[level] : null;

  return (
    <div className="job">
      <h4>{job.name}</h4>
      <p>
        Current Level: {currentLevel ? currentLevel.title : 'Unemployed'}
      </p>
      {currentLevel && (
        <p>
          Earnings: {Math.floor(currentLevel.treatsPerSecond)} treats/sec
        </p>
      )}
      <div className="job-action">
        {nextLevel ? (
          <>
            <div className="job-promotion">
              <strong>Next:</strong> {nextLevel.title}
            </div>
            <CostDisplay 
              loveCost={nextLevel.cost} 
              currentLove={currentLove} 
            />
            <button onClick={onPromote} disabled={!canPromote}>
              Promote
            </button>
          </>
        ) : (
          <p>Max level reached!</p>
        )}
      </div>
    </div>
  );
};

export default Job; 