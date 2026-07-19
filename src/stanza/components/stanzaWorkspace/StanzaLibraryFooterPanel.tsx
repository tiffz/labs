import { useRef } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { StanzaSong } from '../../db/stanzaDb';
import StanzaLibraryGrid from './StanzaLibraryGrid';

type StanzaLibraryFooterPanelProps = {
  ytPaste: string;
  onYtPasteChange: (value: string) => void;
  canAddYoutube: boolean;
  onAddYoutube: () => void;
  onUploadFile: (file: File) => void;
  librarySongs: StanzaSong[];
  libraryCount: number;
  selectedId: string | null;
  onNavigateToSong: (song: StanzaSong) => void;
  onOpenLibraryMenu: (anchor: HTMLElement, songId: string) => void;
};

/** Viewer footer: library panel with YouTube paste, file upload, and the song grid. */
export default function StanzaLibraryFooterPanel({
  ytPaste,
  onYtPasteChange,
  canAddYoutube,
  onAddYoutube,
  onUploadFile,
  librarySongs,
  libraryCount,
  selectedId,
  onNavigateToSong,
  onOpenLibraryMenu,
}: StanzaLibraryFooterPanelProps) {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  return (
    <Box
      component="section"
      className="stanza-library-panel"
      aria-labelledby="stanza-library-heading"
    >
      <Typography id="stanza-library-heading" variant="subtitle2" className="stanza-whisper-title stanza-library-panel-heading">
        Your library
        <Typography
          component="span"
          variant="caption"
          sx={{
            color: "text.secondary",
            ml: 1,
            fontWeight: 400
          }}>
          ({libraryCount})
        </Typography>
      </Typography>
      <Box className="stanza-library-panel-body">
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            display: 'block',
            mb: 1.5,
            fontSize: '0.8125rem',
            lineHeight: 1.5,
            maxWidth: '48rem'
          }}>
          Paste a YouTube link or upload a file. You can also open a video with{' '}
          <code>?v=</code> and the id in the URL bar.
        </Typography>
        <Stack spacing={1.25} sx={{ mb: 1.5 }}>
          <TextField
            size="small"
            fullWidth
            label="YouTube URL or id"
            value={ytPaste}
            onChange={(e) => onYtPasteChange(e.target.value)}
            placeholder="https://youtube.com/watch?v=…"
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              if (canAddYoutube) onAddYoutube();
            }}
          />
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{
              flexWrap: "wrap",
              alignItems: "center"
            }}>
            <Button
              variant="contained"
              size="small"
              className="stanza-btn-pill"
              onClick={onAddYoutube}
              disabled={!canAddYoutube}
              sx={{ flexShrink: 0, minHeight: 36 }}
            >
              Add
            </Button>
            <input
              ref={uploadInputRef}
              hidden
              type="file"
              accept="audio/*,video/mp4,video/webm,video/quicktime,.mp4,.mov,.webm"
              tabIndex={-1}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUploadFile(f);
                e.target.value = '';
              }}
            />
            <Button
              type="button"
              variant="outlined"
              size="small"
              className="stanza-btn-soft-outline"
              aria-label="Upload audio or video file to your library"
              onClick={() => uploadInputRef.current?.click()}
              sx={{
                flexShrink: 0,
                whiteSpace: 'nowrap',
                minHeight: 36,
                px: 2,
              }}
            >
              Upload file
            </Button>
          </Stack>
        </Stack>
        <StanzaLibraryGrid
          variant="footer"
          songs={librarySongs}
          selectedId={selectedId}
          onNavigateToSong={onNavigateToSong}
          onOpenLibraryMenu={onOpenLibraryMenu}
        />
      </Box>
    </Box>
  );
}
