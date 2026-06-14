import { useCallback, useEffect, useRef, useState } from 'react';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import {
  ensureLabsGoogleAccessTokenForDrive,
  LabsGoogleInteractiveAuthRequiredError,
} from '../../shared/google/labsGoogleDriveAccess';
import { updatePackMetadata } from '../drive/updatePackMetadata';
import { isDefaultCollectionName } from '../drive/gesturePackMetadata';
import type { GesturePack } from '../types';

type InlinePackNameProps = {
  pack: GesturePack;
  onRenamed?: (pack: GesturePack) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
};

export default function InlinePackName({
  pack,
  onRenamed,
  onError,
  disabled,
}: InlinePackNameProps): React.ReactElement {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(pack.name);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(pack.name);
  }, [editing, pack.name]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = useCallback(async () => {
    const next = draft.trim();
    if (!next || next === pack.name) {
      setEditing(false);
      setDraft(pack.name);
      return;
    }
    setBusy(true);
    try {
      const token = await ensureLabsGoogleAccessTokenForDrive({ interactive: true });
      const updated = await updatePackMetadata(token, pack.id, { name: next });
      onRenamed?.(updated);
      setEditing(false);
    } catch (e) {
      if (e instanceof LabsGoogleInteractiveAuthRequiredError) {
        onError?.(e.message);
      } else {
        onError?.(e instanceof Error ? e.message : 'Could not rename collection.');
      }
      setDraft(pack.name);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }, [draft, onError, onRenamed, pack.id, pack.name]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="gesture-inline-name-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            void commit();
          }
          if (e.key === 'Escape') {
            setDraft(pack.name);
            setEditing(false);
          }
        }}
        disabled={busy || disabled}
        aria-label="Collection name"
      />
    );
  }

  const unnamed = isDefaultCollectionName(pack.name);

  return (
    <button
      type="button"
      className={`gesture-inline-name${unnamed ? ' is-unnamed' : ''}`}
      onClick={() => !disabled && setEditing(true)}
      disabled={disabled || busy}
      aria-label={unnamed ? 'Add collection name' : `Rename ${pack.name}`}
    >
      <span className="gesture-inline-name-label">{unnamed ? 'Add a name' : pack.name}</span>
      <EditOutlinedIcon className="gesture-inline-name-icon" fontSize="inherit" aria-hidden />
    </button>
  );
}
