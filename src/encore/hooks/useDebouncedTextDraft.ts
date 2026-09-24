import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/** Matches the delay the library filter used before drafts moved down the tree. */
export const ENCORE_TEXT_DRAFT_DEBOUNCE_MS = 220;

export interface DebouncedTextDraft {
  draft: string;
  setDraft: (next: string) => void;
  /** Publish any pending text immediately. Call from `onBlur`. */
  flush: () => void;
  /** Spread onto the input. Focus tracking is what keeps the caret still — see below. */
  focusProps: { onFocus: () => void; onBlur: () => void };
}

export interface DebouncedTextDraftOptions {
  delayMs?: number;
  /**
   * Publish pending text when the component unmounts.
   *
   * `true` for anything the user considers *their data* — a song title typed and then navigated
   * away from within the debounce window is lost otherwise, and there is no other copy of it.
   * `false` only for ephemeral UI state such as a search box, where the last keystrokes carry
   * nothing worth persisting and republishing on the way out can resurrect a filter the user
   * just left.
   */
  flushOnUnmount?: boolean;
}

/**
 * Let a text input own its own text, and publish upward only on a debounce.
 *
 * A `value={record.field}` input that writes straight through on every `onChange` re-renders
 * everything subscribed to that record, once per character. Measured on the Originals song title
 * at a realistic library size: **29 long tasks and 2,144ms of blocked main thread** for 26
 * characters — more than one freeze per keystroke — plus one Dexie write each, because the
 * autosave chain is driven by the same state.
 *
 * Keeping the raw value here means the parent re-renders once the typing settles instead of once
 * per key.
 *
 * The `external` resync exists because the value can also change from outside — undo, loading a
 * different song, restoring a snapshot. Comparing against what we last published (rather than
 * against the draft) distinguishes "the parent told us something new" from "the parent is echoing
 * us back".
 */
export function useDebouncedTextDraft(
  external: string,
  publish: (next: string) => void,
  options: DebouncedTextDraftOptions = {},
): DebouncedTextDraft {
  const { delayMs = ENCORE_TEXT_DRAFT_DEBOUNCE_MS, flushOnUnmount = true } = options;

  const [draft, setDraftState] = useState(external);
  /** True between focus and blur. While true the user owns the value, not the parent. */
  const focusedRef = useRef(false);
  const publishedRef = useRef(external);
  const pendingRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mirrored into refs from effects, never during render: writing a ref while rendering is a
  // React Compiler correctness violation (`react-hooks/refs`). Effects flush before any timer or
  // event handler can read these, so the mirrors are never stale where it matters.
  const publishRef = useRef(publish);
  const flushOnUnmountRef = useRef(flushOnUnmount);

  useEffect(() => {
    publishRef.current = publish;
  }, [publish]);

  useEffect(() => {
    flushOnUnmountRef.current = flushOnUnmount;
  }, [flushOnUnmount]);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending === null || pending === publishedRef.current) return;
    publishedRef.current = pending;
    publishRef.current(pending);
  }, []);

  /*
   * Accept a value pushed from outside — but NEVER while the field has focus.
   *
   * Rewriting a focused input's `value` resets the caret to the end, and on macOS it also hands the
   * text-substitution engine a value it did not expect, which is how a stray "." appears after a
   * double space. Reported as "my editing cursor jumps around unexpectedly".
   *
   * While focused, the user is the source of truth. Anything the parent has to say can wait for
   * blur, at which point `flush` has already published what was typed.
   */
  useEffect(() => {
    if (focusedRef.current) return;
    if (external !== publishedRef.current) {
      publishedRef.current = external;
      pendingRef.current = null;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setDraftState(external);
    }
  }, [external]);

  // `flush` is stable (`useCallback` with no deps), so this cleanup runs only on real unmount.
  useEffect(
    () => () => {
      if (flushOnUnmountRef.current) flush();
      else if (timerRef.current) clearTimeout(timerRef.current);
    },
    [flush],
  );

  const setDraft = useCallback(
    (next: string) => {
      setDraftState(next);
      pendingRef.current = next;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        flush();
      }, delayMs);
    },
    [delayMs, flush],
  );

  const focusProps = useMemo(
    () => ({
      onFocus: () => {
        focusedRef.current = true;
      },
      onBlur: () => {
        focusedRef.current = false;
        flush();
      },
    }),
    [flush],
  );

  return { draft, setDraft, flush, focusProps };
}
