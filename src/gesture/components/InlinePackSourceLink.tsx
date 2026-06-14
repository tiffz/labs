import { useCallback, useEffect, useRef, useState } from 'react';
import LinkIcon from '@mui/icons-material/Link';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  ensureLabsGoogleAccessTokenForDrive,
  LabsGoogleInteractiveAuthRequiredError,
} from '../../shared/google/labsGoogleDriveAccess';
import { displayPackSourceUrl, normalizePackSourceUrl } from '../drive/gesturePackSourceUrl';
import { updatePackMetadata } from '../drive/updatePackMetadata';
import type { GesturePack } from '../types';

type InlinePackSourceLinkProps = {
  pack: GesturePack;
  onUpdated?: (pack: GesturePack) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
};

export default function InlinePackSourceLink({
  pack,
  onUpdated,
  onError,
  disabled,
}: InlinePackSourceLinkProps): React.ReactElement {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(pack.sourceUrl ?? '');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(pack.sourceUrl ?? '');
  }, [editing, pack.sourceUrl]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = useCallback(async () => {
    const normalized = normalizePackSourceUrl(draft);
    if (draft.trim() && !normalized) {
      onError?.('Enter a valid web address (https://…).');
      return;
    }
    if ((pack.sourceUrl ?? '') === (normalized ?? '')) {
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      const token = await ensureLabsGoogleAccessTokenForDrive({ interactive: true });
      const updated = await updatePackMetadata(token, pack.id, { sourceUrl: normalized });
      onUpdated?.(updated);
      setEditing(false);
    } catch (e) {
      if (e instanceof LabsGoogleInteractiveAuthRequiredError) {
        onError?.(e.message);
      } else {
        onError?.(e instanceof Error ? e.message : 'Could not save source link.');
      }
      setDraft(pack.sourceUrl ?? '');
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }, [draft, onError, onUpdated, pack.id, pack.sourceUrl]);

  if (editing) {
    return (
      <div className="gesture-inline-source">
        <LinkIcon className="gesture-inline-source-icon" fontSize="inherit" aria-hidden />
        <input
          ref={inputRef}
          className="gesture-inline-source-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void commit()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void commit();
            }
            if (e.key === 'Escape') {
              setDraft(pack.sourceUrl ?? '');
              setEditing(false);
            }
          }}
          disabled={busy || disabled}
          placeholder="https://…"
          aria-label="Source link"
        />
      </div>
    );
  }

  if (pack.sourceUrl) {
    return (
      <div className="gesture-inline-source gesture-inline-source--linked">
        <a
          className="gesture-inline-source-anchor"
          href={pack.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <LinkIcon className="gesture-inline-source-icon" fontSize="inherit" aria-hidden />
          <span>{displayPackSourceUrl(pack.sourceUrl)}</span>
          <OpenInNewIcon className="gesture-inline-source-open" fontSize="inherit" aria-hidden />
        </a>
        <button
          type="button"
          className="gesture-inline-source-edit"
          onClick={() => !disabled && setEditing(true)}
          disabled={disabled || busy}
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="gesture-inline-source gesture-inline-source--empty"
      onClick={() => !disabled && setEditing(true)}
      disabled={disabled || busy}
    >
      <LinkIcon className="gesture-inline-source-icon" fontSize="inherit" aria-hidden />
      Add source link
    </button>
  );
}
