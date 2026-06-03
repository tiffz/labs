import { useEffect } from 'react';
import SkipToMain from '../shared/components/SkipToMain';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

/**
 * Find the Beat has moved into Stanza (ADR 0013). Preserve query params when redirecting.
 */
export default function BeatRedirect() {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const target = new URL(window.location.href);
      target.pathname = target.pathname.replace(/\/?beat\/?$/, '/stanza/').replace(/\/beat\//, '/stanza/');
      if (!target.pathname.endsWith('/stanza/')) {
        target.pathname = '/stanza/';
      }
      window.location.replace(target.toString());
    }, 4000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
      <SkipToMain />
      <main id="main">
        <Box sx={{ p: 4, maxWidth: 520, mx: 'auto', textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom>
            Find the Beat is now Stanza
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.55 }}>
            Find the Beat has been rebranded and merged into Stanza, the Labs practice app for sections,
            looping, metronome, and optional automatic tempo and section analysis.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.55 }}>
            Your Beat library imports automatically the first time you open Stanza on this device. Upload a
            track or paste a YouTube link to keep practicing.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center">
            <Button component={Link} href="/stanza/" variant="contained" disableElevation>
              Open Stanza
            </Button>
            <Button component={Link} href="/" variant="outlined">
              Labs home
            </Button>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            Redirecting in a few seconds…
          </Typography>
        </Box>
      </main>
    </>
  );
}
