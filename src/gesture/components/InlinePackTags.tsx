import { useCallback, useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react';
import type React from 'react';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import AppTooltip from '../../shared/components/AppTooltip';
import {
  collectGestureTagAutocompleteOptions,
  GESTURE_NSFW_TAG_TOOLTIP,
  isGestureNsfwTag,
  normalizeGestureTags,
} from '../drive/gesturePackTags';
import { registerGestureLocalTags } from '../drive/gestureTagRegistry';
import { useLabsUndo } from '../../shared/undo/LabsUndoContext';
import { updatePackMetadataUndoable } from '../undo/gestureUndoableMutations';
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
  const { push } = useLabsUndo();
  const serverTags = useMemo(() => normalizeGestureTags(pack.tags ?? []), [pack.tags]);
  const [localTags, setLocalTags] = useState(serverTags);
  const [inputValue, setInputValue] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPersistRef = useRef<string[] | null>(null);
  const commitLockRef = useRef(false);

  const tagOptions = useMemo(
    () => collectGestureTagAutocompleteOptions(allTags, localTags),
    [allTags, localTags],
  );

  useEffect(() => {
    if (pendingPersistRef.current !== null) return;
    if (persistTimerRef.current !== null) return;
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
        const { updated, commit } = await updatePackMetadataUndoable(null, pack.id, {
          tags: nextTags,
        });
        if (commit) push(commit);
        onUpdated?.(updated);
      } catch (e) {
        setLocalTags(serverTags);
        onError?.(e instanceof Error ? e.message : 'Could not update tags.');
      }
    },
    [onError, onUpdated, pack.id, push, serverTags],
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
      {localTags.map((tag) => {
        const chip = (
          <span
            key={tag}
            className={`gesture-pack-tag-chip${isGestureNsfwTag(tag) ? ' gesture-pack-tag-chip--nsfw' : ''}`}
          >
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
        );
        return isGestureNsfwTag(tag) ? (
          <AppTooltip key={tag} title={GESTURE_NSFW_TAG_TOOLTIP} placement="top">
            {chip}
          </AppTooltip>
        ) : (
          chip
        );
      })}

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
            // Ignore empty clears after select; blocking all "reset" breaks the first keystroke in freeSolo.
            if (reason === 'reset' && nextValue === '') return;
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
            const nsfwOption = isGestureNsfwTag(option);
            return (
              <li
                key={key ?? option}
                {...optionProps}
                title={nsfwOption ? GESTURE_NSFW_TAG_TOOLTIP : undefined}
                className={`gesture-pack-tags-option${nsfwOption ? ' gesture-pack-tags-option--nsfw' : ''}${optionProps.className ? ` ${optionProps.className}` : ''}`}
              >
                <span className="gesture-pack-tags-option-label">
                  {highlightGestureTagMatch(option, inputValue)}
                </span>
              </li>
            );
          }}
          renderInput={(params) => {
            const { onKeyDown: autocompleteKeyDown, ...inputProps } = params.inputProps;
            return (
              <TextField
                {...params}
                variant="standard"
                hiddenLabel
                placeholder="Add tag"
                className="gesture-pack-tags-inline-input"
                inputProps={{
                  ...inputProps,
                  'aria-label': 'Add collection tag',
                  onKeyDown: (event) => {
                    autocompleteKeyDown?.(event as React.KeyboardEvent<HTMLInputElement>);
                    if (event.key === 'Enter' && inputValue.trim()) {
                      event.preventDefault();
                      commitLockRef.current = true;
                      addTag(inputValue);
                      stopAdding();
                    } else if (event.key === 'Escape') {
                      stopAdding();
                    }
                  },
                }}
              />
            );
          }}
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
