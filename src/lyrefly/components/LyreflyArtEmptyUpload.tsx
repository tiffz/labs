import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import { useCallback, useEffect, useRef, type ChangeEvent, type ReactElement } from 'react';

import { useDragDropHighlight } from '../../shared/hooks/useDragDropHighlight';
import { collectImageFilesFromDataTransfer } from '../utils/conceptShelfFileIntake';
import { filterImageFilesForPageUpload } from '../utils/artPageUploadUtils';
import { PAGE_IMAGE_ACCEPT } from './ArtPageGrid';

export type LyreflyArtEmptyUploadProps = {
  disabled?: boolean;
  onFiles: (files: File[]) => void;
};

export function LyreflyArtEmptyUpload({ disabled = false, onFiles }: LyreflyArtEmptyUploadProps): ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);

  const deliverFiles = useCallback(
    (files: File[]) => {
      const images = filterImageFilesForPageUpload(files);
      if (images.length > 0) onFiles(images);
    },
    [onFiles],
  );

  const { dragActive, handlers } = useDragDropHighlight({
    disabled,
    stopPropagation: true,
    onDrop: (event) => deliverFiles([...event.dataTransfer.files]),
  });

  useEffect(() => {
    if (disabled) return;

    const onPaste = (event: ClipboardEvent): void => {
      const target = event.target;
      if (target instanceof Element) {
        const formField = target.closest(
          'input:not([type="file"]), textarea, .ProseMirror, [contenteditable="true"]',
        );
        if (formField) return;
      }
      const clipboard = event.clipboardData;
      if (!clipboard) return;
      const images = collectImageFilesFromDataTransfer(clipboard);
      if (images.length === 0) return;
      event.preventDefault();
      deliverFiles(images);
    };

    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [deliverFiles, disabled]);

  const openPicker = (): void => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const files = event.target.files ? [...event.target.files] : [];
    event.target.value = '';
    deliverFiles(files);
  };

  return (
    <div className="lyrefly-art-empty-upload" data-testid="lyrefly-art-empty-upload">
      <button
        type="button"
        className={[
          'lyrefly-art-empty-upload__zone',
          dragActive ? 'lyrefly-art-empty-upload__zone--active' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        disabled={disabled}
        aria-label="Upload comic page images"
        onClick={openPicker}
        onDragEnter={handlers.onDragEnter}
        onDragOver={handlers.onDragOver}
        onDragLeave={handlers.onDragLeave}
        onDrop={handlers.onDrop}
      >
        <CloudUploadOutlinedIcon className="lyrefly-art-empty-upload__icon" aria-hidden />
        <span className="lyrefly-art-empty-upload__title">
          {dragActive ? 'Drop to upload' : 'Upload your page art'}
        </span>
        <span className="lyrefly-art-empty-upload__hint">
          Drop a folder, paste from clipboard, or click to pick files. Mixam-style names like Cover.png, page1.png, or
          Back.png sort automatically.
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={PAGE_IMAGE_ACCEPT}
        multiple
        hidden
        onChange={onInputChange}
      />
    </div>
  );
}
