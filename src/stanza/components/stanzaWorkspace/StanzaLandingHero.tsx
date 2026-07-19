import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { StanzaSong } from '../../db/stanzaDb';
import StanzaAccountMenu from '../StanzaAccountMenu';
import StanzaRepeatMark from '../StanzaRepeatMark';
import StanzaLibraryGrid from './StanzaLibraryGrid';

type StanzaLandingHeroProps = {
  alerts: ReactNode;
  ytPaste: string;
  onYtPasteChange: (value: string) => void;
  canLoadYoutube: boolean;
  onLoadYoutube: () => void;
  onUploadFile: (file: File) => void;
  librarySongs: StanzaSong[];
  libraryCount: number;
  selectedId: string | null;
  onNavigateToSong: (song: StanzaSong) => void;
  onOpenLibraryMenu: (anchor: HTMLElement, songId: string) => void;
};

/** Landing state: account menu row, deep-link alerts, hero import surface, library panel. */
export default function StanzaLandingHero({
  alerts,
  ytPaste,
  onYtPasteChange,
  canLoadYoutube,
  onLoadYoutube,
  onUploadFile,
  librarySongs,
  libraryCount,
  selectedId,
  onNavigateToSong,
  onOpenLibraryMenu,
}: StanzaLandingHeroProps) {
  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: { xs: 1.5, sm: 2 }, pt: { xs: 1, sm: 1.25 } }}>
        <StanzaAccountMenu />
      </Box>
      <Box sx={{ px: { xs: 1.5, sm: 2 } }}>{alerts}</Box>
      <Box className="stanza-hero">
        <Box className="stanza-hero-inner">
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <StanzaRepeatMark size={80} />
          </Box>
          <Typography
            variant="h3"
            component="h1"
            className="stanza-hero-title"
            sx={{ mb: 1, fontSize: { xs: '2.35rem', sm: '2.75rem' } }}
          >
            Stanza
          </Typography>
          <Typography
            variant="h6"
            component="p"
            className="stanza-hero-lede"
            sx={{ mb: 3, maxWidth: '36ch', mx: 'auto' }}
          >
            Practice songs in sections. Loop, mark beats, and mix layers on uploaded audio or video.
          </Typography>
          <TextField
            className="stanza-hero-url"
            fullWidth
            label="Paste a YouTube link or video ID"
            value={ytPaste}
            onChange={(e) => onYtPasteChange(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
            autoComplete="url"
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              if (canLoadYoutube) onLoadYoutube();
            }}
            slotProps={{
              htmlInput: { enterKeyHint: 'go' }
            }}
          />
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ mt: 2.5, justifyContent: 'center', alignItems: 'stretch' }}
          >
            <Button
              variant="contained"
              size="large"
              className="stanza-btn-pill"
              onClick={onLoadYoutube}
              disabled={!canLoadYoutube}
              sx={{ minHeight: 52, px: 3 }}
            >
              Load video
            </Button>
            <Button
              component="label"
              variant="outlined"
              size="large"
              className="stanza-btn-soft-outline"
              sx={{ minHeight: 52, px: 3 }}
            >
              Upload file
              <input
                hidden
                type="file"
                accept="audio/*,video/mp4,video/webm,video/quicktime,.mp4,.mov,.webm"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUploadFile(f);
                  e.target.value = '';
                }}
              />
            </Button>
          </Stack>
          {/* Discovery hint for the window-level drop zone. Kept understated. power users
              will notice once they try; it's not blocking the keyboard / button paths. */}
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              textAlign: 'center',
              mt: 1.5,
              color: 'rgba(76, 29, 149, 0.55)',
              fontWeight: 500,
              letterSpacing: '0.01em',
            }}
          >
            or drop an audio or video file anywhere on the page
          </Typography>
        </Box>
      </Box>
      {libraryCount > 0 && (
        <Paper className="stanza-panel" elevation={0} sx={{ maxWidth: '56rem', mx: 'auto', mt: 1, mb: 3, px: 2, py: 2 }}>
          <Typography variant="subtitle2" className="stanza-whisper-title" sx={{ mb: 1.5 }}>
            Your library
          </Typography>
          <StanzaLibraryGrid
            variant="landing"
            songs={librarySongs}
            selectedId={selectedId}
            onNavigateToSong={onNavigateToSong}
            onOpenLibraryMenu={onOpenLibraryMenu}
          />
        </Paper>
      )}
    </>
  );
}
