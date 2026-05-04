import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import type { ReactElement } from 'react';
import { encoreMaxWidthPage } from '../theme/encoreUiTokens';
import { encorePagePaddingTop, encoreScreenPaddingX } from '../theme/encoreM3Layout';

/**
 * Neutral “page is loading” chrome for Encore’s heaviest list tabs (Repertoire / Performances).
 * Shown from the shell so tab switches get immediate feedback before MRT commits a large tree.
 */
export function EncoreHeavyListTabPlaceholder(): ReactElement {
  return (
    <Box
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading page"
      sx={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        width: 1,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        px: encoreScreenPaddingX,
        pt: encorePagePaddingTop,
        ...encoreMaxWidthPage,
      }}
    >
      <Stack spacing={2} sx={{ width: 1, maxWidth: 720 }}>
        <Skeleton variant="rounded" height={36} width="55%" sx={{ borderRadius: 1 }} />
        <Skeleton variant="rounded" height={20} width="92%" sx={{ borderRadius: 1 }} />
        <Skeleton variant="rounded" height={20} width="78%" sx={{ borderRadius: 1 }} />
        <Box sx={{ pt: 1.5 }}>
          <Skeleton variant="rounded" height={40} width={1} sx={{ borderRadius: 1, maxWidth: 560 }} />
        </Box>
        <Stack spacing={1.25} sx={{ pt: 1 }}>
          {(
            [
              ['r1', '100%', 0],
              ['r2', '96%', 1],
              ['r3', '88%', 2],
              ['r4', '100%', 3],
              ['r5', '96%', 4],
              ['r6', '88%', 5],
              ['r7', '100%', 6],
              ['r8', '96%', 7],
              ['r9', '88%', 8],
              ['r10', '100%', 9],
            ] as const
          ).map(([key, width, i]) => (
            <Skeleton
              key={key}
              variant="rounded"
              height={44}
              width={width}
              sx={{ borderRadius: 1, opacity: 0.85 - i * 0.04 }}
            />
          ))}
        </Stack>
      </Stack>
    </Box>
  );
}
