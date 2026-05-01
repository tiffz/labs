import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ReactElement } from 'react';
import { useCallback, useRef, useState } from 'react';
import { normalizeSongTags } from '../repertoire/songTags';
import { TagsAutocomplete } from './TagsAutocomplete';

export interface InlineSongTagsCellProps {
  tags: readonly string[];
  suggestions: readonly string[];
  onCommit: (nextTags: string[]) => void;
  /** Tighter chips for grid cards vs. table cells. */
  compact?: boolean;
  disabled?: boolean;
  sx?: SxProps<Theme>;
}

export function InlineSongTagsCell(props: InlineSongTagsCellProps): ReactElement {
  const { tags, suggestions, onCommit, compact = false, disabled = false, sx } = props;
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  const commit = useCallback(
    (next: string[]) => {
      onCommit(normalizeSongTags(next));
    },
    [onCommit]
  );

  const chipSx: SxProps<Theme> = compact
    ? { height: 22, fontWeight: 600, '& .MuiChip-deleteIcon': { fontSize: 16 } }
    : { fontWeight: 600 };

  return (
    <Box
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      sx={[
        { display: 'inline-flex', maxWidth: '100%', minWidth: 0 },
        ...(sx != null ? (Array.isArray(sx) ? sx : [sx]) : []),
      ]}
    >
      <Stack direction="row" gap={0.5} flexWrap="wrap" useFlexGap sx={{ alignItems: 'center' }}>
        {tags.map((t, idx) => (
          <Chip
            key={`${t}:${idx}`}
            size="small"
            label={t}
            variant="outlined"
            disabled={disabled}
            onDelete={
              disabled
                ? undefined
                : (e) => {
                    e.stopPropagation();
                    commit(tags.filter((_, i) => i !== idx));
                  }
            }
            sx={chipSx}
          />
        ))}
        <Box ref={anchorRef} sx={{ display: 'inline-flex' }}>
          <Chip
            size="small"
            label="+ Tag"
            variant="outlined"
            disabled={disabled}
            clickable
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) setOpen(true);
            }}
            aria-label="Add tag"
            sx={{
              ...chipSx,
              borderStyle: 'dashed',
              fontWeight: 500,
            }}
          />
        </Box>
      </Stack>
      <Popover
        open={open}
        anchorEl={anchorRef.current}
        onClose={close}
        disableAutoFocus
        disableEnforceFocus
        disableRestoreFocus
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: { p: 2, width: 320, maxWidth: '90vw' },
            onClick: (e) => e.stopPropagation(),
            onMouseDown: (e) => e.stopPropagation(),
          },
        }}
      >
        <TagsAutocomplete
          dense
          omitInputChips
          value={[...tags]}
          suggestions={suggestions}
          label="Tags"
          placeholder="Type a tag, press Enter"
          onChange={(next) => {
            commit(next);
          }}
          fullWidth
        />
      </Popover>
    </Box>
  );
}
