import React, { useState, useCallback, useRef } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import { importScore, type ImportProgress, type ImportResult } from '../utils/importScore';
import type { PianoScore } from '../types';
import type { ParsedSections } from '../utils/parseMusicXml';
import { getImportFileKind } from '../utils/importFileType';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (score: PianoScore, sections?: ParsedSections[], mediaFile?: { name: string; url: string; type: 'audio' | 'video' } | null) => void;
  onMediaFile?: (file: { name: string; url: string; type: 'audio' | 'video' }) => void;
  initialFile?: File | null;
}

const ACCEPTED_EXTENSIONS = '.musicxml,.xml,.mxl,.mid,.midi,.mscz,.mscx,.mp3,.mp4,.wav,.ogg,.webm,.m4a,.aac,.flac,.aiff';
export default function ImportModal({ open, onClose, onImport, onMediaFile, initialFile }: ImportModalProps) {
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [mediaFile, setMediaFile] = useState<{ name: string; url: string; type: 'audio' | 'video' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const processedInitialFileRef = useRef<File | null>(null);

  const processFile = useCallback(async (file: File) => {
    if (getImportFileKind(file) === 'media') {
      const url = URL.createObjectURL(file);
      const lowerName = file.name.toLowerCase();
      const isVideo = file.type.startsWith('video/') || lowerName.endsWith('.mp4') || lowerName.endsWith('.webm');
      if (preview) {
        setMediaFile({ name: file.name, url, type: isVideo ? 'video' : 'audio' });
      } else if (onMediaFile) {
        onMediaFile({ name: file.name, url, type: isVideo ? 'video' : 'audio' });
        onClose();
      }
      return;
    }
    setError(null);
    setPreview(null);
    try {
      const result = await importScore(file, setProgress);
      setPreview(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setProgress(null);
    }
  }, [preview, onMediaFile, onClose]);

  React.useEffect(() => {
    if (!open) {
      processedInitialFileRef.current = null;
      return;
    }
    if (initialFile && processedInitialFileRef.current !== initialFile) {
      processedInitialFileRef.current = initialFile;
      processFile(initialFile);
    }
  }, [open, initialFile, processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleMediaSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith('video/');
    setMediaFile({ name: file.name, url, type: isVideo ? 'video' : 'audio' });
  }, []);

  const handleConfirm = useCallback(() => {
    if (preview) {
      onImport(preview.score, preview.sections, mediaFile);
      onClose();
      setPreview(null);
      setProgress(null);
      setMediaFile(null);
    }
  }, [preview, onImport, onClose, mediaFile]);

  const handleClose = useCallback(() => {
    onClose();
    setPreview(null);
    setProgress(null);
    setError(null);
    setDragOver(false);
    if (mediaFile) URL.revokeObjectURL(mediaFile.url);
    setMediaFile(null);
  }, [onClose, mediaFile]);

  const previewScore = preview?.score;
  const measureCount = previewScore
    ? Math.max(...previewScore.parts.map(p => p.measures.length))
    : 0;
  const partCount = previewScore?.parts.filter(p => p.measures.some(m => m.notes.length > 0)).length ?? 0;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      classes={{ paper: 'import-modal' }}
    >
      <DialogTitle className="import-modal-header">
        <span className="import-modal-title">Import File</span>
        <IconButton className="import-modal-close" onClick={handleClose} title="Close" size="small">
            <span className="material-symbols-outlined">close</span>
        </IconButton>
      </DialogTitle>

      <DialogContent className="import-modal-body">
          {!preview && !progress?.stage && (
            <div
              className={`import-drop-zone ${dragOver ? 'drag-over' : ''}`}
              role="button"
              tabIndex={0}
              aria-label="Choose a score or media file to import"
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
            >
              <span className="material-symbols-outlined import-drop-icon">upload_file</span>
              <p className="import-drop-text">
                Drag & drop a file here, or click to browse
              </p>
              <p className="import-drop-formats">
                Sheet music: MusicXML, MIDI, MuseScore (.musicxml, .xml, .mxl, .mid, .midi, .mscz)
              </p>
              <p className="import-drop-formats" style={{ marginTop: 4 }}>
                Audio/Video: MP3, MP4, WAV, OGG, FLAC, AAC — syncs with playback
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS}
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>
          )}

          {progress && progress.stage !== 'done' && !error && !preview && (
            <div className="import-progress">
              <div className="import-spinner" />
              <p>{progress.message}</p>
            </div>
          )}

          {error && (
            <div className="import-error">
              <span className="material-symbols-outlined">error</span>
              <p>{error}</p>
              <button className="import-retry-btn" onClick={() => { setError(null); setProgress(null); }}>
                Try another file
              </button>
            </div>
          )}

          {previewScore && (
            <div className="import-preview">
              <h3>{previewScore.title}</h3>
              <div className="import-preview-details">
                <div className="import-detail">
                  <span className="import-detail-label">Key</span>
                  <span className="import-detail-value">{previewScore.key}</span>
                </div>
                <div className="import-detail">
                  <span className="import-detail-label">Time</span>
                  <span className="import-detail-value">{previewScore.timeSignature.numerator}/{previewScore.timeSignature.denominator}</span>
                </div>
                <div className="import-detail">
                  <span className="import-detail-label">Tempo</span>
                  <span className="import-detail-value">{previewScore.tempo} BPM</span>
                </div>
                <div className="import-detail">
                  <span className="import-detail-label">Measures</span>
                  <span className="import-detail-value">{measureCount}</span>
                </div>
                <div className="import-detail">
                  <span className="import-detail-label">Parts</span>
                  <span className="import-detail-value">{partCount}</span>
                </div>
              </div>

              <div className="import-media-section">
                <p className="import-media-label">
                  <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle' }}>videocam</span>
                  {' '}Optionally attach audio/video to sync with playback
                </p>
                {mediaFile ? (
                  <div className="import-media-info">
                    <span>{mediaFile.name}</span>
                    <button className="import-media-remove" onClick={() => { URL.revokeObjectURL(mediaFile.url); setMediaFile(null); }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
                    </button>
                  </div>
                ) : (
                  <button className="import-media-btn" onClick={() => mediaInputRef.current?.click()}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>upload</span>
                    Add Audio/Video
                  </button>
                )}
                <input ref={mediaInputRef} type="file" accept="audio/*,video/*" onChange={handleMediaSelect} style={{ display: 'none' }} />
              </div>
            </div>
          )}
      </DialogContent>

      <DialogActions className="import-modal-footer">
        <button className="import-cancel-btn" onClick={handleClose}>Cancel</button>
        <button className="import-load-btn" onClick={handleConfirm} disabled={!preview}>
          Load Score
        </button>
      </DialogActions>
    </Dialog>
  );
}
