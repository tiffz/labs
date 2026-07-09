import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import type { ReactElement } from 'react';

import type { ScriptPacingWarning } from '../types';

export function ScriptPacingMeter({ warnings }: { warnings: readonly ScriptPacingWarning[] }): ReactElement | null {
  if (warnings.length === 0) return null;

  return (
    <Box className="lyrefly-script-pacing-meter" role="status" aria-live="polite">
      <Stack spacing={1}>
        {warnings.map((warning) => (
          <Alert key={warning.blockId} severity={warning.severity === 'warn' ? 'warning' : 'info'} variant="outlined">
            {warning.message}
          </Alert>
        ))}
      </Stack>
    </Box>
  );
}
