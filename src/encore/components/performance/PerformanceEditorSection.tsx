import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import type { ReactElement, ReactNode } from 'react';
import { PerformanceEditorSectionHeader } from './PerformanceEditorSectionHeader';

/** Vertical rhythm between fields inside a performance editor section. */
export const PERFORMANCE_EDITOR_SECTION_FIELD_SPACING = 2;

export type PerformanceEditorSectionProps = {
  title: string;
  caption?: string;
  action?: ReactNode;
  children: ReactNode;
};

/** Section header + body with shared spacing — matches metadata and video blocks. */
export function PerformanceEditorSection(props: PerformanceEditorSectionProps): ReactElement {
  const { title, caption, action, children } = props;
  return (
    <Box component="section" sx={{ minWidth: 0 }}>
      <PerformanceEditorSectionHeader title={title} caption={caption} action={action} />
      <Stack spacing={PERFORMANCE_EDITOR_SECTION_FIELD_SPACING} sx={{ minWidth: 0 }}>
        {children}
      </Stack>
    </Box>
  );
}
