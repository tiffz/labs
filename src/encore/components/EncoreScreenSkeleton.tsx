import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { encorePagePaddingTop, encoreScreenPaddingX } from '../theme/encoreM3Layout';
import { encoreMaxWidthPage } from '../theme/encoreUiTokens';

/**
 * Suspense fallback used while a route-bound Encore screen is fetched. Mimics the page header +
 * a few rows of content so the layout does not jump when the chunk resolves. Falls back to a
 * spinner-only state on small viewports where skeletons would shift more than they help.
 */
export function EncoreScreenSkeleton({ label }: { label?: string }): React.ReactElement {
  return (
    <Box
      role="status"
      aria-live="polite"
      aria-label={label ?? 'Loading'}
      sx={{
        px: encoreScreenPaddingX,
        pt: encorePagePaddingTop,
        pb: { xs: 10, md: 5 },
        ...encoreMaxWidthPage,
      }}
    >
      <Stack spacing={2}>
        <Stack spacing={1}>
          <Skeleton variant="text" width="40%" height={36} />
          <Skeleton variant="text" width="65%" height={20} />
        </Stack>
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" width={108} height={32} />
          ))}
        </Stack>
        <Stack spacing={1}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" width="100%" height={48} />
          ))}
        </Stack>
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2 }}>
          <CircularProgress size={22} aria-hidden />
        </Box>
      </Stack>
    </Box>
  );
}
