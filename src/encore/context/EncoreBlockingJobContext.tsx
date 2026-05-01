/* eslint-disable react-refresh/only-export-components */
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactElement, ReactNode } from 'react';

type BlockingJob = {
  id: string;
  label: string;
  /** 0–1, or null for indeterminate */
  progress: number | null;
  /**
   * When true, the job still arms the `beforeunload` warning so the user is
   * prompted before closing the tab, but the snackbar UI does not surface it.
   * Use for noisy autosave-driven background work (e.g. debounced Drive push)
   * where a visible snackbar would be distracting on every keystroke. The
   * snackbar still appears for any concurrent non-silent jobs.
   */
  silent: boolean;
};

export type StartBlockingJobOptions = {
  /** See `BlockingJob.silent` above. Defaults to `false`. */
  silent?: boolean;
};

export type EncoreBlockingJobsApi = {
  withBlockingJob: <T>(
    label: string,
    fn: (setProgress: (p: number | null) => void) => Promise<T>,
    options?: StartBlockingJobOptions,
  ) => Promise<T>;
  startBlockingJob: (
    label: string,
    options?: StartBlockingJobOptions,
  ) => {
    updateProgress: (p: number | null) => void;
    end: () => void;
  };
};

const EncoreBlockingJobContext = createContext<EncoreBlockingJobsApi | null>(null);

function makeJobId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function EncoreBlockingJobProvider(props: { children: ReactNode }): ReactElement {
  const { children } = props;
  const [jobs, setJobs] = useState<BlockingJob[]>([]);

  const startBlockingJob = useCallback(
    (label: string, options?: StartBlockingJobOptions) => {
      const id = makeJobId();
      const silent = options?.silent === true;
      setJobs((prev) => [...prev, { id, label, progress: null, silent }]);
      return {
        updateProgress: (p: number | null) => {
          setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, progress: p } : j)));
        },
        end: () => {
          setJobs((prev) => prev.filter((j) => j.id !== id));
        },
      };
    },
    [],
  );

  const withBlockingJob = useCallback(
    async <T,>(
      label: string,
      fn: (setProgress: (p: number | null) => void) => Promise<T>,
      options?: StartBlockingJobOptions,
    ): Promise<T> => {
      const { updateProgress, end } = startBlockingJob(label, options);
      try {
        return await fn(updateProgress);
      } finally {
        end();
      }
    },
    [startBlockingJob],
  );

  useEffect(() => {
    if (jobs.length === 0) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [jobs.length]);

  const api = useMemo(
    () => ({
      withBlockingJob,
      startBlockingJob,
    }),
    [withBlockingJob, startBlockingJob],
  );

  // Snackbar reflects only loud (non-silent) jobs; silent jobs still arm the
  // beforeunload guard but stay invisible (e.g. autosave-driven Drive push).
  const visibleJobs = useMemo(() => jobs.filter((j) => !j.silent), [jobs]);
  const displayLabel =
    visibleJobs.length === 0
      ? ''
      : visibleJobs.length === 1
        ? visibleJobs[0]!.label
        : `${visibleJobs.length} background tasks`;
  const singleProgress = visibleJobs.length === 1 ? visibleJobs[0]!.progress : null;
  const showDeterminate =
    singleProgress != null && singleProgress >= 0 && singleProgress <= 1 && !Number.isNaN(singleProgress);

  return (
    <EncoreBlockingJobContext.Provider value={api}>
      {children}
      <Snackbar
        open={visibleJobs.length > 0}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{
          bottom: { xs: 96, sm: 104 },
        }}
      >
        <Paper
          elevation={6}
          sx={{
            px: 2,
            py: 1.5,
            minWidth: { xs: 'min(92vw, 400px)', sm: 380 },
            maxWidth: 480,
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
          }}
        >
          <Stack spacing={1} role="status" aria-live="polite" aria-atomic="true">
            <Typography variant="subtitle2" component="div" fontWeight={700}>
              {displayLabel}
            </Typography>
            <Box sx={{ width: 1 }}>
              <LinearProgress
                variant={showDeterminate ? 'determinate' : 'indeterminate'}
                value={showDeterminate ? Math.round(singleProgress * 100) : undefined}
                sx={{ height: 6, borderRadius: 1 }}
                aria-label={displayLabel}
              />
            </Box>
            <Typography variant="caption" color="text.secondary" component="p" sx={{ m: 0, lineHeight: 1.45 }}>
              Keep this tab open—closing it or leaving Encore can cancel in-progress work.
            </Typography>
          </Stack>
        </Paper>
      </Snackbar>
    </EncoreBlockingJobContext.Provider>
  );
}

export function useEncoreBlockingJobs(): EncoreBlockingJobsApi {
  const ctx = useContext(EncoreBlockingJobContext);
  if (!ctx) throw new Error('useEncoreBlockingJobs outside EncoreBlockingJobProvider');
  return ctx;
}
