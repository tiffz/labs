import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { GoogleDriveBrandIcon } from '../../components/EncoreBrandIcon';
import { encoreExternalToolLinkProps } from '../../theme/encoreUiTokens';
import { originalTakeDisplayName } from '../originalsTakeDisplay';
import type { TakeStorageStatus } from '../hooks/useOriginalsTakes';
import type { OriginalAudioTake } from '../types';

const STORAGE_STATUS_COPY: Record<TakeStorageStatus, string> = {
  drive: 'Backed up',
  local: 'On this device',
  missing: 'Choose the file again to play it here',
};

export type OriginalsTakeRowProps = {
  take: OriginalAudioTake;
  isPreferred: boolean;
  isPlaying: boolean;
  playable: boolean;
  storageStatus: TakeStorageStatus;
  driveOpenUrl?: string;
  readOnly?: boolean;
  onPlay: () => void;
  onMakePreferred?: () => void;
  onRemove?: () => void;
  onRename?: (label: string) => void;
  onNotesChange?: (notes: string) => void;
  onDownload?: () => void | Promise<void>;
  downloadDisabled?: boolean;
  downloadDisabledReason?: string;
};

/**
 * One take on the Record-takes workspace.
 *
 * Deliberately lighter than the card it replaced: no border ring on the preferred take (the filled
 * star already says it), and notes collapse to a single line until clicked. An always-open empty
 * textarea per take was the bulk of the old surface's visual weight for content that is usually
 * absent.
 */
