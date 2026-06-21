import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import type { ReactElement, ReactNode } from 'react';
import {
  originalsViewSectionBodySx,
  originalsViewSectionHeaderSx,
  originalsViewSectionPaperSx,
} from '../originalsViewSectionUi';

export type OriginalsViewSectionProps = {
  title: string;
  onEdit?: () => void;
  editLabel?: string;
  /** Actions shown before Edit (copy, toggles, etc.). */
  trailing?: ReactNode;
  children: ReactNode;
};

/** Read-only originals section — shared header band + body padding for song view. */
export function OriginalsViewSection({
  title,
  onEdit,
  editLabel = 'Edit',
  trailing,
  children,
}: OriginalsViewSectionProps): ReactElement {
  const theme = useTheme();

  return (
    <Paper elevation={0} sx={originalsViewSectionPaperSx(theme)}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        gap={1}
        useFlexGap
        sx={originalsViewSectionHeaderSx(theme)}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
          {title}
        </Typography>
        <Stack direction="row" alignItems="center" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ flexShrink: 0 }}>
          {trailing}
          {onEdit ? (
            <Button
              size="small"
              variant="text"
              startIcon={<EditOutlinedIcon sx={{ fontSize: 16 }} />}
              onClick={onEdit}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                minWidth: 0,
                color: 'text.secondary',
              }}
            >
              {editLabel}
            </Button>
          ) : null}
        </Stack>
      </Stack>
      <Box sx={originalsViewSectionBodySx()}>{children}</Box>
    </Paper>
  );
}
