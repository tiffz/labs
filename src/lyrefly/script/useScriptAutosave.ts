import { useCallback, useEffect, useRef, useState } from 'react';

import { useLabsUndo } from '../../shared/undo/LabsUndoContext';
import type { ScriptDocument } from '../types';
import { saveScriptDocument } from './useScriptDocument';

const AUTOSAVE_MS = 600;

export interface ScriptAutosaveState {
  /** Uncommitted editor value (updates immediately as the user types). */
  localHtml: string;
  saving: boolean;
  /** Call on every editor change — debounces the save and records undo on commit. */
  handleChange: (html: string) => void;
  /** Save immediately (skips the debounce) — for discrete actions like inserting a sample. */
  persistNow: (html: string) => Promise<void>;
}

/**
 * Debounced save-to-Dexie + undo wiring for the comic script document, shared by the full
 * Script stage editor and any lighter in-stage script editors (e.g. Lyrefly Thumbs).
 */
export function useScriptAutosave(
  document: ScriptDocument,
  onDocumentSaved: (doc: ScriptDocument) => void,
): ScriptAutosaveState {
  const { push, clear } = useLabsUndo();
  const [localHtml, setLocalHtml] = useState(document.markdown);
  const [committedHtml, setCommittedHtml] = useState(document.markdown);
  const [saving, setSaving] = useState(false);
  const saveTimerRef = useRef<number | null>(null);
  const loadedDocumentIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (loadedDocumentIdRef.current === document.id) return;
    loadedDocumentIdRef.current = document.id;
    setLocalHtml(document.markdown);
    setCommittedHtml(document.markdown);
    clear();
  }, [document.id, document.markdown, clear]);

  const persistHtml = useCallback(
    async (html: string, recordUndo: boolean): Promise<void> => {
      const previous = committedHtml;
      setSaving(true);
      try {
        const saved = await saveScriptDocument({ ...document, markdown: html });
        setLocalHtml(html);
        setCommittedHtml(html);
        onDocumentSaved(saved);
        if (recordUndo) {
          push({
            undo: () => {
              void persistHtml(previous, false);
            },
            redo: () => {
              void persistHtml(html, false);
            },
          });
        }
      } finally {
        setSaving(false);
      }
    },
    [committedHtml, document, onDocumentSaved, push],
  );

  const scheduleSave = useCallback(
    (html: string) => {
      if (saveTimerRef.current != null) {
        window.clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = window.setTimeout(() => {
        if (html !== committedHtml) {
          void persistHtml(html, true);
        }
        saveTimerRef.current = null;
      }, AUTOSAVE_MS);
    },
    [committedHtml, persistHtml],
  );

  const handleChange = useCallback(
    (html: string) => {
      setLocalHtml(html);
      scheduleSave(html);
    },
    [scheduleSave],
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current != null) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const persistNow = useCallback((html: string) => persistHtml(html, true), [persistHtml]);

  return { localHtml, saving, handleChange, persistNow };
}
