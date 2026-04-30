import Box, { type BoxProps } from '@mui/material/Box';
import type { Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import { encoreShellCenteredSx, encoreShellLayoutSx } from '../theme/encoreUiTokens';

export type EncoreAppShellProps = Omit<BoxProps, 'sx'> & {
  /** When true, centers children (loading spinners, gate cards). */
  centered?: boolean;
  sx?: SystemStyleObject<Theme>;
};

/**
 * Root layout wrapper for Encore: applies `.encore-app-shell` (CSS gradient) and MUI flex column.
 * Prefer this over Tailwind utilities on the shell.
 */
export function EncoreAppShell(props: EncoreAppShellProps): React.ReactElement {
  const { children, centered, sx, ...rest } = props;
  return (
    <Box
      className="encore-app-shell"
      sx={{
        ...(centered ? encoreShellCenteredSx : encoreShellLayoutSx),
        ...sx,
      }}
      {...rest}
    >
      {children}
    </Box>
  );
}
