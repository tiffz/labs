import React, { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { importScore, type ImportProgress, type ImportResult } from '../utils/importScore';
import type { PianoScore } from '../types';
import type { ParsedSections } from '../utils/parseMusicXml';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (score: PianoScore, sections?: ParsedSections[]) => void;
  initialFile?: File | null;
}

const ACCEPTED_EXTENSIONS = '.musicxml,.xml,.mxl,.mid,.midi,.mscz,.mscx';

export default function ImportModal({ open, onClose, onImport, initialFile }: ImportModalProps) {
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    setError(null);
    setPreview(null);
    try {
      const result = await importScore(file, setProgress);
      setPreview(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setProgress(null);
    }
  }, []);

  React.useEffect(() => {
    if (open && initialFile) {
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

  const handleConfirm = useCallback(() => {
    if (preview) {
      onImport(preview.score, preview.sections);
      onClose();
      setPreview(null);
      setProgress(null);
    }
  }, [preview, onImport, onClose]);

  const handleClose = useCallback(() => {
    onClose();
    setPreview(null);
    setProgress(null);
    setError(null);
    setDragOver(false);
  }, [onClose]);

  if (!open) return null;

  const previewScore = preview?.score;
  const measureCount = previewScore
    ? Math.max(...previewScore.parts.map(p => p.measures.length))
    : 0;
  const partCount = previewScore?.parts.filter(p => p.measures.some(m => m.notes.length > 0)).length ?? 0;

  return createPortal(
    <div className="import-modal-overlay" onClick={handleClose}>
      <div className="import-modal" onClick={e => e.stopPropagation()}>
        <div className="import-modal-header">
          <h2>Import Music File</h2>
          <button className="import-modal-close" onClick={handleClose} title="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="import-modal-body">
          {!preview && !progress?.stage && (
            <div
              className={`import-drop-zone ${dragOver ? 'drag-over' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="material-symbols-outlined import-drop-icon">upload_file</span>
              <p className="import-drop-text">
                Drag & drop a music file here, or click to browse
              </p>
              <p className="import-drop-formats">
                MusicXML, MIDI, MuseScore (.musicxml, .xml, .mxl, .mid, .midi, .mscz)
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
            </div>
          )}
        </div>

        <div className="import-modal-footer">
          <button className="import-cancel-btn" onClick={handleClose}>Cancel</button>
          <button className="import-load-btn" onClick={handleConfirm} disabled={!preview}>
            Load Score
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
