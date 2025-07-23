import React from 'react';
import Job from './Job';
import { jobData } from './jobData';

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
        Your cat needs a better life. It&rsquo;s time to get a job.
      </p>
      {jobData.map((job) => (
        <Job
          key={job.id}
          job={job}
          currentLevel={jobLevels[job.id] || 0}
          onPromote={() => onPromote(job.id)}
          currentLove={currentLove}
        />
      ))}
    </div>
  );
};

export default JobPanel; 