export function OriginalsTakeRow(props: OriginalsTakeRowProps): ReactElement {
  const {
    take,
    isPreferred,
    isPlaying,
    playable,
    storageStatus,
    driveOpenUrl,
    readOnly = false,
    onPlay,
    onMakePreferred,
    onRemove,
    onRename,
    onNotesChange,
    onDownload,
    downloadDisabled = false,
    downloadDisabledReason,
  } = props;

  const displayName = originalTakeDisplayName(take.label);
  const notes = take.notes?.trim() ?? '';
  const [titleDraft, setTitleDraft] = useState(displayName);
  const [titleEditing, setTitleEditing] = useState(false);
  const [notesDraft, setNotesDraft] = useState(notes);
  const [notesOpen, setNotesOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const notesFieldRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (notesOpen) notesFieldRef.current?.focus();
  }, [notesOpen]);

  useEffect(() => {
    if (!titleEditing) setTitleDraft(displayName);
  }, [displayName, titleEditing]);

  useEffect(() => {
    if (!notesOpen) setNotesDraft(notes);
  }, [notes, notesOpen]);

  const commitTitle = () => {
    setTitleEditing(false);
    const next = titleDraft.trim();
    if (onRename && next && next !== displayName) onRename(next);
    else setTitleDraft(displayName);
  };

  const commitNotes = () => {
    setNotesOpen(false);
    if (onNotesChange && notesDraft.trim() !== notes) onNotesChange(notesDraft);
  };

  const handleDownload = async () => {
    if (!onDownload || downloading || downloadDisabled) return;
    setDownloading(true);
    try {
      await onDownload();
    } finally {
      setDownloading(false);
    }
  };

  const playTooltip = isPlaying ? 'Pause' : playable ? 'Play take' : 'Choose the file to play it here';
  const canEditNotes = !readOnly && Boolean(onNotesChange);

  return (
    <Box
      component="li"
      sx={{
        listStyle: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        py: 1.25,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          minWidth: 0,
          // 390px: let the action cluster wrap under the title instead of crushing it.
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
        }}
      >
        <Tooltip title={playTooltip}>
          <IconButton
            aria-label={playTooltip}
            onClick={onPlay}
            sx={(t) => ({
              flexShrink: 0,
              width: 44,
              height: 44,
              color: isPlaying ? 'primary.contrastText' : 'primary.main',
              bgcolor: isPlaying ? 'primary.main' : t.palette.action.hover,
              '&:hover': { bgcolor: isPlaying ? 'primary.dark' : t.palette.action.selected },
            })}
          >
            {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>
        </Tooltip>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          {readOnly || !onRename ? (
            <Typography sx={{ fontWeight: 600, lineHeight: 1.3, wordBreak: 'break-word' }}>
              {displayName}
            </Typography>
          ) : (
            <InputBase
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onFocus={() => setTitleEditing(true)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  (e.target as HTMLInputElement).blur();
                } else if (e.key === 'Escape') {
                  setTitleDraft(displayName);
                  setTitleEditing(false);
                  (e.target as HTMLInputElement).blur();
                }
              }}
              inputProps={{ 'aria-label': 'Take name' }}
              sx={{
                fontWeight: 600,
                fontSize: '1rem',
                lineHeight: 1.3,
                width: '100%',
                px: 0.5,
                mx: -0.5,
                borderRadius: 1,
                '&:hover': { bgcolor: 'action.hover' },
                '&.Mui-focused': { bgcolor: 'action.hover' },
              }}
            />
          )}
          <Typography
            variant="caption"
            sx={{ color: storageStatus === 'missing' ? 'warning.main' : 'text.secondary' }}
          >
            {isPreferred ? 'Preferred take · ' : ''}
            {STORAGE_STATUS_COPY[storageStatus]}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0, ml: 'auto' }}>
          {onMakePreferred || isPreferred ? (
            <Tooltip title={isPreferred ? 'Preferred take' : 'Make preferred take'}>
              <span>
                <IconButton
                  aria-label={isPreferred ? 'Preferred take' : 'Make preferred take'}
                  onClick={onMakePreferred}
                  disabled={isPreferred || !onMakePreferred}
                  sx={{
                    color: isPreferred ? 'primary.main' : 'text.secondary',
                    '&.Mui-disabled': { color: isPreferred ? 'primary.main' : undefined },
                  }}
                >
                  {isPreferred ? <StarIcon /> : <StarBorderIcon />}
                </IconButton>
              </span>
            </Tooltip>
          ) : null}
          {driveOpenUrl ? (
            <Tooltip title="Open in Drive">
              <IconButton
                component="a"
                href={driveOpenUrl}
                {...encoreExternalToolLinkProps}
                aria-label="Open in Drive"
                sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
              >
                <GoogleDriveBrandIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          ) : null}
          {onDownload ? (
            <Tooltip title={downloadDisabled ? (downloadDisabledReason ?? 'Download') : 'Download'}>
              <span>
                <IconButton
                  aria-label="Download take"
                  disabled={downloadDisabled || downloading}
                  onClick={() => void handleDownload()}
                  sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
                >
                  {downloading ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <FileDownloadOutlinedIcon />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          ) : null}
          {onRemove ? (
            <Tooltip title="Remove take">
              <IconButton
                aria-label="Remove take"
                onClick={onRemove}
                sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
              >
                <CloseIcon />
              </IconButton>
            </Tooltip>
          ) : null}
        </Box>
      </Box>

      {notesOpen && canEditNotes ? (
        <TextField
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          onBlur={commitNotes}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setNotesDraft(notes);
              setNotesOpen(false);
            }
          }}
          placeholder="Use the second chorus, a little flat on the bridge"
          size="small"
          fullWidth
          multiline
          minRows={2}
          maxRows={8}
          // Focus follows the user's explicit click on "Add notes" — not a page-load autofocus,
          // which is what jsx-a11y/no-autofocus guards against.
          inputRef={notesFieldRef}
          // A bare `aria-label` on TextField lands on the wrapper div, leaving the textarea
          // unnamed; MUI v9 removed `inputProps`, so the label must go through `slotProps.htmlInput`
          // to reach the real control.
          slotProps={{ htmlInput: { 'aria-label': `Notes for ${displayName}` } }}
          sx={{ pl: { xs: 0, sm: 7.5 } }}
        />
      ) : notes ? (
        <Typography
          variant="body2"
          onClick={canEditNotes ? () => setNotesOpen(true) : undefined}
          sx={{
            color: 'text.secondary',
            whiteSpace: 'pre-wrap',
            pl: { xs: 0, sm: 7.5 },
            ...(canEditNotes
              ? { cursor: 'text', borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }
              : {}),
          }}
        >
          {notes}
        </Typography>
      ) : canEditNotes ? (
        <Box
          component="button"
          type="button"
          onClick={() => setNotesOpen(true)}
          sx={{
            alignSelf: 'flex-start',
            ml: { xs: 0, sm: 7.5 },
            // 24px is the hard coarse-pointer floor asserted by responsive-all-apps.spec.ts, and
            // text.disabled sits under the WCAG AA contrast floor for an interactive label.
            minHeight: 24,
            px: 0.5,
            border: 0,
            bgcolor: 'transparent',
            color: 'text.secondary',
            font: 'inherit',
            fontSize: '0.8125rem',
            cursor: 'text',
            borderRadius: 1,
            '&:hover': { color: 'text.secondary' },
          }}
        >
          Add notes
        </Box>
      ) : null}
    </Box>
  );
}
