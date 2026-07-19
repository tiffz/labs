import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useCallback, useRef, useState, type KeyboardEvent, type ReactElement } from 'react';

/**
 * Opt-in display-name view/edit block for account menus with guest-facing identity
 * (Encore is the first consumer — the name shows on shared snapshots).
 *
 * Render through {@link LabsAccountMenu}'s `identitySlot`. Editing state resets when the
 * menu closes because the menu unmounts its content (`keepMounted={false}`).
 */
export function LabsAccountDisplayNameSection(props: {
  /** Current effective name (custom override, falling back to the provider name). */
  effectiveName: string | null;
  /** Provider-supplied fallback (e.g. Google profile name) — placeholder + "leave blank" hint. */
  providerName?: string | null;
  /** Persist the name; empty string clears the override back to the provider name. */
  onSave: (name: string) => Promise<void>;
  /** Where the name shows up, e.g. "Used in the app header and on shared snapshots." */
  usageHint: string;
}): ReactElement {
  const { effectiveName, providerName, onSave, usageHint } = props;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const startEdit = useCallback(() => {
    setDraft(effectiveName ?? '');
    setEditing(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [effectiveName]);

  const commit = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }, [draft, saving, onSave]);

  const cancel = useCallback(() => setEditing(false), []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        void commit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
      }
    },
    [commit, cancel],
  );

  if (editing) {
    return (
      <TextField
        size="small"
        fullWidth
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        inputRef={(el: HTMLInputElement | null) => {
          inputRef.current = el;
        }}
        placeholder={providerName ?? 'Your name'}
        disabled={saving}
        label="Display name"
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton size="small" aria-label="Save display name" onClick={() => void commit()} disabled={saving}>
                <CheckIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" aria-label="Cancel" onClick={cancel} disabled={saving}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        }}
        helperText={
          providerName && draft.trim() !== providerName
            ? `Leave blank to use “${providerName}” from Google.`
            : usageHint
        }
      />
    );
  }

  return (
    <Stack direction="row" alignItems="center" spacing={1.5}>
      <AccountCircleIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', lineHeight: 1.4, fontWeight: 600, letterSpacing: '0.06em', mb: 0.5 }}
        >
          Display name
        </Typography>
        <Typography
          variant="h6"
          component="p"
          noWrap
          sx={{
            fontWeight: 700,
            color: effectiveName ? 'text.primary' : 'text.secondary',
            lineHeight: 1.35,
            letterSpacing: '-0.02em',
            m: 0,
          }}
        >
          {effectiveName ?? 'Not set'}
        </Typography>
      </Box>
      <Tooltip title="Edit display name">
        <IconButton size="small" aria-label="Edit display name" onClick={startEdit}>
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
