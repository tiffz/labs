import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import type { ExerciseResult } from '../../store';
import { exerciseResultBreakdownRows } from '../sessionScreenHelpers';

export type SessionExerciseResultBreakdownProps = {
  breakdown: ExerciseResult['breakdown'];
};

export function SessionExerciseResultBreakdown({
  breakdown,
}: SessionExerciseResultBreakdownProps): ReactElement {
  const rows = exerciseResultBreakdownRows(breakdown);

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        flexWrap: 'wrap',
        columnGap: 2,
        rowGap: 0.5,
        mb: 1.5,
      }}
    >
      {rows.map(({ label, count, color }) => (
        <Box
          key={label}
          sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
        >
          <Box
            aria-hidden="true"
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: color,
              flexShrink: 0,
            }}
          />
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {count} {label.toLowerCase()}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
