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
  menuAnchor: HTMLElement | null;
  onOpenMenu: (anchor: HTMLElement) => void;
  onCloseMenu: () => void;
  pasteValue: string;
  onPasteValueChange: (next: string) => void;
  onPasteApply: (raw: string) => void;
  pasteError?: string | null;
  spotifyLinked: boolean;
  clientId: string;
  searchValue: string;
  onSearchValueChange: (next: string) => void;
  /** Prefill and search on focus when the field is empty (usually title + artist). */
  searchSeed?: string;
  spotifyOptions: SpotifySearchTrack[];
  spotifyLoading: boolean;
  onPickSpotifyTrack: (track: SpotifySearchTrack) => void;
  uploadDisabled: boolean;
  uploadDisabledReason?: string;
  onUploadClick: () => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  fileAccept: string;
};

/** Add track chip + dropdown with link paste, optional Spotify search, and file upload. */
export function EncoreMediaTrackAddMenu(props: EncoreMediaTrackAddMenuProps): ReactElement {
  const {
    addButtonLabel = 'Add track',
    menuAnchor,
    onOpenMenu,
    onCloseMenu,
    pasteValue,
    onPasteValueChange,
    onPasteApply,
    pasteError,
    spotifyLinked,
    clientId,
    searchValue,
    onSearchValueChange,
    searchSeed,
    spotifyOptions,
    spotifyLoading,
    onPickSpotifyTrack,
    uploadDisabled,
    uploadDisabledReason,
    onUploadClick,
    onFileChange,
    fileInputRef,
    fileAccept,
  } = props;

  const showSpotifySearch = spotifyLinked && Boolean(clientId);

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        color="inherit"
        startIcon={<AddIcon sx={{ fontSize: 14 }} />}
        onClick={(e) => onOpenMenu(e.currentTarget)}
        sx={(t) => encoreMediaHubAddButtonSx(t)}
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
          <Typography variant="caption" color="text.secondary" sx={menuSectionCaptionSx}>
            Paste a link
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={menuSectionHintSx}>
            Spotify, YouTube, Stanza, or Drive
          </Typography>
          <EncoreMediaUrlPasteField
            value={pasteValue}
            onChange={onPasteValueChange}
            onApply={onPasteApply}
            placeholder="Paste link"
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
            <Typography variant="caption" color="text.secondary" sx={menuSectionCaptionSx}>
              Search Spotify
            </Typography>
            <EncoreSpotifyMenuSearchField
              options={spotifyOptions}
              loading={spotifyLoading}
              inputValue={searchValue}
              onInputChange={onSearchValueChange}
              searchSeed={searchSeed}
              onPickTrack={onPickSpotifyTrack}
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
            secondary={uploadDisabledReason ?? 'Audio or video'}
            primaryTypographyProps={{ fontWeight: 600 }}
          />
        </MenuItem>
      </Menu>
      <input ref={fileInputRef} type="file" hidden accept={fileAccept} onChange={onFileChange} />
    </>
  );
}
