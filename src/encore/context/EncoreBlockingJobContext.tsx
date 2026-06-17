/* eslint-disable react-refresh/only-export-components */
import type { ReactElement, ReactNode } from 'react';
import {
  LabsBlockingJobProvider,
  useLabsBlockingJobs,
  type LabsBlockingJobHandle,
  type LabsBlockingJobsApi,
  type LabsStartBlockingJobOptions,
} from '../../shared/jobs/LabsBlockingJobContext';

export type StartBlockingJobOptions = LabsStartBlockingJobOptions;
export type EncoreBlockingJobsApi = LabsBlockingJobsApi;

export function EncoreBlockingJobProvider(props: { children: ReactNode }): ReactElement {
  return (
    <LabsBlockingJobProvider
      snackbarBottom={{ xs: 88, sm: 96 }}
      unloadCaption="Keep this tab open. Closing it or leaving Encore can cancel in-progress work."
    >
      {props.children}
    </LabsBlockingJobProvider>
  );
}

export function useEncoreBlockingJobs(): EncoreBlockingJobsApi {
  return useLabsBlockingJobs();
}

export type { LabsBlockingJobHandle as EncoreBlockingJobHandle };
