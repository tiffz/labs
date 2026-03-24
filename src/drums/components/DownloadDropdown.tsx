import React, { useState, useEffect } from 'react';
import Popover from '@mui/material/Popover';
import type { ParsedRhythm } from '../types';
import type { PlaybackSettings } from '../types/settings';
import { renderRhythmAudio, exportAudioBuffer, calculateRhythmDuration, formatDuration } from '../utils/audioExport';

interface DownloadDropdownProps {
  rhythm: ParsedRhythm;
  notation: string;
  bpm: number;
  playbackSettings: PlaybackSettings;
  metronomeEnabled: boolean;
  isOpen: boolean;
  onClose: () => void;
  buttonRef?: React.RefObject<HTMLButtonElement>;
  // Persisted settings
  format?: AudioFormat;
  loops?: number;
  onFormatChange?: (format: AudioFormat) => void;
  onLoopsChange?: (loops: number) => void;
}

type AudioFormat = 'wav' | 'mp3';

const DownloadDropdown: React.FC<DownloadDropdownProps> = ({
  rhythm,
  notation,
  bpm,
  playbackSettings,
  metronomeEnabled,
  isOpen,
  onClose,
  buttonRef,
  format: externalFormat,
  loops: externalLoops,
  onFormatChange,
  onLoopsChange,
}) => {
  const [format, setFormat] = useState<AudioFormat>(externalFormat || 'wav');
  const [loops, setLoops] = useState<number>(externalLoops || 1);
  
  // Sync with external state if provided
  useEffect(() => {
    if (externalFormat !== undefined) {
      setFormat(externalFormat);
    }
  }, [externalFormat]);
  
  useEffect(() => {
    if (externalLoops !== undefined) {
      setLoops(externalLoops);
    }
  }, [externalLoops]);
  
  const handleFormatChange = (newFormat: AudioFormat) => {
    setFormat(newFormat);
    onFormatChange?.(newFormat);
  };
  
  const handleLoopsChange = (newLoops: number) => {
    setLoops(newLoops);
    onLoopsChange?.(newLoops);
  };
  const [isExporting, setIsExporting] = useState(false);

  // Calculate preview duration
  const singleLoopDuration = rhythm.isValid && rhythm.measures.length > 0
    ? calculateRhythmDuration(rhythm, bpm)
    : 0;
  const totalDuration = singleLoopDuration * loops;

  const handleDownload = async () => {
    if (!rhythm.isValid || rhythm.measures.length === 0 || isExporting) {
      return;
    }

    setIsExporting(true);
    try {
      // Render audio
      const audioBuffer = await renderRhythmAudio(rhythm, bpm, loops, playbackSettings, metronomeEnabled ?? false);
      
      // Convert to selected format
      const blob = await exportAudioBuffer(audioBuffer, format);
      
      // Create download link with filename based on notation
      const cleanNotation = notation.replace(/[\s\n]/g, '').substring(0, 50); // Remove spaces/newlines and truncate
      const filename = cleanNotation || 'rhythm';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Don't close immediately - let user see success
      setTimeout(() => onClose(), 500);
    } catch (error) {
      console.error('Error exporting audio:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to export audio: ${errorMessage}. Please try again.`);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen || !rhythm.isValid || rhythm.measures.length === 0) {
    return null;
  }

  return (
    <Popover
      open={isOpen}
      onClose={onClose}
      anchorEl={buttonRef?.current ?? null}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <div
          className="download-dropdown"
          style={{
            backgroundColor: 'white',
            border: '2px solid var(--border-color)',
            borderRadius: '0.375rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            minWidth: '280px',
            padding: '1rem',
          }}
        >
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="download-format" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Format
            </label>
            <select
              id="download-format"
              value={format}
              onChange={(e) => handleFormatChange(e.target.value as AudioFormat)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '2px solid var(--border-color)',
                borderRadius: '0.375rem',
                fontSize: '1rem',
              }}
            >
              <option value="wav">WAV</option>
              <option value="mp3">MP3</option>
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="download-loops" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Loops
            </label>
            <input
              id="download-loops"
              type="number"
              min="1"
              max="100"
              value={loops}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1 && val <= 100) {
                  handleLoopsChange(val);
                }
              }}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '2px solid var(--border-color)',
                borderRadius: '0.375rem',
                fontSize: '1rem',
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#f3f4f6', borderRadius: '0.375rem' }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
              Preview Duration
            </div>
            <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>
              {formatDuration(totalDuration)}
            </div>
          </div>

          <button
            onClick={handleDownload}
            disabled={isExporting}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: isExporting ? '#9ca3af' : 'var(--primary-purple)',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '1rem',
              fontWeight: 500,
              cursor: isExporting ? 'not-allowed' : 'pointer',
            }}
          >
            {isExporting ? 'Exporting...' : 'Download'}
          </button>
      </div>
    </Popover>
  );
};

export default DownloadDropdown;

