import { useState, useCallback } from 'react';
import { Box, Button, Typography, Paper, Alert } from '@mui/material';
import { useScales } from '../store';

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return <span className="material-symbols-outlined" style={{ fontSize: size }}>{name}</span>;
}

export default function InputGateway() {
  const { state, startMicrophoneInput, toggleMidiDevice } = useScales();
  const [micRequesting, setMicRequesting] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const disabledConnectedDevices = state.midiDevices.filter(
    d => d.connected && state.disabledMidiDeviceIds.has(d.id),
  );

  const enableMic = useCallback(async () => {
    setMicRequesting(true);
    setMicError(null);
    const ok = await startMicrophoneInput();
    if (!ok) {
      setMicError('Microphone access was denied. Check your browser permissions and try again.');
    }
    setMicRequesting(false);
  }, [startMicrophoneInput]);

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 1300,
        bgcolor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
      }}
    >
      <Paper
        elevation={8}
        sx={{
          maxWidth: 480,
          width: '100%',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ textAlign: 'center', px: 3, pt: 4, pb: 2 }}>
          <Icon name="piano" size={48} />
          <Typography variant="h1" sx={{ fontSize: '1.35rem', fontWeight: 700, mt: 1, mb: 0.5 }}>
            Connect your piano
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360, mx: 'auto' }}>
            This app listens to your playing to grade your scales. Connect a keyboard or enable your microphone to get started.
          </Typography>
        </Box>

        <Box sx={{ px: 3, pb: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Keyboard path */}
          <Paper variant="outlined" sx={{ p: 2.5, textAlign: 'left' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Icon name="usb" size={22} />
              <Typography variant="body1" fontWeight={600}>
                Connect a keyboard
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  ml: 'auto',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  px: 1,
                  py: 0.25,
                  borderRadius: 1,
                  fontWeight: 600,
                  fontSize: '0.65rem',
                }}
              >
                Recommended
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" component="div">
              <ol style={{ margin: 0, paddingLeft: 20 }}>
                <li>Connect your MIDI keyboard or digital piano via USB</li>
                <li>Allow MIDI access when your browser prompts you</li>
                <li>The app will detect it automatically</li>
              </ol>
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1 }}>
              Requires a browser with Web MIDI support (Chrome, Edge, or Opera). Not available on iPhones or iPads.
            </Typography>

            {disabledConnectedDevices.length > 0 && (
              <Box sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
                {disabledConnectedDevices.map(device => (
                  <Box key={device.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: disabledConnectedDevices.indexOf(device) > 0 ? 0.75 : 0 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                      {device.name} is connected but disabled.
                    </Typography>
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => toggleMidiDevice(device.id)}
                      sx={{ textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                      Enable
                    </Button>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>

          {/* Microphone path */}
          <Paper variant="outlined" sx={{ p: 2.5, textAlign: 'left' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Icon name="mic" size={22} />
              <Typography variant="body1" fontWeight={600}>
                Use your microphone
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Enable microphone input so the app can hear your playing. This is the only supported option for acoustic pianos and iOS devices. Works best in a quiet room.
            </Typography>
            <Button
              variant="outlined"
              fullWidth
              onClick={enableMic}
              disabled={micRequesting}
              startIcon={<Icon name="mic" size={18} />}
              sx={{ textTransform: 'none' }}
            >
              {micRequesting ? 'Requesting access...' : 'Enable microphone'}
            </Button>
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1 }}>
              Microphone input is less accurate than a direct keyboard connection.
            </Typography>
            {micError && (
              <Alert severity="error" variant="outlined" sx={{ mt: 1, py: 0.25 }}>
                <Typography variant="caption">{micError}</Typography>
              </Alert>
            )}
          </Paper>
        </Box>
      </Paper>
    </Box>
  );
}
