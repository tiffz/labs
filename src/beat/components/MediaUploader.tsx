import React, { useCallback, useState, useRef } from 'react';

export type MediaType = 'audio' | 'video';

export interface MediaFile {
  file: File;
  type: MediaType;
  url: string;
}

interface MediaUploaderProps {
  onFileSelect: (media: MediaFile) => void;
}

const ACCEPTED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/ogg',
  'audio/flac',
  'audio/aac',
  'audio/m4a',
  'audio/x-m4a',
];

const ACCEPTED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime', // .mov
  'video/x-m4v',
];

const ACCEPTED_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a'];
const ACCEPTED_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.m4v', '.ogv'];
const ALL_EXTENSIONS = [...ACCEPTED_AUDIO_EXTENSIONS, ...ACCEPTED_VIDEO_EXTENSIONS];

function getMediaType(file: File): MediaType | null {
  // Check by MIME type first
  if (ACCEPTED_AUDIO_TYPES.includes(file.type)) {
    return 'audio';
  }
  if (ACCEPTED_VIDEO_TYPES.includes(file.type)) {
    return 'video';
  }

  // Fallback: check by extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (ACCEPTED_AUDIO_EXTENSIONS.includes(extension)) {
    return 'audio';
  }
  if (ACCEPTED_VIDEO_EXTENSIONS.includes(extension)) {
    return 'video';
  }

  return null;
}

const MediaUploader: React.FC<MediaUploaderProps> = ({ onFileSelect }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);

      const mediaType = getMediaType(file);
      if (!mediaType) {
        setError('Please upload a valid audio or video file');
        return;
      }

      // Check file size (max 500MB for video, 100MB for audio)
      const maxSize = mediaType === 'video' ? 500 * 1024 * 1024 : 100 * 1024 * 1024;
      if (file.size > maxSize) {
        setError(`File is too large. Maximum size is ${mediaType === 'video' ? '500MB' : '100MB'}.`);
        return;
      }

      // Create object URL for playback
      const url = URL.createObjectURL(file);

      onFileSelect({ file, type: mediaType, url });
    },
    [onFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
      // Reset input so the same file can be selected again
      e.target.value = '';
    },
    [handleFile]
  );

  return (
    <div>
      <div
        className={`upload-area ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleClick();
          }
        }}
      >
        <span className="material-symbols-outlined">upload_file</span>
        <p>Drop an audio or video file here</p>
        <p className="file-types">
          Audio: MP3, WAV, OGG, FLAC • Video: MP4, WebM, MOV
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ALL_EXTENSIONS.join(',')}
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />

      {error && (
        <p style={{ color: 'var(--error-color)', marginTop: '0.5rem', textAlign: 'center' }}>
          {error}
        </p>
      )}
    </div>
  );
};

export default MediaUploader;
