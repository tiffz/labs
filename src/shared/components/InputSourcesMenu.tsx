import { useState, type MouseEvent, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Switch from '@mui/material/Switch';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import AnchoredPopover from './AnchoredPopover';

/**
 * Shared "input sources" menu used by the piano and scales apps. Renders a
 * chip-shaped trigger summarizing the current MIDI + microphone state, plus a
 * popover panel with rows for each source and (optionally) a microphone
 * device selector.
 *
 * All copy, layout, spacing, typography, and state-derived labels live in
 * this component so both apps stay visually in lockstep. Apps are expected
 * to pass *state only* (connected devices, toggle callbacks) — they should
 * not restate status text, hint text, or trigger labels.
 *
 * Visuals follow Material 3 tokens: 32dp pill trigger, 48dp rows, 36dp
 * circular icon badges, level-2 menu elevation, labelMedium/titleSmall/
 * bodySmall type scale.
 */

// ---- Copy lives here, not in consumers ------------------------------------

const COPY = {
  triggerKeyboardAndMic: 'Keyboard + Mic',
  triggerKeyboard: 'Keyboard',
  triggerMic: 'Mic',
  triggerNone: 'No input',

  sectionKeyboard: 'Keyboard',
  sectionMicrophone: 'Microphone',

  midiConnected: 'Connected',
  midiPaused: 'Paused',
  midiNotDetected: 'Not detected',
  midiEmptyName: 'MIDI keyboard',
  midiEmptyHintDefault: 'Plug a MIDI keyboard in via USB.',

  micName: 'Microphone',
  micListening: 'Listening',
  micOff: 'Off',
  micDeviceLabel: 'Device',
  micHintActive: 'Accuracy may vary. A MIDI keyboard gives the best results.',
  micHintInactive: 'Use your microphone for acoustic pianos or when MIDI is unavailable.',

  toggleMidiAria: (deviceName: string) => `Toggle ${deviceName}`,
  toggleMicAria: 'Toggle microphone',
} as const;

// ---- Material 3 type tokens -----------------------------------------------

const LABEL_MEDIUM = {
  fontSize: '0.75rem',
  fontWeight: 500,
  lineHeight: '1rem',
  letterSpacing: '0.03125rem',
} as const;
const TITLE_SMALL = {
  fontSize: '0.875rem',
  fontWeight: 500,
  lineHeight: '1.25rem',
  letterSpacing: '0.00625rem',
} as const;
const BODY_SMALL = {
  fontSize: '0.75rem',
  fontWeight: 400,
  lineHeight: '1rem',
  letterSpacing: '0.025rem',
} as const;

/**
 * How many note-chip slots we reserve on the trigger pill *while at least
 * one note is held*. Chosen to cover the common chord shapes (triads + one
 * tension) so chord changes don't reflow the pill once the user is playing.
 * Anything beyond this is truncated.
 *
 * Layout-shift policy: when MIDI **or** microphone input is active we
 * always reserve the trailing {@link MAX_NOTE_SLOTS} note-chip strip
 * (empty slots are transparent) so the header row does not jump on the
 * first detected note vs silence. Both paths feed the same
 * `activeMidiNotes` set in the apps. Chord changes stay shift-free within
 * the reserved strip.
 */
const MAX_NOTE_SLOTS = 4;

// ---- Public API -----------------------------------------------------------

/** A single MIDI device entry. Rows are rendered only for connected devices. */
export interface MidiDeviceEntry {
  id: string;
  name: string;
  /**
   * Whether this device is currently feeding input. Clicking the row switch
   * toggles this via `onToggle`.
   */
  enabled: boolean;
  onToggle: () => void;
}

export interface InputSourcesMenuProps {
  midi: {
    /**
     * One entry per *connected* device. Empty array ⇒ render the
     * "Not detected" placeholder with a hint.
     */
    devices: MidiDeviceEntry[];
    /**
     * Override the placeholder hint shown when `devices` is empty. Defaults
     * to "Plug a MIDI keyboard in via USB."
     */
    notDetectedHint?: string;
  };
  microphone: {
    active: boolean;
    onToggle: () => void;
    /**
     * Override the row title when active. Defaults to "Microphone".
     * Useful for surfacing the active device label (e.g. "MacBook mic").
     */
    activeLabel?: string | null;
    /** Available input devices. If >1 supplied, renders a device selector. */
    devices?: Array<{ id: string; name: string }>;
    selectedDeviceId?: string;
    onSelectDevice?: (id: string) => void;
  };
  /** Rendered as small primary-tinted badges on the trigger pill. */
  activeMidiNotes?: Iterable<number>;
  /** Map a MIDI note number to a display string (e.g. "C4"). */
  midiToNoteName?: (midi: number) => string;
}

// ---- Internals ------------------------------------------------------------

function MenuIcon({ name, size = 20 }: { name: string; size?: number }) {
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

interface SourceRowProps {
  name: string;
  statusText: string;
  active: boolean;
  iconName: string;
  checked?: boolean;
  onToggle?: (next: boolean) => void;
  toggleAriaLabel?: string;
  footer?: ReactNode;
  nameTruncate?: boolean;
}

function SourceRow({
  name,
  statusText,
  active,
  iconName,
  checked,
  onToggle,
  toggleAriaLabel,
  footer,
  nameTruncate,
}: SourceRowProps) {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, minHeight: 48 }}>
        <Box
          aria-hidden="true"
          sx={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            bgcolor: active
              ? theme => `${theme.palette.primary.main}14`
              : 'action.hover',
            color: active ? 'primary.main' : 'text.secondary',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <MenuIcon name={iconName} size={18} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              ...TITLE_SMALL,
              color: 'text.primary',
              ...(nameTruncate
                ? {
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }
                : {}),
            }}
          >
            {name}
          </Typography>
          <Typography
            sx={{
              ...BODY_SMALL,
              color: active ? 'primary.main' : 'text.secondary',
            }}
          >
            {statusText}
          </Typography>
        </Box>
        {onToggle && (
          <Switch
            checked={Boolean(checked)}
            onChange={(_, next) => onToggle(next)}
            inputProps={{ 'aria-label': toggleAriaLabel ?? `Toggle ${name}` }}
            size="small"
          />
        )}
      </Box>
      {footer}
    </Box>
  );
}

