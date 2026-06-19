/* eslint-disable react-refresh/only-export-components */
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactElement, ReactNode } from 'react';
import LabsBlockingJobProgressBar from './LabsBlockingJobProgressBar';
import { formatBlockingJobItemProgressCaption } from './labsBlockingJobItemProgress';
import './labsBlockingJob.css';

type BlockingJob = {
  id: string;
  label: string;
  /** 0–1, or null for indeterminate */
  progress: number | null;
  /**
   * When true, the snackbar is hidden. **`beforeunload` is only registered when
   * at least one non-silent job is running**, so silent background work (e.g.
   * debounced Drive push) does not spam “Leave site?” while nothing visible is
   * happening. Pair silent jobs with a loud job if a specific flow must block unload.
   */
  silent: boolean;
};

export type LabsStartBlockingJobOptions = {
  /**
   * When `true`, hides the snackbar and excludes this job from the `beforeunload`
   * guard unless a concurrent non-silent job is running.
   */
  silent?: boolean;
};

export type LabsBlockingJobHandle = {
  updateLabel: (label: string) => void;
  updateProgress: (progress: number | null) => void;
  end: () => void;
};

export type LabsBlockingJobsApi = {
  withBlockingJob: <T>(
    label: string,
    fn: (setProgress: (p: number | null) => void) => Promise<T>,
    options?: LabsStartBlockingJobOptions,
  ) => Promise<T>;
  startBlockingJob: (
    label: string,
    options?: LabsStartBlockingJobOptions,
  ) => LabsBlockingJobHandle;
};

export type LabsBlockingJobProviderProps = {
  children: ReactNode;
  /** Caption under the progress bar (keep tab open warning). */
  unloadCaption?: string;
  /** Snackbar offset from viewport bottom (px). */
  snackbarBottom?: { xs: number; sm: number };
  /** Omit the keep-tab-open caption when the shell already explains it elsewhere. */
  hideUnloadCaption?: boolean;
};

const LabsBlockingJobContext = createContext<LabsBlockingJobsApi | null>(null);
const LabsBlockingJobVisibleContext = createContext(false);

/** Module-level guard for hooks outside the provider tree (e.g. Drive auto-sync). */
let blockingJobsActiveCount = 0;

export function labsBlockingJobsActive(): boolean {
  return blockingJobsActiveCount > 0;
}

const DEFAULT_UNLOAD_CAPTION =
  'Keep this tab open. Closing it or leaving can cancel in-progress work.';

function makeJobId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function LabsBlockingJobProvider(props: LabsBlockingJobProviderProps): ReactElement {
  const {
    children,
    unloadCaption = DEFAULT_UNLOAD_CAPTION,
    snackbarBottom = { xs: 16, sm: 24 },
    hideUnloadCaption = false,
  } = props;
  const [jobs, setJobs] = useState<BlockingJob[]>([]);
  const activeCountRef = useRef(0);
  const [, setActiveTick] = useState(0);

  const bumpActiveCount = useCallback((delta: number) => {
    activeCountRef.current = Math.max(0, activeCountRef.current + delta);
    blockingJobsActiveCount = activeCountRef.current;
    setActiveTick((n) => n + 1);
  }, []);

  const startBlockingJob = useCallback(
    (label: string, options?: LabsStartBlockingJobOptions): LabsBlockingJobHandle => {
      const id = makeJobId();
      const silent = options?.silent === true;
      bumpActiveCount(1);
      setJobs((prev) => [...prev, { id, label, progress: null, silent }]);
      return {
        updateLabel: (nextLabel: string) => {
          setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, label: nextLabel } : j)));
        },
        updateProgress: (p: number | null) => {
          setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, progress: p } : j)));
        },
        end: () => {
          setJobs((prev) => prev.filter((j) => j.id !== id));
          bumpActiveCount(-1);
        },
      };
    },
    [bumpActiveCount],
  );

  const withBlockingJob = useCallback(
    async <T,>(
      label: string,
      fn: (setProgress: (p: number | null) => void) => Promise<T>,
      options?: LabsStartBlockingJobOptions,
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

  const shouldWarnOnUnload = useMemo(() => jobs.some((j) => !j.silent), [jobs]);

  useEffect(() => {
    if (!shouldWarnOnUnload) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [shouldWarnOnUnload]);

  const api = useMemo(
    () => ({
      withBlockingJob,
      startBlockingJob,
    }),
    [startBlockingJob, withBlockingJob],
  );

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
  const progressPercent = showDeterminate ? singleProgress * 100 : undefined;
  const progressCaption = formatBlockingJobItemProgressCaption(displayLabel);
  const theme = useTheme();
  const panelShadow = [
    `0 0 0 1px ${alpha(theme.palette.common.black, 0.03)}`,
    `0 1px 2px ${alpha(theme.palette.common.black, 0.04)}`,
    `0 6px 16px ${alpha(theme.palette.common.black, 0.06)}`,
    `0 20px 40px ${alpha(theme.palette.common.black, 0.05)}`,
  ].join(', ');

  return (
    <LabsBlockingJobContext.Provider value={api}>
      <LabsBlockingJobVisibleContext.Provider value={visibleJobs.length > 0}>
        {children}
      <Snackbar
        open={visibleJobs.length > 0}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        className="labs-blocking-job-snackbar"
        sx={{
          bottom: snackbarBottom,
          left: { xs: 20, sm: '50%' },
          right: { xs: 20, sm: 'auto' },
          transform: { xs: 'none', sm: 'translateX(-50%)' },
        }}
      >
        <Paper
          className="labs-blocking-job-panel"
          elevation={0}
          sx={{
            px: { xs: 2.75, sm: 3 },
            py: { xs: 2, sm: 2.25 },
            width: { xs: '100%', sm: 'min(92vw, 26rem)' },
            maxWidth: 416,
            borderRadius: `${theme.shape.borderRadius}px`,
            bgcolor: 'background.paper',
            color: 'text.primary',
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: panelShadow,
          }}
        >
          <Stack spacing={1.25} role="status" aria-live="polite" aria-atomic="true">
            <Typography
              variant="body1"
              component="p"
              sx={{
                m: 0,
                fontSize: '0.9375rem',
                fontWeight: 500,
                lineHeight: 1.45,
                letterSpacing: '-0.01em',
              }}
            >
              {displayLabel}
            </Typography>
            <LabsBlockingJobProgressBar
              label={displayLabel}
              determinate={showDeterminate}
              value={progressPercent}
            />
            {progressCaption ? (
              <Typography
                variant="caption"
                component="p"
                color="text.secondary"
                sx={{
                  m: 0,
                  lineHeight: 1.45,
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  letterSpacing: '0.005em',
                }}
              >
                {progressCaption}
              </Typography>
            ) : null}
            {hideUnloadCaption ? null : (
              <Typography
                variant="caption"
                component="p"
                color="text.secondary"
                sx={{
                  m: 0,
                  pt: 0.25,
                  lineHeight: 1.5,
                  fontSize: '0.75rem',
                  letterSpacing: '0.005em',
                }}
              >
                {unloadCaption}
              </Typography>
            )}
          </Stack>
        </Paper>
      </Snackbar>
      </LabsBlockingJobVisibleContext.Provider>
    </LabsBlockingJobContext.Provider>
  );
}

export function useLabsBlockingJobsVisible(): boolean {
  return useContext(LabsBlockingJobVisibleContext);
}

export function useLabsBlockingJobs(): LabsBlockingJobsApi {
  const ctx = useContext(LabsBlockingJobContext);
  if (!ctx) throw new Error('useLabsBlockingJobs outside LabsBlockingJobProvider');
  return ctx;
}
