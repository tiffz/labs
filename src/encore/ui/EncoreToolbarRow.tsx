import Stack from '@mui/material/Stack';
import type { Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';

export type EncoreToolbarRowProps = {
  children: React.ReactNode;
  sx?: SystemStyleObject<Theme>;
};

/** Primary toolbar row: filters and actions with consistent wrap and gap. */
export function EncoreToolbarRow(props: EncoreToolbarRowProps): React.ReactElement {
  const { children, sx } = props;
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      flexWrap="wrap"
      alignItems={{ xs: 'stretch', sm: 'center' }}
      gap={{ xs: 1.25, sm: 1.5 }}
      rowGap={1}
      columnGap={1.5}
      sx={{ mb: 2, ...sx }}
    >
      {children}
    </Stack>
  );
}
