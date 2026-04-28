import { type MouseEvent, type ReactElement, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import type { SelectChangeEvent } from '@mui/material/Select';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import AnchoredPopover from '../../shared/components/AnchoredPopover';
import type { MicrophoneDevice } from '../../shared/music/pitch/microphonePitchInput';

export type MicBarStatus =
  /** Stream not attached yet */
  | 'starting'
  /** Live analyse + optional record */
  | 'live'
  | 'denied'
  | 'error';

export interface MelodiaMicBarProps {
  status: MicBarStatus;
  /** Device label reported by WebAudio (`MediaStreamTrack.label`) when connected */
  activeInputLabel?: string | null;
  devices: MicrophoneDevice[];
  selectedDeviceId: string;
  onDeviceChange: (deviceId: string) => void;
  /** Live pitch forwarded to tracing / detectors */
  pitchTrackingEnabled: boolean;
  onPitchTrackingChange: (enabled: boolean) => void;
  /** After permission denial, retries opening the mic capture */
  onRetryCapture?: () => void;
}

function MenuIconGlyph({ glyph, size = 18 }: { glyph: string; size?: number }): ReactElement {
  return (
    <Box
      component="span"
      aria-hidden
      sx={{
        fontSize: `${size}px`,
        fontFamily: '"Material Symbols Outlined", "Material Icons", sans-serif',
        lineHeight: 1,
        fontFeatureSettings: '"liga"',
        display: 'inline-flex',
        alignItems: 'center',
      }}
    >
      {glyph}
    </Box>
  );
}

/** Single-line mic status + expandable settings (device, pitch trace) to save vertical space */
export default function MelodiaMicBar({
  status,
  activeInputLabel,
  devices,
  selectedDeviceId,
  onDeviceChange,
  pitchTrackingEnabled,
  onPitchTrackingChange,
  onRetryCapture,
}: MelodiaMicBarProps): ReactElement {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const isLive = status === 'live';
  const denied = status === 'denied';
  const fault = status === 'error';

  /** Avoid MUI warnings when enumerated device list excludes the persisted id until refresh */
  const resolvedDeviceValue =
    devices.length === 0
      ? selectedDeviceId
      : devices.some((d) => d.id === selectedDeviceId)
        ? selectedDeviceId
        : (devices[0]?.id ?? selectedDeviceId);

  let compactLabel: string;
  if (denied) compactLabel = 'Mic blocked — tap settings';
  else if (fault) compactLabel = 'Mic error — tap settings';
  else if (!isLive) compactLabel = 'Connecting…';
  else {
    compactLabel = activeInputLabel ? 'Mic · connected' : 'Mic · listening';
  }

  let statusSentence: string;
  if (denied) statusSentence = 'Microphone access blocked.';
  else if (fault) statusSentence = 'Microphone unavailable.';
  else if (!isLive) statusSentence = 'Connecting to microphone…';
  else statusSentence = activeInputLabel ?? 'Microphone connected';

  const panelOpen = Boolean(anchorEl);

  return (
    <Box className="melodia-mic-bar" sx={{ py: 0.25 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'nowrap' }}>
        <Box
          component="span"
          aria-hidden="true"
          sx={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            flexShrink: 0,
            bgcolor:
              isLive ? 'secondary.main'
              : denied || fault ? 'error.main'
              : 'rgba(28, 40, 64, 0.25)',
            boxShadow: isLive ? '0 0 0 3px rgba(233, 30, 140, 0.18)' : 'none',
          }}
        />

        <Button
          variant="outlined"
          size="small"
          color={denied || fault ? 'error' : 'secondary'}
          className="melodia-mic-open-button"
          id="melodia-mic-trigger"
          aria-expanded={panelOpen ? 'true' : undefined}
          aria-controls="melodia-mic-settings-panel"
          aria-haspopup="dialog"
          onClick={(e: MouseEvent<HTMLButtonElement>) => setAnchorEl(e.currentTarget)}
          sx={{
            flex: '0 1 auto',
            minHeight: 32,
            borderRadius: 999,
            px: 1.25,
            textTransform: 'none',
          }}
          endIcon={(
            <Box component="span" aria-hidden sx={{ fontSize: '0.8rem', lineHeight: 1, opacity: panelOpen ? 1 : 0.75 }}>
              ▼
            </Box>
          )}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, mr: 0.5 }}>
            {compactLabel}
          </Typography>
        </Button>
      </Stack>

      <AnchoredPopover
        placement="bottom-start"
        open={panelOpen}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        slotProps={{
          paper: {
            id: 'melodia-mic-settings-panel',
            sx: {
              mt: 0.5,
              px: 1.5,
              py: 1.25,
              maxWidth: 360,
              borderRadius: 2,
              border: '1px solid rgba(28, 40, 64, 0.14)',
              boxShadow: '0 12px 32px rgba(28, 40, 64, 0.12)',
            },
          },
        }}
      >
        <Stack spacing={1.25}>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
            {statusSentence}
          </Typography>

          {(denied || fault) && onRetryCapture !== undefined ? (
            <Button type="button" size="small" variant="contained" color="secondary" onClick={() => onRetryCapture?.()}>
              Try again
            </Button>
          ) : (
            <>
              <FormControlLabel
                sx={{ mr: 0 }}
                disabled={!isLive}
                control={
                  <Switch
                    size="small"
                    color="secondary"
                    checked={pitchTrackingEnabled}
                    disabled={!isLive}
                    onChange={(_e, checked: boolean) => onPitchTrackingChange(checked)}
                    inputProps={{ 'aria-label': 'Track sung pitch along the staff' }}
                  />
                }
                label={(
                  <Stack direction="row" spacing={0.5} alignItems="center" component="span">
                    <MenuIconGlyph glyph="graphic_eq" size={17} />
                    <Typography component="span" variant="body2">
                      Pitch trace on staff
                    </Typography>
                  </Stack>
                )}
              />

              {isLive && !pitchTrackingEnabled ? (
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35 }}>
                  Pitch sketch is paused — audio is still being recorded for review.
                </Typography>
              ) : null}

              {devices.length >= 1 && !denied && !fault ? (
                <FormControl variant="outlined" size="small" fullWidth disabled={!isLive}>
                  <InputLabel id="melodia-mic-device-label">Microphone device</InputLabel>
                  <Select
                    labelId="melodia-mic-device-label"
                    label="Microphone device"
                    id="melodia-mic-device"
                    value={resolvedDeviceValue}
                    disabled={!isLive}
                    onChange={(e: SelectChangeEvent<string>) => {
                      onDeviceChange(e.target.value);
                    }}
                  >
                    {devices.map((d) => (
                      <MenuItem key={d.id} value={d.id}>
                        {d.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : null}
            </>
          )}
        </Stack>
      </AnchoredPopover>
    </Box>
  );
}