export default function InputSourcesMenu({
  midi,
  microphone,
  activeMidiNotes,
  midiToNoteName,
}: InputSourcesMenuProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const hasMidi = midi.devices.some(d => d.enabled);
  const hasMic = microphone.active;
  const hasAny = hasMidi || hasMic;

  const summaryLabel = hasMidi && hasMic
    ? COPY.triggerKeyboardAndMic
    : hasMidi
      ? COPY.triggerKeyboard
      : hasMic
        ? COPY.triggerMic
        : COPY.triggerNone;

  const notes = activeMidiNotes
    ? Array.from(activeMidiNotes).slice(0, MAX_NOTE_SLOTS)
    : [];

  const showMicDeviceSelect =
    Boolean(microphone.onSelectDevice) &&
    !!microphone.devices &&
    microphone.devices.length > 1;

  const micTitle =
    hasMic && microphone.activeLabel ? microphone.activeLabel : COPY.micName;
  const micHint = hasMic ? COPY.micHintActive : COPY.micHintInactive;

  return (
    <>
      <Box
        component="button"
        type="button"
        onClick={(e: MouseEvent<HTMLElement>) =>
          setAnchorEl(open ? null : e.currentTarget)
        }
        aria-label="Input sources"
        aria-expanded={open}
        aria-haspopup="dialog"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          height: 32,
          px: 3,
          border: 1,
          borderColor: hasAny ? 'primary.main' : 'divider',
          borderRadius: '999px',
          bgcolor: hasAny ? theme => `${theme.palette.primary.main}0D` : 'background.paper',
          cursor: 'pointer',
          transition: 'background-color 0.15s ease, border-color 0.15s ease',
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: theme => `${theme.palette.primary.main}14`,
          },
          '&:focus-visible': {
            outline: 2,
            outlineColor: 'primary.main',
            outlineOffset: 2,
          },
        }}
      >
        <Box
          aria-hidden="true"
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            flexShrink: 0,
            bgcolor: hasAny ? 'primary.main' : 'action.disabled',
          }}
        />
        {/*
         * Label sits at its natural width. Switching between
         * Mic/Keyboard/Both is a deliberate user toggle, so the one-shot
         * reflow reads fine; previously reserving width for the longest
         * label left a wide empty gap inside the idle pill.
         */}
        <Typography
          sx={{
            ...LABEL_MEDIUM,
            color: hasAny ? 'text.primary' : 'text.secondary',
          }}
        >
          {summaryLabel}
        </Typography>
        {/*
         * Trailing note-chip strip whenever keyboard and/or mic input is on
         * (see MAX_NOTE_SLOTS / layout-shift policy above).
         */}
        {(hasMidi || hasMic) && (
          <Box
            aria-hidden="true"
            sx={{ display: 'flex', gap: '2px', ml: 0.5, flexShrink: 0 }}
          >
            {Array.from({ length: MAX_NOTE_SLOTS }, (_, i) => {
              const n = notes[i];
              const present = n !== undefined;
              return (
                <Box
                  key={i}
                  component="span"
                  sx={{
                    minWidth: 22,
                    px: 1,
                    textAlign: 'center',
                    borderRadius: '4px',
                    bgcolor: present
                      ? theme => `${theme.palette.primary.main}1F`
                      : 'transparent',
                    color: present ? 'primary.main' : 'transparent',
                    fontSize: '0.6875rem',
                    fontWeight: 500,
                    letterSpacing: '0.03125rem',
                    lineHeight: '1rem',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {present ? (midiToNoteName ? midiToNoteName(n) : String(n)) : '\u00A0'}
                </Box>
              );
            })}
          </Box>
        )}
        <MenuIcon name={open ? 'expand_less' : 'expand_more'} size={18} />
      </Box>

      <AnchoredPopover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        placement="bottom-end"
        slotProps={{
          paper: {
            sx: {
              mt: 2,
              width: 320,
              borderRadius: '12px',
              border: 1,
              borderColor: 'divider',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 6px 20px rgba(0,0,0,0.08)',
              overflow: 'hidden',
            },
          },
        }}
      >
        <Box role="dialog" aria-label="Input sources" sx={{ py: 2 }}>
          {/* Keyboard section */}
          <Box sx={{ px: 4, pt: 1, pb: 2 }}>
            <Typography
              sx={{
                ...LABEL_MEDIUM,
                color: 'text.secondary',
                textTransform: 'uppercase',
                mb: 2,
              }}
            >
              {COPY.sectionKeyboard}
            </Typography>
            {midi.devices.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {midi.devices.map(d => (
                  <SourceRow
                    key={d.id}
                    name={d.name}
                    statusText={d.enabled ? COPY.midiConnected : COPY.midiPaused}
                    active={d.enabled}
                    iconName="piano"
                    checked={d.enabled}
                    onToggle={() => d.onToggle()}
                    toggleAriaLabel={COPY.toggleMidiAria(d.name)}
                    nameTruncate
                  />
                ))}
              </Box>
            ) : (
              <SourceRow
                name={COPY.midiEmptyName}
                statusText={COPY.midiNotDetected}
                active={false}
                iconName="piano"
                footer={
                  <Typography sx={{ ...BODY_SMALL, color: 'text.disabled', mt: 1.5 }}>
                    {midi.notDetectedHint ?? COPY.midiEmptyHintDefault}
                  </Typography>
                }
              />
            )}
          </Box>

          <Box sx={{ height: '1px', bgcolor: 'divider', mx: 4 }} />

          {/* Microphone section */}
          <Box sx={{ px: 4, pt: 2, pb: 1 }}>
            <Typography
              sx={{
                ...LABEL_MEDIUM,
                color: 'text.secondary',
                textTransform: 'uppercase',
                mb: 2,
              }}
            >
              {COPY.sectionMicrophone}
            </Typography>
            <SourceRow
              name={micTitle}
              statusText={hasMic ? COPY.micListening : COPY.micOff}
              active={hasMic}
              iconName={hasMic ? 'mic' : 'mic_off'}
              checked={hasMic}
              onToggle={microphone.onToggle}
              toggleAriaLabel={COPY.toggleMicAria}
              footer={
                <>
                  {showMicDeviceSelect && microphone.onSelectDevice && microphone.devices && (
                    <Box sx={{ mt: 2.5, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Typography
                        component="label"
                        htmlFor="input-sources-mic-select"
                        sx={{ ...BODY_SMALL, color: 'text.secondary', flexShrink: 0 }}
                      >
                        {COPY.micDeviceLabel}
                      </Typography>
                      <Select
                        id="input-sources-mic-select"
                        value={microphone.selectedDeviceId ?? ''}
                        onChange={(e) =>
                          microphone.onSelectDevice?.(String(e.target.value))
                        }
                        size="small"
                        fullWidth
                        sx={{
                          flex: 1,
                          minWidth: 0,
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                          '& .MuiSelect-select': {
                            ...BODY_SMALL,
                            py: 1.5,
                            color: 'text.primary',
                          },
                        }}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              borderRadius: '12px',
                              mt: 1,
                              boxShadow:
                                '0 1px 2px rgba(0,0,0,0.04), 0 6px 20px rgba(0,0,0,0.08)',
                            },
                          },
                        }}
                      >
                        {microphone.devices.map(d => (
                          <MenuItem key={d.id} value={d.id} sx={BODY_SMALL}>
                            {d.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </Box>
                  )}
                  <Typography sx={{ ...BODY_SMALL, color: 'text.disabled', mt: 2 }}>
                    {micHint}
                  </Typography>
                </>
              }
            />
          </Box>
        </Box>
      </AnchoredPopover>
    </>
  );
}
