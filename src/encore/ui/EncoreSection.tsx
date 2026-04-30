import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import { encoreSurfaceSectionSx } from '../theme/encoreM3Layout';

export type EncoreSectionProps = {
  title?: string;
  /** Default subtitle2 for dense tool sections; subtitle1 for major blocks. */
  titleVariant?: 'subtitle1' | 'subtitle2';
  titleComponent?: React.ElementType;
  children: React.ReactNode;
  sx?: SystemStyleObject<Theme>;
};

/** Bordered content panel with optional section heading (matches song “surface” panels). */
export function EncoreSection(props: EncoreSectionProps): React.ReactElement {
  const { title, titleVariant = 'subtitle2', titleComponent = 'h3', children, sx } = props;
  return (
    <Box sx={{ ...encoreSurfaceSectionSx, ...sx }}>
      {title ? (
        <Typography
          component={titleComponent}
          variant={titleVariant}
          sx={{ fontWeight: titleVariant === 'subtitle1' ? 800 : 700, mb: titleVariant === 'subtitle1' ? 1.5 : 1.25 }}
        >
          {title}
        </Typography>
      ) : null}
      {children}
    </Box>
  );
}
