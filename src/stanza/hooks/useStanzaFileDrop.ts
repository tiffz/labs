import { useCallback, useEffect, useRef, useState } from 'react';
import { allAudioFilesFromDataTransfer } from '../db/stanzaLocalAudioImport';

/**
 * Window-level drag-and-drop bridge for Stanza audio files.
 *
 * Mirrors the Find the Beat global-drop pattern: the entire page is a drop target so users can
 * drop straight from Finder/Explorer onto the page, with no need to find the upload button.
 * This is the "one click" load path the user asked for — release the file and it's loaded.
 *
 * Notes / edge cases:
 * - We use a ref counter for `dragenter` / `dragleave` because both events fire when the mouse
 *   crosses any nested element boundary. Without the counter the overlay flickers.
 * - We only count a drag as "ours" when the payload exposes a `Files` type — text drags (e.g.
 *   selecting a YouTube URL in another tab) shouldn't dim the whole page.
 * - Non-audio files are silently ignored (no toast). A user dragging a stack of files that
 *   includes one MP3 and a stray document gets the MP3 loaded; everything else is dropped on
 *   the floor. Future: wire a richer error surface if this becomes a usability issue.
 * - Listeners use the **capture** phase so nested interactive surfaces (timeline, MUI controls)
 *   cannot swallow `dragover`/`drop` before the window sees OS file drags.
 */
export function useStanzaFileDrop(opts: {
  /** Called with every audio file from the drop (non-audio siblings filtered out). Async-safe. */
  onAudioFiles: (files: File[]) => void | Promise<void>;
  /** Disable the listener entirely (e.g. when a modal is up and shouldn't intercept drops). */
  disabled?: boolean;
}): { isDragging: boolean } {
  const { onAudioFiles, disabled = false } = opts;
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);
  // Stash the latest callback so the effect doesn't re-bind window listeners on every render.
  const onAudioFilesRef = useRef(onAudioFiles);
  onAudioFilesRef.current = onAudioFiles;

  const dragPayloadHasFiles = useCallback((dt: DataTransfer | null | undefined): boolean => {
    if (!dt) return false;
    const types = dt.types;
    if (!types) return false;
    // Both `string[]`-like and DOMStringList live here depending on the browser.
    for (let i = 0; i < types.length; i += 1) {
      if (types[i] === 'Files') return true;
    }
    return false;
  }, []);

  useEffect(() => {
    if (disabled || typeof window === 'undefined') return;

    const onDragEnter = (event: DragEvent) => {
      if (!dragPayloadHasFiles(event.dataTransfer)) return;
      event.preventDefault();
      dragDepth.current += 1;
      if (dragDepth.current === 1) setIsDragging(true);
    };

    const onDragOver = (event: DragEvent) => {
      if (!dragPayloadHasFiles(event.dataTransfer)) return;
      // Required so the browser allows the drop instead of opening the file in a new tab.
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    };

    const onDragLeave = (event: DragEvent) => {
      if (!dragPayloadHasFiles(event.dataTransfer)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setIsDragging(false);
    };

    const onDrop = (event: DragEvent) => {
      if (!dragPayloadHasFiles(event.dataTransfer)) return;
      event.preventDefault();
      dragDepth.current = 0;
      setIsDragging(false);
      const files = allAudioFilesFromDataTransfer(event.dataTransfer);
      if (files.length === 0) return;
      void onAudioFilesRef.current(files);
    };

    // Some browsers hold the drag state if the user releases outside the window; reset on focus.
    const onWindowBlur = () => {
      dragDepth.current = 0;
      setIsDragging(false);
    };

    // Capture phase so nested controls (timeline, MUI) never swallow `dragover`/`drop` defaults
    // before we can accept OS file drags anywhere on the Stanza surface.
    const capture = true;
    window.addEventListener('dragenter', onDragEnter, capture);
    window.addEventListener('dragover', onDragOver, capture);
    window.addEventListener('dragleave', onDragLeave, capture);
    window.addEventListener('drop', onDrop, capture);
    window.addEventListener('blur', onWindowBlur);
    return () => {
      window.removeEventListener('dragenter', onDragEnter, capture);
      window.removeEventListener('dragover', onDragOver, capture);
      window.removeEventListener('dragleave', onDragLeave, capture);
      window.removeEventListener('drop', onDrop, capture);
      window.removeEventListener('blur', onWindowBlur);
      dragDepth.current = 0;
    };
  }, [disabled, dragPayloadHasFiles]);

  return { isDragging };
}
