import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';

type LabsBlockingJobProgressBarProps = {
  label: string;
  determinate: boolean;
  /** 0–100 when determinate */
  value?: number;
};

export default function LabsBlockingJobProgressBar({
  label,
  determinate,
  value = 0,
}: LabsBlockingJobProgressBarProps): React.ReactElement {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(100, value));
  const displayWidth = determinate ? Math.max(clamped > 0 ? 3 : 0, clamped) : undefined;

  return (
    <Box
      className="labs-blocking-job-progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={determinate ? Math.round(clamped) : undefined}
    >
      <Box
        className="labs-blocking-job-progress-track"
        sx={{ bgcolor: alpha(theme.palette.text.primary, 0.08) }}
      >
        <Box
          className={`labs-blocking-job-progress-fill${determinate ? ' is-determinate' : ' is-indeterminate'}`}
          sx={{
            bgcolor: 'primary.main',
            ...(determinate ? { width: `${displayWidth}%` } : {}),
          }}
        />
      </Box>
    </Box>
  );
}
