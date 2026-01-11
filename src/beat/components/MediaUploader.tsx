import React, { useCallback, useState, useRef, useEffect } from 'react';

export type MediaType = 'audio' | 'video';

export interface MediaFile {
  file: File;
  type: MediaType;
  url: string;
}

interface MediaUploaderProps {
  onFileSelect: (media: MediaFile) => void;
}

/**
 * Get media type from URL based on extension
 */
function getMediaTypeFromUrl(url: string): MediaType | null {
  const urlLower = url.toLowerCase();
  if (urlLower.includes('.mp3') || urlLower.includes('.wav') || urlLower.includes('.ogg') || 
      urlLower.includes('.flac') || urlLower.includes('.aac') || urlLower.includes('.m4a')) {
    return 'audio';
  }
  if (urlLower.includes('.mp4') || urlLower.includes('.webm') || urlLower.includes('.mov') || 
      urlLower.includes('.m4v') || urlLower.includes('.ogv')) {
    return 'video';
  }
  // Default to video for unknown URLs (many video hosts don't have extensions in URL)
  return 'video';
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
  const [urlInput, setUrlInput] = useState('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [hasAutoLoaded, setHasAutoLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isValidHttpUrl = (value: string) => {
    try {
      const u = new URL(value);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // Handle loading media from URL
  const handleUrlLoad = useCallback(async (overrideUrl?: string) => {
    const urlToLoad = (overrideUrl ?? urlInput).trim();
    if (!urlToLoad) {
      setError('Please enter a URL');
      return;
    }
    if (!isValidHttpUrl(urlToLoad)) {
      setError('Please enter a valid http/https URL');
      return;
    }

    setError(null);
    setIsLoadingUrl(true);

    try {
      const response = await fetch(urlToLoad);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const mediaType = getMediaTypeFromUrl(urlToLoad) || 'video';
      
      // Create a File from the blob
      const fileName = urlToLoad.split('/').pop() || `media.${mediaType === 'video' ? 'mp4' : 'mp3'}`;
      const file = new File([blob], fileName, { type: blob.type || (mediaType === 'video' ? 'video/mp4' : 'audio/mpeg') });
      
      // Create object URL
      const url = URL.createObjectURL(blob);
      
      
      onFileSelect({ file, type: mediaType, url });
    } catch (err) {
      console.error('[MediaUploader] URL load failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to load media from URL');
    } finally {
      setIsLoadingUrl(false);
    }
  }, [urlInput, onFileSelect]);

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

  // Allow automation: ?autoUrl=<http/https URL> in querystring
  useEffect(() => {
    if (hasAutoLoaded) return;
    const params = new URLSearchParams(window.location.search);
    const autoUrl = params.get('autoUrl');
    if (autoUrl && isValidHttpUrl(autoUrl)) {
      setHasAutoLoaded(true);
      setUrlInput(autoUrl);
      handleUrlLoad(autoUrl);
    }
  }, [handleUrlLoad, hasAutoLoaded]);

  // Allow automation: window.dispatchEvent(new CustomEvent('load-media-url', { detail: { url } }))
  useEffect(() => {
    const listener = (event: Event) => {
      const custom = event as CustomEvent<{ url?: string }>;
      const incomingUrl = custom.detail?.url;
      if (!incomingUrl || !isValidHttpUrl(incomingUrl)) return;
      setUrlInput(incomingUrl);
      handleUrlLoad(incomingUrl);
    };
    window.addEventListener('load-media-url', listener as EventListener);
    return () => window.removeEventListener('load-media-url', listener as EventListener);
  }, [handleUrlLoad]);

  return (
    <div className="media-uploader">
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

      <div className="url-separator">
        <span>or load from URL</span>
      </div>

      <div className="url-input-row">
        <input
          type="text"
          className="url-input"
          placeholder="https://example.com/video.webm"
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              handleUrlLoad();
            }
          }}
          disabled={isLoadingUrl}
        />
        <button
          className="url-load-btn"
          onClick={handleUrlLoad}
          disabled={isLoadingUrl || !urlInput.trim()}
        >
          {isLoadingUrl ? (
            <span className="analyzing-spinner small" />
          ) : (
            <span className="material-symbols-outlined">download</span>
          )}
        </button>
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
