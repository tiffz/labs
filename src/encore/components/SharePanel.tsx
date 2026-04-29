import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useEncore } from '../context/EncoreContext';

export function SharePanel(): React.ReactElement {
  const { publishPublicSnapshot, googleAccessToken } = useEncore();
  const [link, setLink] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const handlePublish = async () => {
    setMsg(null);
    try {
      const { fileId } = await publishPublicSnapshot();
      const url = `${window.location.origin}/encore/#/share/${fileId}`;
      setLink(url);
      setMsg('Snapshot updated on Drive with link sharing. Copy the URL for guests.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Box
      sx={{
        p: { xs: 2, md: 3 },
        pb: { xs: 10, md: 3 },
        maxWidth: { xs: 1, md: 960, lg: 1200 },
        mx: 'auto',
        width: 1,
      }}
    >
      <Typography variant="h6" component="h2" gutterBottom>
        Secret link
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Writes a read-only <code>public_snapshot.json</code> next to your repertoire file and opens it to anyone with
        the link. Guests use <code>VITE_GOOGLE_API_KEY</code> (Drive API, referrer-restricted) to read the file in the
        browser.
      </Typography>
      {!googleAccessToken && (
        <Typography color="error" variant="body2">
          Sign in with Google first.
        </Typography>
      )}
      <Button variant="contained" disabled={!googleAccessToken} onClick={() => void handlePublish()} sx={{ mb: 2 }}>
        Update public snapshot
      </Button>
      {msg && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {msg}
        </Typography>
      )}
      {link && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <TextField label="Guest URL" value={link} fullWidth size="small" InputProps={{ readOnly: true }} />
          <Button
            startIcon={<ContentCopyIcon />}
            variant="outlined"
            onClick={() => void navigator.clipboard.writeText(link)}
            aria-label="Copy guest URL"
          >
            Copy
          </Button>
        </Box>
      )}
    </Box>
  );
}
