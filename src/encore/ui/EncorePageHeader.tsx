import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import {
  encorePageHeaderSubtitleSx,
  encorePageKickerSx,
  encorePageTitleSx,
} from '../theme/encoreUiTokens';

export type EncorePageHeaderProps = {
  /** Optional overline above the title; omit to lead straight with the title. */
  kicker?: string;
  title: string;
  /** Semantic heading level (landings use h1). */
  titleComponent?: React.ElementType;
  /** Visual size; default h6 for list sections, h3/h4 for landings. */
  titleVariant?: 'h3' | 'h4' | 'h5' | 'h6';
  description?: string;
  actions?: React.ReactNode;
  sx?: SystemStyleObject<Theme>;
  /** When true, clamp description and tighten vertical rhythm for list/table layouts. */
  listSurface?: boolean;
  /** When true, omit description entirely (song dashboard grid view). */
  hideDescription?: boolean;
  /** When true, smaller title and tighter spacing (song dashboard grid view). */
  compact?: boolean;
};

/**
 * Consistent page chrome: optional kicker (overline), primary title, supporting copy, actions.
 */
export function EncorePageHeader(props: EncorePageHeaderProps): React.ReactElement {
  const {
    kicker,
    title,
    titleComponent = 'h2',
    titleVariant = 'h6',
    description,
    actions,
    listSurface = false,
    hideDescription = false,
    compact = false,
    sx,
  } = props;
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={compact ? 1.25 : listSurface ? 1.25 : 2}
      justifyContent="space-between"
      alignItems={{ xs: 'stretch', sm: 'flex-start' }}
      sx={{ mb: listSurface ? 0 : { xs: 3, sm: 4 }, ...sx }}
    >
      <Box sx={{ minWidth: 0, pr: { sm: 2 } }}>
        {kicker ? (
          <Typography variant="overline" color="primary" sx={encorePageKickerSx}>
            {kicker}
          </Typography>
        ) : null}
        <Typography
          variant={titleVariant}
          component={titleComponent}
          sx={{
            ...encorePageTitleSx,
            ...(compact ? { fontSize: { xs: '1.125rem', sm: '1.25rem' } } : {}),
            ...(titleVariant === 'h3' ? { letterSpacing: '-0.03em', lineHeight: 1.12 } : {}),
            ...(titleVariant === 'h4' ? { mt: 0.5 } : {}),
          }}
        >
          {title}
        </Typography>
        {description && !hideDescription ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              ...encorePageHeaderSubtitleSx,
              ...(listSurface
                ? {
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }
                : {}),
            }}
          >
            {description}
          </Typography>
        ) : null}
      </Box>
      {actions ? (
        <Box sx={{ flexShrink: 0, alignSelf: { xs: 'stretch', sm: 'center' }, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {actions}
        </Box>
      ) : null}
    </Stack>
  );
}
