import NotesIcon from '@mui/icons-material/Notes';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import {
  cloneElement,
  isValidElement,
  useCallback,
  useId,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { encoreMediaLinkRowSx } from '../theme/encoreUiTokens';

export type EncoreAudioResourceNotesWrapperProps = {
  /** Main row (e.g. {@link EncoreMediaLinkRow} with hover wrapper). */
  children: ReactNode;
  notes: string;
  onNotesChange: (next: string) => void;
  /** Shown in the popover above the field. */
  resourceLabel?: string;
};

/**
 * Wraps an audio-resource row with notes in one capped-width chip so the strip + notes read as one control.
 */
export function EncoreAudioResourceNotesWrapper(props: EncoreAudioResourceNotesWrapperProps): ReactElement {
  const theme = useTheme();
  const { children, notes, onNotesChange, resourceLabel = 'Notes' } = props;
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const titleId = useId();

  const close = useCallback(() => setAnchor(null), []);

  const rowChild = isValidElement(children)
    ? cloneElement(children as ReactElement<{ embedded?: boolean }>, { embedded: true })
    : children;

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'stretch',
        maxWidth: 'min(100%, 440px)',
        width: 'auto',
        minWidth: 0,
        mb: 0.75,
        ...encoreMediaLinkRowSx(theme, false),
        pr: 0.25,
        pl: 0.5,
        gap: 0.25,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', alignItems: 'center' }}>{rowChild}</Box>
      {notes.trim() ? (
        <Tooltip title={notes.trim()}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              alignSelf: 'center',
              maxWidth: 72,
              flexShrink: 0,
              display: { xs: 'none', sm: 'block' },
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontWeight: 500,
              lineHeight: 1.35,
            }}
          >
            {notes.trim()}
          </Typography>
        </Tooltip>
      ) : null}
      <Tooltip title={notes.trim() ? 'Edit notes' : 'Add notes'}>
        <IconButton
          size="small"
          aria-label={notes.trim() ? 'Edit notes for this track' : 'Add notes for this track'}
          aria-expanded={anchor ? 'true' : 'false'}
          aria-haspopup="dialog"
          onClick={(e) => setAnchor(e.currentTarget)}
          sx={{
            alignSelf: 'center',
            flexShrink: 0,
            color: notes.trim() ? 'primary.main' : 'text.disabled',
            '&:hover': { color: 'primary.main' },
          }}
        >
          <NotesIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: { p: 1.5, width: { xs: 'min(calc(100vw - 32px), 320px)', sm: 320 } },
            'aria-labelledby': titleId,
          },
        }}
        disableRestoreFocus
      >
        <Typography id={titleId} variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          {resourceLabel}
        </Typography>
        <TextField
          size="small"
          placeholder="Optional, e.g. which take to use"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          multiline
          minRows={2}
          maxRows={6}
          fullWidth
          inputProps={{ 'aria-label': resourceLabel }}
        />
      </Popover>
    </Box>
  );
}
