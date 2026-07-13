import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';

import SkipToMain from '../shared/components/SkipToMain';
import { PalettegenBleedCanvas } from './components/PalettegenBleedCanvas';
import { PalettegenThumbnailStrip } from './components/PalettegenThumbnailStrip';
import { PalettegenToolbar } from './components/PalettegenToolbar';
import { usePalettegenGallery } from './hooks/usePalettegenGallery';
import { usePalettegenUrlState } from './hooks/usePalettegenUrlState';

function imageFilesFromDataTransfer(files: FileList): File[] {
  return [...files].filter((file) => file.type.startsWith('image/'));
}

function shouldHandlePaletteShortcut(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return true;
  if (target.closest('input[type="text"], textarea, select, [contenteditable="true"]')) return false;
  if (target.closest('.MuiToggleButtonGroup-root, .MuiMenu-root, .MuiPopover-root, .palettegen-style-panel, .palettegen-lightbox')) {
    return false;
  }
  if (target.closest('[role="slider"]')) return false;
  return true;
}

export default function App(): ReactElement {
  const gallery = usePalettegenGallery();
  const { regenerate, undoRegenerate, status: galleryStatus, generateFromImages, navigateEntry } = gallery;
  const [status, setStatus] = useState(galleryStatus);
  const [dropActive, setDropActive] = useState(false);
  const dragDepthRef = useRef(0);
  const mainRef = useRef<HTMLElement>(null);

  usePalettegenUrlState(gallery);

  useEffect(() => {
    setStatus(galleryStatus);
  }, [galleryStatus]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!shouldHandlePaletteShortcut(event.target)) return;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
        event.preventDefault();
        undoRegenerate();
        return;
      }

      if (event.code === 'Space' || event.key === ' ') {
        event.preventDefault();
        regenerate();
        return;
      }

      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        navigateEntry(-1);
        return;
      }

      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        navigateEntry(1);
      }
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [navigateEntry, regenerate, undoRegenerate]);

  const handleDropFiles = useCallback(
    (files: File[]) => {
      if (files.length > 0) void generateFromImages(files);
    },
    [generateFromImages],
  );

  useEffect(() => {
    const onDragEnter = (event: DragEvent): void => {
      if (!event.dataTransfer?.types.includes('Files')) return;
      event.preventDefault();
      dragDepthRef.current += 1;
      setDropActive(true);
    };
    const onDragLeave = (event: DragEvent): void => {
      event.preventDefault();
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) setDropActive(false);
    };
    const onDragOver = (event: DragEvent): void => {
      if (!event.dataTransfer?.types.includes('Files')) return;
      event.preventDefault();
    };
    const onDrop = (event: DragEvent): void => {
      event.preventDefault();
      dragDepthRef.current = 0;
      setDropActive(false);
      if (event.dataTransfer?.files) {
        handleDropFiles(imageFilesFromDataTransfer(event.dataTransfer.files));
      }
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, [handleDropFiles]);

  return (
    <div
      className={['palettegen-app', dropActive ? 'palettegen-app--drop-active' : ''].filter(Boolean).join(' ')}
      data-testid="palettegen-app"
    >
      <SkipToMain />
      <PalettegenToolbar gallery={gallery} onCopied={setStatus} />

      <main
        ref={mainRef}
        id="main"
        className="palettegen-stage"
        tabIndex={-1}
        data-testid="palettegen-drop-layer"
        onPointerDown={(event) => {
          const target = event.target;
          if (!(target instanceof HTMLElement)) return;
          if (target.closest('input, textarea, button, a, [role="slider"]')) return;
          mainRef.current?.focus({ preventScroll: true });
        }}
      >
        <PalettegenBleedCanvas
          entry={gallery.activeEntry}
          onCopied={setStatus}
          onUseAsSeed={gallery.useColorAsSeed}
        />
        <PalettegenThumbnailStrip
          entries={gallery.entries}
          activeId={gallery.activeId}
          onSelect={gallery.selectEntry}
          onNavigate={gallery.navigateEntry}
        />
      </main>

      {dropActive ? (
        <div className="palettegen-drop-overlay" aria-hidden>
          Drop images to sample colors
        </div>
      ) : null}

      <p className="palettegen-sr-status" role="status">
        {status}
      </p>
    </div>
  );
}
