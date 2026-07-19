import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

/**
 * Window-level drop overlay. Shown only while the user is dragging files into the page;
 * `pointer-events: none` lets the drop event continue through to the window listener in
 * `useStanzaFileDrop`. Decorative (`aria-hidden`). drag-and-drop is mouse-only UX and
 * the keyboard upload buttons remain available elsewhere on the page.
 */
export default function StanzaFileDropOverlay({ viewerOpen }: { viewerOpen: boolean }) {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'rgba(168, 85, 247, 0.12)',
        backdropFilter: 'blur(4px)',
        transition: 'opacity 80ms ease-out',
      }}
    >
      <Box
        sx={{
          border: '2px dashed rgba(168, 85, 247, 0.6)',
          borderRadius: 3,
          px: 4,
          py: 3,
          bgcolor: 'rgba(255, 255, 255, 0.92)',
          boxShadow: '0 18px 48px rgba(76, 29, 149, 0.18)',
          maxWidth: 420,
          textAlign: 'center',
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#4c1d95', mb: 0.5 }}>
          {viewerOpen ? 'Drop to add audio or video' : 'Drop to load audio or video'}
        </Typography>
        <Typography variant="body2" sx={{ color: '#5b21b6', lineHeight: 1.5 }}>
          {viewerOpen
            ? "Files that match this track's length attach as mix layers. Otherwise Stanza adds a new library song from the first file."
            : 'Stanza saves to your local library and opens the piece. With a song open, matching-length files become mix layers.'}
        </Typography>
      </Box>
    </Box>
  );
}
