import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactElement, ReactNode } from 'react';

/** Space between section overline and first field — pairs with {@link PERFORMANCE_EDITOR_SECTION_FIELD_SPACING}. */
export const PERFORMANCE_EDITOR_SECTION_HEADER_MB = 1.25;

export type PerformanceEditorSectionHeaderProps = {
  title: string;
  caption?: string;
  action?: ReactNode;
};

export function PerformanceEditorSectionHeader(props: PerformanceEditorSectionHeaderProps): ReactElement {
  const { title, caption, action } = props;
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: PERFORMANCE_EDITOR_SECTION_HEADER_MB }}>
      <Box>
        <Typography
          component="h3"
          variant="overline"
          color="text.secondary"
          sx={{ fontWeight: 800, letterSpacing: '0.1em', lineHeight: 1.3, display: 'block' }}
        >
          {title}
        </Typography>
        {caption ? (
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.45, display: 'block', mt: 0.25 }}>
            {caption}
          </Typography>
        ) : null}
      </Box>
      {action ?? null}
    </Box>
  );
}
