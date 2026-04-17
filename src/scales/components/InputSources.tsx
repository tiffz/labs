import { useState, useRef, useEffect } from 'react';
import { Box, Typography, Popover } from '@mui/material';
import { useScales, hasEnabledMidiDevice } from '../store';
import { midiToNoteName } from '../../shared/music/scoreTypes';

export default function ScalesInputSources() {
  const { state, toggleMicrophone, toggleMidiDevice } = useScales();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const connectedDevices = state.midiDevices.filter(d => d.connected);
  const hasMidi = hasEnabledMidiDevice(state);
  const hasMic = state.microphoneActive;
  const hasAny = hasMidi || hasMic;

  // Auto-close the popover when all input is lost (e.g. user disables last device)
  // so it doesn't sit on top of the InputGateway modal
  const prevHasAny = useRef(hasAny);
  useEffect(() => {
    if (prevHasAny.current && !hasAny && open) {
      setAnchorEl(null);
    }
    prevHasAny.current = hasAny;
  }, [hasAny, open]);
  const micOnly = hasMic && !hasMidi;

  const label = hasMidi && hasMic
    ? 'Keyboard + Mic'
    : hasMidi
      ? 'Keyboard connected'
      : hasMic
        ? 'Mic listening'
        : 'No input';

  return (
    <>
      <Box
        component="button"
        onClick={(e: React.MouseEvent<HTMLElement>) => setAnchorEl(open ? null : e.currentTarget)}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1.25,
          py: 0.5,
          border: 1,
          borderColor: hasAny ? 'primary.main' : 'divider',
          borderRadius: 2,
          bgcolor: 'background.paper',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
          '&:hover': { borderColor: 'primary.main' },
        }}
      >
        <Box
          sx={{
            width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
            bgcolor: hasAny ? 'primary.main' : 'action.disabled',
          }}
        />
        <Typography variant="caption" sx={{ fontWeight: 500, color: hasAny ? 'text.primary' : 'text.secondary', lineHeight: 1 }}>
          {label}
        </Typography>
        {micOnly && (
          <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 400, lineHeight: 1 }}>
            · lower accuracy
          </Typography>
        )}
        {state.activeMidiNotes.size > 0 && (
          <Box sx={{ display: 'flex', gap: '2px' }}>
            {Array.from(state.activeMidiNotes).slice(0, 4).map(n => (
              <Box
                key={n}
                component="span"
                sx={{
                  px: 0.5, borderRadius: 0.75, lineHeight: 1.5,
                  bgcolor: 'primary.50', color: 'primary.main',
                  fontSize: '0.6875rem', fontWeight: 500,
                }}
              >
                {midiToNoteName(n)}
              </Box>
            ))}
          </Box>
        )}
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--mui-palette-text-secondary)' }}>
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </Box>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              mt: 1, width: 300, borderRadius: 2.5,
              border: 1, borderColor: 'divider',
              boxShadow: '0 12px 28px rgba(0,0,0,0.1)',
            },
          },
        }}
      >
        <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {/* Keyboard section */}
          {connectedDevices.length > 0 ? connectedDevices.map(d => {
            const enabled = !state.disabledMidiDeviceIds.has(d.id);
            return (
              <Box key={d.id} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--mui-palette-text-secondary)' }}>piano</span>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>Keyboard</Typography>
                    <Typography variant="caption" sx={{ color: enabled ? 'primary.main' : 'text.secondary' }}>
                      {enabled ? 'Connected' : 'Disabled'}
                    </Typography>
                  </Box>
                  <Box
                    component="button"
                    onClick={() => toggleMidiDevice(d.id)}
                    sx={{
                      px: 1.25, py: 0.25, border: 1, borderRadius: 1.5,
                      borderColor: enabled ? 'primary.main' : 'divider',
                      bgcolor: enabled ? 'primary.main' : 'transparent',
                      color: enabled ? '#fff' : 'text.secondary',
                      fontSize: '0.7rem', fontWeight: 600, fontFamily: 'inherit',
                      cursor: 'pointer', transition: 'all 0.15s ease',
                      '&:hover': { borderColor: 'primary.main', opacity: 0.85 },
                    }}
                  >
                    {enabled ? 'On' : 'Off'}
                  </Box>
                </Box>
                <Typography variant="caption" sx={{ pl: '32px', color: 'text.secondary' }}>{d.name}</Typography>
              </Box>
            );
          }) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--mui-palette-text-secondary)' }}>piano</span>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>Keyboard</Typography>
                  <Typography variant="caption" color="text.secondary">Not detected</Typography>
                </Box>
              </Box>
              <Typography variant="caption" sx={{ pl: '32px', color: 'text.secondary', lineHeight: 1.4 }}>
                Connect a MIDI keyboard via USB. Your browser will ask for permission.
              </Typography>
            </Box>
          )}

          <Box sx={{ height: '1px', bgcolor: 'divider' }} />

          {/* Microphone section */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--mui-palette-text-secondary)' }}>
                {hasMic ? 'mic' : 'mic_off'}
              </span>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>Microphone</Typography>
                <Typography variant="caption" sx={{ color: hasMic ? 'primary.main' : 'text.secondary' }}>
                  {hasMic ? 'Listening' : 'Off'}
                </Typography>
              </Box>
              <Box
                component="button"
                onClick={toggleMicrophone}
                sx={{
                  px: 1.25, py: 0.25, border: 1, borderRadius: 1.5,
                  borderColor: hasMic ? 'primary.main' : 'divider',
                  bgcolor: hasMic ? 'primary.main' : 'transparent',
                  color: hasMic ? '#fff' : 'text.secondary',
                  fontSize: '0.7rem', fontWeight: 600, fontFamily: 'inherit',
                  cursor: 'pointer', transition: 'all 0.15s ease',
                  '&:hover': { borderColor: 'primary.main', opacity: 0.85 },
                }}
              >
                {hasMic ? 'On' : 'Off'}
              </Box>
            </Box>
            {!hasMic && (
              <Typography variant="caption" sx={{ pl: '32px', color: 'text.secondary', lineHeight: 1.4 }}>
                Use your microphone for acoustic pianos or when MIDI is unavailable.
              </Typography>
            )}
            {hasMic && (
              <Typography variant="caption" sx={{ pl: '32px', color: 'text.disabled', lineHeight: 1.4 }}>
                Accuracy may vary — connect a keyboard for the best experience.
              </Typography>
            )}
          </Box>
        </Box>
      </Popover>
    </>
  );
}
