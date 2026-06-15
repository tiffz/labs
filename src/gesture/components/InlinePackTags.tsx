import { useCallback, useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react';
import type React from 'react';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import {
  ensureLabsGoogleAccessTokenForDrive,
  LabsGoogleInteractiveAuthRequiredError,
} from '../../shared/google/labsGoogleDriveAccess';
import { readGestureDriveAccessToken } from '../drive/readGestureDriveAccessToken';
import { normalizeGestureTags } from '../drive/gesturePackTags';
import { registerGestureLocalTags } from '../drive/gestureTagRegistry';
import { updatePackMetadata } from '../drive/updatePackMetadata';
import type { GesturePack } from '../types';
import { highlightGestureTagMatch } from './highlightGestureTagMatch';

const filterTagOptions = createFilterOptions<string>({
  trim: true,
  matchFrom: 'start',
  ignoreCase: true,
  limit: 12,
});

const PERSIST_DEBOUNCE_MS = 350;

type InlinePackTagsProps = {
  pack: GesturePack;
  allTags: string[];
  onUpdated?: (pack: GesturePack) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
};

export default function InlinePackTags({
  pack,
  allTags,
  onUpdated,
  onError,
  disabled,
}: InlinePackTagsProps): React.ReactElement {
  const [adding, setAdding] = useState(false);
  const serverTags = useMemo(() => normalizeGestureTags(pack.tags ?? []), [pack.tags]);
  const [localTags, setLocalTags] = useState(serverTags);
  const [inputValue, setInputValue] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPersistRef = useRef<string[] | null>(null);
  const commitLockRef = useRef(false);

  const tagOptions = useMemo(() => {
    const chosen = new Set(localTags.map((tag) => tag.toLowerCase()));
    return allTags.filter((tag) => !chosen.has(tag.toLowerCase()));
  }, [allTags, localTags]);

  useEffect(() => {
    setLocalTags(serverTags);
  }, [pack.id, serverTags]);

  useEffect(() => {
    if (!adding) return;
    const input = rootRef.current?.querySelector<HTMLInputElement>(
      '.gesture-pack-tags-inline-field input',
    );
    input?.focus();
  }, [adding]);

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, []);

  const persistTags = useCallback(
    async (nextTags: string[]) => {
      try {
        let token = await readGestureDriveAccessToken();
        if (!token) {
          token = await ensureLabsGoogleAccessTokenForDrive({ interactive: true });
        }
        const updated = await updatePackMetadata(token, pack.id, { tags: nextTags });
        onUpdated?.(updated);
      } catch (e) {
        setLocalTags(serverTags);
        if (e instanceof LabsGoogleInteractiveAuthRequiredError) {
          onError?.(e.message);
        } else {
          onError?.(e instanceof Error ? e.message : 'Could not update tags.');
        }
      }
    },
    [onError, onUpdated, pack.id, serverTags],
  );

  const flushPersist = useCallback(() => {
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }
    const pending = pendingPersistRef.current;
    if (!pending) return;
    pendingPersistRef.current = null;
    void persistTags(pending);
  }, [persistTags]);

  const schedulePersist = useCallback(
    (nextTags: string[]) => {
      pendingPersistRef.current = nextTags;
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      persistTimerRef.current = setTimeout(() => {
        persistTimerRef.current = null;
        const snapshot = pendingPersistRef.current;
        if (!snapshot) return;
        pendingPersistRef.current = null;
        void persistTags(snapshot);
      }, PERSIST_DEBOUNCE_MS);
    },
    [persistTags],
  );

  const applyTags = useCallback(
    (nextTags: string[]) => {
      const normalized = normalizeGestureTags(nextTags);
      if (normalized.join('\0') === localTags.join('\0')) return;
      setLocalTags(normalized);
      registerGestureLocalTags(normalized);
      schedulePersist(normalized);
    },
    [localTags, schedulePersist],
  );

  const removeTag = useCallback(
    (tag: string) => {
      applyTags(localTags.filter((entry) => entry !== tag));
    },
    [applyTags, localTags],
  );

  const addTag = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      applyTags([...localTags, trimmed]);
    },
    [applyTags, localTags],
  );

  const startAdding = useCallback(() => {
    if (disabled) return;
    setAdding(true);
  }, [disabled]);

  const stopAdding = useCallback(() => {
    commitLockRef.current = false;
    setAdding(false);
    setInputValue('');
    flushPersist();
  }, [flushPersist]);

  const commitInput = useCallback(() => {
    if (commitLockRef.current) return;
    if (inputValue.trim()) addTag(inputValue);
    stopAdding();
  }, [addTag, inputValue, stopAdding]);

  return (
    <div ref={rootRef} className="gesture-inline-tags" aria-label="Collection tags">
      {localTags.map((tag) => (
        <span key={tag} className="gesture-pack-tag-chip">
          {tag}
          <button
            type="button"
            className="gesture-pack-tag-remove"
            aria-label={`Remove tag ${tag}`}
            onClick={() => removeTag(tag)}
            disabled={disabled}
          >
            ×
          </button>
        </span>
      ))}

      {adding ? (
        <Autocomplete
          freeSolo
          autoHighlight
          openOnFocus
          disableClearable
          size="small"
          className="gesture-pack-tags-inline-field"
          options={tagOptions}
          inputValue={inputValue}
          disabled={disabled}
          filterOptions={filterTagOptions}
          onInputChange={(_event, nextValue, reason) => {
            if (reason === 'reset') return;
            setInputValue(nextValue);
          }}
          onChange={(_event: SyntheticEvent, value: string | null) => {
            if (!value) return;
            commitLockRef.current = true;
            addTag(value);
            stopAdding();
          }}
          onClose={(_event, reason) => {
            if (reason === 'escape') stopAdding();
            if (reason === 'blur') commitInput();
          }}
          slotProps={{
            clearIndicator: { sx: { display: 'none' } },
            popupIndicator: { sx: { display: 'none' } },
            popper: {
              className: 'gesture-pack-tags-popper',
              placement: 'bottom-start',
            },
            paper: { className: 'gesture-pack-tags-menu', elevation: 0 },
            listbox: { className: 'gesture-pack-tags-listbox' },
          }}
          renderOption={(props, option) => {
            // MUI Autocomplete passes `key` on li props; omit before spread.
            // eslint-disable-next-line react/prop-types -- MUI li props include key
            const { key, ...optionProps } = props as React.HTMLAttributes<HTMLLIElement> & {
              key?: string;
            };
            return (
              <li
                key={key ?? option}
                {...optionProps}
                className={`gesture-pack-tags-option${optionProps.className ? ` ${optionProps.className}` : ''}`}
              >
                <span className="gesture-pack-tags-option-label">
                  {highlightGestureTagMatch(option, inputValue)}
                </span>
              </li>
            );
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              variant="standard"
              hiddenLabel
              placeholder="Add tag"
              className="gesture-pack-tags-inline-input"
              inputProps={{
                ...params.inputProps,
                'aria-label': 'Add collection tag',
              }}
            />
          )}
        />
      ) : (
        <button
          type="button"
          className="gesture-pack-tag-add"
          onClick={startAdding}
          disabled={disabled}
        >
          + Tag
        </button>
      )}
    </div>
  );
}
