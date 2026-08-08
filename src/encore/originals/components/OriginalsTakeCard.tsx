import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import CloseIcon from '@mui/icons-material/Close';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { useEffect, useState, type ReactElement } from 'react';
import { GoogleDriveBrandIcon } from '../../components/EncoreBrandIcon';
import { encoreExternalToolLinkProps } from '../../theme/encoreUiTokens';
import { originalTakeDisplayName } from '../originalsTakeDisplay';
import type { OriginalAudioTake } from '../types';

export type TakeStorageStatus = 'drive' | 'local' | 'missing';

const STORAGE_STATUS_COPY: Record<TakeStorageStatus, string> = {
  drive: 'Backed up to Drive',
  local: 'Saved on this device',
  missing: 'Choose the audio file again to play on this device',
};

export type OriginalsTakeCardProps = {
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
 * Detailed take card for the focused Record takes stage. Unlike the dense chip used in the
 * sidebar and other stages, this shows notes inline (always visible) and gives each take a
 * proper recording-log row: play, preferred, Drive link, download, remove, and storage state.
 */
export function OriginalsTakeCard(props: OriginalsTakeCardProps): ReactElement {
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
  const [titleDraft, setTitleDraft] = useState(displayName);
  const [titleEditing, setTitleEditing] = useState(false);
  const [notesDraft, setNotesDraft] = useState(take.notes ?? '');
  const [notesEditing, setNotesEditing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!titleEditing) setTitleDraft(displayName);
  }, [displayName, titleEditing]);

  useEffect(() => {
    if (!notesEditing) setNotesDraft(take.notes ?? '');
  }, [take.notes, notesEditing]);

  const commitTitle = () => {
    setTitleEditing(false);
    const next = titleDraft.trim();
    if (onRename && next && next !== displayName) onRename(next);
    else setTitleDraft(displayName);
  };

  const commitNotes = () => {
    setNotesEditing(false);
    if (onNotesChange) onNotesChange(notesDraft.trim());
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

  return (
    <Box
      sx={(t) => ({
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25,
        p: 2,
        borderRadius: 2,
        border: 1,
        borderColor: isPreferred ? 'primary.main' : 'divider',
        bgcolor: 'background.paper',
        boxShadow: isPreferred ? `0 0 0 1px ${t.palette.primary.main}` : 'none',
        transition: 'border-color 120ms ease, box-shadow 120ms ease',
      })}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
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
              '&:hover': {
                bgcolor: isPlaying ? 'primary.dark' : t.palette.action.selected,
              },
            })}
          >
            {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>
        </Tooltip>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          {readOnly || !onRename ? (
            <Typography sx={{ fontWeight: 700, lineHeight: 1.3, wordBreak: 'break-word' }}>
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
                fontWeight: 700,
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25 }}>
            {isPreferred ? (
              <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700 }}>
                Preferred take
              </Typography>
            ) : null}
            <Typography
              variant="caption"
              sx={{ color: storageStatus === 'missing' ? 'warning.main' : 'text.secondary' }}
            >
              {STORAGE_STATUS_COPY[storageStatus]}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
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
            <Tooltip title="Open in Google Drive">
              <IconButton
                component="a"
                href={driveOpenUrl}
                {...encoreExternalToolLinkProps}
                aria-label="Open in Google Drive"
                sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
              >
                <GoogleDriveBrandIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          ) : null}
          {onDownload ? (
            <Tooltip title={downloadDisabled ? downloadDisabledReason ?? 'Download' : 'Download'}>
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

      {readOnly ? (
        take.notes?.trim() ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap', pl: 7.5 }}>
            {take.notes.trim()}
          </Typography>
        ) : null
      ) : (
        <TextField
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          onFocus={() => setNotesEditing(true)}
          onBlur={commitNotes}
          placeholder="Notes on this take, e.g. use the second chorus, a little flat on the bridge"
          size="small"
          fullWidth
          multiline
          minRows={2}
          maxRows={8}
          aria-label={`Notes for ${displayName}`}
          sx={{ pl: 7.5 }}
        />
      )}
    </Box>
  );
}
