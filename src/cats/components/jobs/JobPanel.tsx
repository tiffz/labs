import React from 'react';
import type { JobData } from '../../data/jobData';
import { jobData } from '../../data/jobData';
import FishIcon from '../../icons/FishIcon';
import Job from './Job';

interface JobPanelProps {
  jobLevels: { [key: string]: number };
  onPromote: (jobId: string) => void;
  currentLove: number;
}

const JobPanel: React.FC<JobPanelProps> = ({ jobLevels, onPromote, currentLove }) => {
  return (
    <div className="job-panel">
      <h3>Day Jobs</h3>
      <p className="job-panel-intro">
        Your cat needs a better life. It’s time to get a job.
      </p>
      {jobData.map((job) => (
        <Job
          key={job.id}
          job={job}
          level={jobLevels[job.id] || 0}
          onPromote={() => onPromote(job.id)}
          canPromote={currentLove >= (job.levels[jobLevels[job.id] || 0]?.cost || Infinity)}
        />
      ))}
    </div>
  );
};

export default JobPanel; 