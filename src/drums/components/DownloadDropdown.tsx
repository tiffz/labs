import React from 'react';
import AnchoredPopover from '../../shared/components/AnchoredPopover';
import type { ParsedRhythm } from '../types';
import type { PlaybackSettings } from '../types/settings';
import { exportAudioBuffer, calculateRhythmDuration, formatDuration, renderRhythmAudio } from '../utils/audioExport';
import { buildDrumsAudioDownloadFileName } from '../utils/exportAdapter';
import { labsDownloadFileNameWithExtension } from '../../shared/utils/labsDownloadFileName';

interface DownloadDropdownProps {
  rhythm: ParsedRhythm;
  notation: string;
  bpm: number;
  playbackSettings: PlaybackSettings;
  metronomeEnabled: boolean;
  isOpen: boolean;
  onClose: () => void;
  buttonRef?: React.RefObject<HTMLButtonElement>;
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
  const [format, setFormat] = React.useState<AudioFormat>(externalFormat || 'wav');
  const [loops, setLoops] = React.useState<number>(externalLoops || 1);

  React.useEffect(() => {
    if (externalFormat !== undefined) {
      setFormat(externalFormat);
    }
  }, [externalFormat]);

  React.useEffect(() => {
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

  const [isExporting, setIsExporting] = React.useState(false);

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
      const audioBuffer = await renderRhythmAudio(rhythm, bpm, loops, playbackSettings, metronomeEnabled ?? false);
      const blob = await exportAudioBuffer(audioBuffer, format);
      const filename = buildDrumsAudioDownloadFileName(notation);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = labsDownloadFileNameWithExtension(filename, format);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
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
    <AnchoredPopover
      open={isOpen}
      onClose={onClose}
      anchorEl={buttonRef?.current ?? null}
      placement="bottom-end"
      paperClassName="drums-floating-menu drums-download-menu download-dropdown-container"
    >
      <div className="download-dropdown">
        <div className="drums-floating-menu__header">
          <h3 className="drums-floating-menu__title">Download audio</h3>
        </div>
        <div className="drums-floating-menu__body">
          <div className="drums-floating-menu__section">
            <p className="drums-floating-menu__section-label">Format</p>
            <div
              className="drums-floating-menu__chip-grid drums-floating-menu__chip-grid--2"
              role="group"
              aria-label="Audio format"
            >
              {(['wav', 'mp3'] as const).map((option) => {
                const isActive = format === option;
                return (
                  <button
                    key={option}
                    type="button"
                    className={`drums-floating-menu__chip${isActive ? ' is-active' : ''}`}
                    aria-pressed={isActive}
                    onClick={() => handleFormatChange(option)}
                  >
                    {option.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="drums-floating-menu__slider-panel download-dropdown__loops">
            <label htmlFor="download-loops" className="drums-floating-menu__field-label">
              <span>Loops</span>
              <span className="drums-floating-menu__field-value">{loops}</span>
            </label>
            <input
              id="download-loops"
              className="download-dropdown__loops-input"
              type="number"
              min="1"
              max="100"
              aria-label="Loops"
              value={loops}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1 && val <= 100) {
                  handleLoopsChange(val);
                }
              }}
            />
          </div>

          <div className="drums-floating-menu__note-panel download-dropdown__preview">
            <div className="download-dropdown__preview-label">Preview duration</div>
            <div className="download-dropdown__preview-value">{formatDuration(totalDuration)}</div>
          </div>

          <button
            type="button"
            className="drums-floating-menu__primary-action"
            onClick={() => void handleDownload()}
            disabled={isExporting}
          >
            {isExporting ? 'Exporting…' : 'Download'}
          </button>
        </div>
      </div>
    </AnchoredPopover>
  );
};

export default DownloadDropdown;
