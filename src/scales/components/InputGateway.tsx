import { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import { useScales } from '../store';

// Material 3 dialog spec references:
//   https://m3.material.io/components/dialogs/specs
// Spacing follows an 8dp rhythm; the theme's spacingBase is 4px so
// sx spacing values map 1 -> 4px (i.e. sx={{ p: 6 }} === 24dp).

function Icon({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="material-symbols-outlined"
      style={{ fontSize: size, lineHeight: 1 }}
    >
      {name}
    </span>
  );
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
      role="dialog"
      aria-modal="true"
      aria-labelledby="input-gateway-title"
      aria-describedby="input-gateway-description"
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 1300,
        // M3 scrim: 32% black over the surface
        bgcolor: 'rgba(0, 0, 0, 0.32)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 4,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          maxWidth: 480,
          width: '100%',
          // M3 extra-large shape token
          borderRadius: '28px',
          overflow: 'hidden',
          // M3 basic dialog: 24dp padding inside the container
          p: { xs: 6, sm: 8 },
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Box
            aria-hidden="true"
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              // M3 hero icon surface: primary container tint
              bgcolor: theme => `${theme.palette.primary.main}1F`,
              color: 'primary.main',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 4,
            }}
          >
            <Icon name="piano" size={28} />
          </Box>
          <Typography
            id="input-gateway-title"
            component="h2"
            sx={{
              // headlineSmall: 24sp / 32 line / 0 tracking
              fontSize: '1.5rem',
              fontWeight: 500,
              lineHeight: '2rem',
              letterSpacing: 0,
              color: 'text.primary',
              mb: 4,
            }}
          >
            Connect your piano
          </Typography>
          <Typography
            id="input-gateway-description"
            sx={{
              // bodyMedium: 14sp / 20 line / 0.25 tracking
              fontSize: '0.875rem',
              lineHeight: '1.25rem',
              letterSpacing: '0.015625rem',
              color: 'text.secondary',
              maxWidth: 360,
              mx: 'auto',
            }}
          >
            Each scale is graded by listening to your playing. Pick the input that matches your setup.
          </Typography>
        </Box>

        {/* Keyboard path */}
        <Box sx={{ mb: 6 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
            <Icon name="piano" size={20} />
            <Typography
              sx={{
                // titleMedium: 16sp / 24 line / 0.15 tracking / 500
                fontSize: '1rem',
                fontWeight: 500,
                lineHeight: '1.5rem',
                letterSpacing: '0.009375rem',
              }}
            >
              MIDI keyboard
            </Typography>
            <Typography
              component="span"
              sx={{
                ml: 'auto',
                // M3 assist chip: 32dp height, 8dp radius, primary-container tint
                display: 'inline-flex',
                alignItems: 'center',
                height: 24,
                px: 2,
                borderRadius: '8px',
                bgcolor: theme => `${theme.palette.primary.main}14`,
                color: 'primary.main',
                // labelSmall: 11sp / 16 / 0.5 tracking / 500
                fontSize: '0.6875rem',
                fontWeight: 500,
                lineHeight: 1,
                letterSpacing: '0.03125rem',
                textTransform: 'uppercase',
              }}
            >
              Recommended
            </Typography>
          </Box>
          <Typography
            sx={{
              fontSize: '0.875rem',
              lineHeight: '1.25rem',
              letterSpacing: '0.015625rem',
              color: 'text.secondary',
            }}
          >
            Plug in via USB and allow MIDI access when prompted. Detection is automatic.
          </Typography>
          <Typography
            sx={{
              display: 'block',
              mt: 2,
              // bodySmall: 12sp / 16 / 0.4 tracking
              fontSize: '0.75rem',
              lineHeight: '1rem',
              letterSpacing: '0.025rem',
              color: 'text.disabled',
            }}
          >
            Requires Chrome, Edge, or Opera. Not supported on iPhones or iPads.
          </Typography>

          {disabledConnectedDevices.length > 0 && (
            <Box
              sx={{
                mt: 4,
                p: 3,
                borderRadius: '12px',
                bgcolor: 'action.hover',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              {disabledConnectedDevices.map(device => (
                <Box
                  key={device.id}
                  sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                >
                  <Typography
                    sx={{
                      flex: 1,
                      fontSize: '0.875rem',
                      lineHeight: '1.25rem',
                      color: 'text.secondary',
                    }}
                  >
                    <Box component="strong" sx={{ color: 'text.primary' }}>
                      {device.name}
                    </Box>
                    {' '}is connected but disabled.
                  </Typography>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => toggleMidiDevice(device.id)}
                    sx={{
                      whiteSpace: 'nowrap',
                      borderRadius: '999px',
                      fontSize: '0.875rem',
                      letterSpacing: '0.00625rem',
                    }}
                  >
                    Enable
                  </Button>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 6 }}>
          <Typography
            sx={{
              px: 2,
              // labelMedium: 12sp / 16 / 0.5 tracking / 500
              fontSize: '0.75rem',
              fontWeight: 500,
              lineHeight: '1rem',
              letterSpacing: '0.03125rem',
              color: 'text.disabled',
              textTransform: 'uppercase',
            }}
          >
            or
          </Typography>
        </Divider>

        {/* Microphone path */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
            <Icon name="mic" size={20} />
            <Typography
              sx={{
                fontSize: '1rem',
                fontWeight: 500,
                lineHeight: '1.5rem',
                letterSpacing: '0.009375rem',
              }}
            >
              Microphone
            </Typography>
          </Box>
          <Typography
            sx={{
              mb: 5,
              fontSize: '0.875rem',
              lineHeight: '1.25rem',
              letterSpacing: '0.015625rem',
              color: 'text.secondary',
            }}
          >
            The only option for acoustic pianos and iOS. Works best in a quiet room.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={enableMic}
            disabled={micRequesting}
            startIcon={<Icon name="mic" size={18} />}
            disableElevation
            sx={{
              // M3 filled button: 40dp min-height, fully rounded, labelLarge
              height: 40,
              borderRadius: '999px',
              fontSize: '0.875rem',
              fontWeight: 500,
              letterSpacing: '0.00625rem',
            }}
          >
            {micRequesting ? 'Requesting access…' : 'Enable microphone'}
          </Button>
          {micError && (
            <Alert
              severity="error"
              variant="outlined"
              sx={{ mt: 3, borderRadius: '12px' }}
            >
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  lineHeight: '1rem',
                  letterSpacing: '0.025rem',
                }}
              >
                {micError}
              </Typography>
            </Alert>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
