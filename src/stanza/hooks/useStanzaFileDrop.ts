import { useCallback, useEffect, useRef, useState } from 'react';
import { allAudioFilesFromDataTransfer } from '../db/stanzaLocalAudioImport';

/**
 * Window-level drag-and-drop bridge for Stanza local media files.
 *
 * Mirrors the Find the Beat global-drop pattern: the entire page is a drop target so users can
 * drop straight from Finder/Explorer onto the page, with no need to find the upload button.
 *
 * Notes / edge cases:
 * - We use a ref counter for `dragenter` / `dragleave` because both events fire when the mouse
 *   crosses nested element boundaries. `dragleave` only decrements when the pointer leaves the
 *   document so nested hops do not collapse the overlay early.
 * - During drag, `dataTransfer.types` lists `Files`; on `drop`, some browsers clear `types` while
 *   still populating `dataTransfer.files` — always trust `files` on drop.
 * - Listeners use the **capture** phase so nested interactive surfaces (timeline, MUI controls)
 *   cannot swallow `dragover`/`drop` before the window sees OS file drags.
 */
export function useStanzaFileDrop(opts: {
  /** Called with every practiceable file from the drop (non-media siblings filtered out). Async-safe. */
  onAudioFiles: (files: File[]) => void | Promise<void>;
  /** Disable the listener entirely (e.g. when a modal is up and shouldn't intercept drops). */
  disabled?: boolean;
}): { isDragging: boolean } {
  const { onAudioFiles, disabled = false } = opts;
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);
  const onAudioFilesRef = useRef(onAudioFiles);
  onAudioFilesRef.current = onAudioFiles;

  const dragPayloadHasFiles = useCallback((dt: DataTransfer | null | undefined): boolean => {
    if (!dt) return false;
    if (dt.files && dt.files.length > 0) return true;
    const types = dt.types;
    if (!types) return false;
    for (let i = 0; i < types.length; i += 1) {
      const t = types[i];
      if (t === 'Files' || t === 'application/x-moz-file') return true;
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
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    };

    const onDragLeave = (event: DragEvent) => {
      const related = event.relatedTarget as Node | null;
      if (related != null && document.documentElement.contains(related)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setIsDragging(false);
    };

    const onDrop = (event: DragEvent) => {
      const dt = event.dataTransfer;
      const files = allAudioFilesFromDataTransfer(dt);
      const hasFilePayload = files.length > 0 || dragPayloadHasFiles(dt);
      if (!hasFilePayload) return;
      event.preventDefault();
      event.stopPropagation();
      dragDepth.current = 0;
      setIsDragging(false);
      if (files.length === 0) return;
      void onAudioFilesRef.current(files);
    };

    const onWindowBlur = () => {
      dragDepth.current = 0;
      setIsDragging(false);
    };

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
