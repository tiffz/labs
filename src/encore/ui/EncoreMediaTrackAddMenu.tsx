import AddIcon from '@mui/icons-material/Add';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import type { ChangeEvent, ReactElement } from 'react';
import type { SpotifySearchTrack } from '../spotify/spotifyApi';
import { encoreMediaHubAddButtonSx } from '../theme/encoreUiTokens';
import { EncoreMediaUrlPasteField } from './EncoreMediaUrlPasteField';
import { EncoreSpotifyMenuSearchField } from './EncoreSpotifyMenuSearchField';

function stopMenuClose(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

const menuSectionCaptionSx = {
  display: 'block',
  mb: 0.375,
  px: 0.25,
  lineHeight: 1.45,
  fontWeight: 600,
} as const;

const menuSectionHintSx = {
  display: 'block',
  mb: 1,
  px: 0.25,
  lineHeight: 1.45,
  opacity: 0.88,
} as const;

export type EncoreMediaTrackAddMenuProps = {
  addButtonLabel?: string;
  /** `chip` is the media-hub chip; `button` is a full-size outlined button for a focused stage. */
  triggerVariant?: 'chip' | 'button';
  menuAnchor: HTMLElement | null;
  onOpenMenu: (anchor: HTMLElement) => void;
  onCloseMenu: () => void;
  pasteValue: string;
  onPasteValueChange: (next: string) => void;
  onPasteApply: (raw: string) => void;
  pasteError?: string | null;
  /** Which links the field takes, under "Paste a link". */
  pasteHint?: string;
  /** Disables the paste field while a pasted link is being added. */
  pasteBusy?: boolean;
  /** Omit the Spotify props (or pass `spotifyLinked: false`) for surfaces that only take files. */
  spotifyLinked?: boolean;
  clientId?: string;
  searchValue?: string;
  onSearchValueChange?: (next: string) => void;
  /** Prefill and search on focus when the field is empty (usually title + artist). */
  searchSeed?: string;
  spotifyOptions?: SpotifySearchTrack[];
  spotifyLoading?: boolean;
  onPickSpotifyTrack?: (track: SpotifySearchTrack) => void;
  uploadDisabled: boolean;
  uploadDisabledReason?: string;
  /** Secondary line under "Upload file". */
  uploadHint?: string;
  onUploadClick: () => void;
  /**
   * The menu's own file input. Omit all three when the caller already owns an input (and passes
   * `onUploadClick` to open it), so the page does not carry two pickers for one action.
   */
  onFileChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
  fileAccept?: string;
};

/** Add track chip + dropdown with link paste, optional Spotify search, and file upload. */
export function EncoreMediaTrackAddMenu(props: EncoreMediaTrackAddMenuProps): ReactElement {
  const {
    addButtonLabel = 'Add track',
    triggerVariant = 'chip',
    menuAnchor,
    onOpenMenu,
    onCloseMenu,
    pasteValue,
    onPasteValueChange,
    onPasteApply,
    pasteError,
    pasteHint = 'Spotify, YouTube, Stanza, or Drive',
    pasteBusy = false,
    spotifyLinked = false,
    clientId = '',
    searchValue = '',
    onSearchValueChange,
    searchSeed,
    spotifyOptions = [],
    spotifyLoading = false,
    onPickSpotifyTrack,
    uploadDisabled,
    uploadDisabledReason,
    uploadHint = 'Audio or video',
    onUploadClick,
    onFileChange,
    fileInputRef,
    fileAccept,
  } = props;

  const showSpotifySearch =
    spotifyLinked && Boolean(clientId) && Boolean(onSearchValueChange) && Boolean(onPickSpotifyTrack);

  return (
    <>
      <Button
        size={triggerVariant === 'chip' ? 'small' : 'medium'}
        variant="outlined"
        color="inherit"
        startIcon={triggerVariant === 'chip' ? <AddIcon sx={{ fontSize: 14 }} /> : <AddIcon />}
        onClick={(e) => onOpenMenu(e.currentTarget)}
        sx={
          triggerVariant === 'chip'
            ? (t) => encoreMediaHubAddButtonSx(t)
            : { alignSelf: 'flex-start', mt: 0.5 }
        }
        aria-haspopup="menu"
        aria-expanded={Boolean(menuAnchor)}
      >
        {addButtonLabel}
      </Button>
      <Menu
        open={Boolean(menuAnchor)}
        anchorEl={menuAnchor}
        onClose={onCloseMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        disableAutoFocusItem
        slotProps={{
          paper: {
            sx: {
              width: { xs: 'min(calc(100vw - 24px), 340px)', sm: 340 },
              maxWidth: 'calc(100vw - 24px)',
              mt: 0.5,
              overflow: 'visible',
            },
          },
          list: {
            sx: { py: 0, overflow: 'visible' },
          },
        }}
      >
        <Box
          sx={{ px: 2, pt: 1.5, pb: showSpotifySearch ? 1 : 1.25 }}
          onMouseDown={stopMenuClose}
          onClick={stopMenuClose}
        >
          <Typography
            variant="caption"
            sx={[{
              color: "text.secondary"
            }, ...(Array.isArray(menuSectionCaptionSx) ? menuSectionCaptionSx : [menuSectionCaptionSx])]}>
            Paste a link
          </Typography>
          <Typography
            variant="caption"
            sx={[{
              color: "text.secondary"
            }, ...(Array.isArray(menuSectionHintSx) ? menuSectionHintSx : [menuSectionHintSx])]}>
            {pasteHint}
          </Typography>
          <EncoreMediaUrlPasteField
            value={pasteValue}
            onChange={onPasteValueChange}
            onApply={onPasteApply}
            placeholder="Paste link"
            disabled={pasteBusy}
            embedInMenu
          />
          {pasteError ? (
            <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.75, px: 0.25 }}>
              {pasteError}
            </Typography>
          ) : null}
        </Box>

        {showSpotifySearch ? <Divider sx={{ my: 0.25 }} /> : null}
        {showSpotifySearch ? (
          <Box
            sx={{ px: 2, pt: 1.25, pb: 1.25 }}
            onMouseDown={stopMenuClose}
            onClick={stopMenuClose}
          >
            <Typography
              variant="caption"
              sx={[{
                color: "text.secondary"
              }, ...(Array.isArray(menuSectionCaptionSx) ? menuSectionCaptionSx : [menuSectionCaptionSx])]}>
              Search Spotify
            </Typography>
            <EncoreSpotifyMenuSearchField
              options={spotifyOptions}
              loading={spotifyLoading}
              inputValue={searchValue}
              onInputChange={onSearchValueChange!}
              searchSeed={searchSeed}
              onPickTrack={onPickSpotifyTrack!}
            />
          </Box>
        ) : null}

        <Divider sx={{ my: 0.25 }} />
        <MenuItem
          disabled={uploadDisabled}
          sx={{ py: 1.125, px: 2 }}
          onClick={() => {
            onCloseMenu();
            onUploadClick();
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <CloudUploadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Upload file"
            secondary={uploadDisabledReason ?? uploadHint}
            slotProps={{
              primary: { sx: { fontWeight: 600 } }
            }}
          />
        </MenuItem>
      </Menu>
      {fileInputRef && onFileChange ? (
        <input ref={fileInputRef} type="file" hidden accept={fileAccept} onChange={onFileChange} />
      ) : null}
    </>
  );
}
