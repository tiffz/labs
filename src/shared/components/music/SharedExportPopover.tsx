import { useEffect, useMemo, useState } from 'react';
import Popover from '@mui/material/Popover';
import './sharedExportPopover.css';
import {
  DEFAULT_EXPORT_QUALITY,
  EXPORT_FORMATS,
  type ExportFormat,
  type ExportSourceAdapter,
} from '../../music/exportTypes';
import { executeExport, formatDuration } from '../../music/exportService';

interface SharedExportPopoverProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  adapter: ExportSourceAdapter;
  persistKey?: string;
}

interface PersistedSettings {
  format: ExportFormat;
  loopCount: number;
  selectedStemIds: string[];
  separateStemFiles: boolean;
  mp3BitrateKbps: number;
}

const DEFAULT_SETTINGS: PersistedSettings = {
  format: 'wav',
  loopCount: 1,
  selectedStemIds: [],
  separateStemFiles: false,
  mp3BitrateKbps: DEFAULT_EXPORT_QUALITY.mp3BitrateKbps,
};

function safeParsePersisted(raw: string | null): Partial<PersistedSettings> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Partial<PersistedSettings>;
  } catch {
    return null;
  }
}

export default function SharedExportPopover({
  open,
  anchorEl,
  onClose,
  adapter,
  persistKey,
}: SharedExportPopoverProps) {
  const storageKey = useMemo(() => (
    persistKey ? `music-export:${persistKey}` : null
  ), [persistKey]);
  const persisted = useMemo(
    () => safeParsePersisted(storageKey ? window.localStorage.getItem(storageKey) : null),
    [storageKey]
  );
  const [format, setFormat] = useState<ExportFormat>(
    (persisted?.format ?? adapter.defaultFormat ?? DEFAULT_SETTINGS.format)
  );
  const [loopCount, setLoopCount] = useState<number>(persisted?.loopCount ?? DEFAULT_SETTINGS.loopCount);
  const [selectedStemIds, setSelectedStemIds] = useState<string[]>(() => {
    if (persisted?.selectedStemIds && persisted.selectedStemIds.length > 0) {
      return persisted.selectedStemIds;
    }
    return adapter.stems
      .filter((stem) => stem.defaultSelected !== false)
      .map((stem) => stem.id);
  });
  const [separateStemFiles, setSeparateStemFiles] = useState<boolean>(
    persisted?.separateStemFiles ?? DEFAULT_SETTINGS.separateStemFiles
  );
  const [mp3BitrateKbps, setMp3BitrateKbps] = useState<number>(
    persisted?.mp3BitrateKbps ?? DEFAULT_SETTINGS.mp3BitrateKbps
  );
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const supported = EXPORT_FORMATS.filter((item) => adapter.supportsFormat(item.id)).map((item) => item.id);
    if (!supported.includes(format)) {
      setFormat(supported[0] ?? 'wav');
    }
  }, [adapter, format]);

  useEffect(() => {
    const validStemIds = new Set(adapter.stems.map((stem) => stem.id));
    setSelectedStemIds((prev) => {
      const next = prev.filter((id) => validStemIds.has(id));
      if (next.length > 0) return next;
      return adapter.stems
        .filter((stem) => stem.defaultSelected !== false)
        .map((stem) => stem.id);
    });
  }, [adapter.stems]);

  useEffect(() => {
    if (!storageKey) return;
    const payload: PersistedSettings = {
      format,
      loopCount,
      selectedStemIds,
      separateStemFiles,
      mp3BitrateKbps,
    };
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  }, [storageKey, format, loopCount, selectedStemIds, separateStemFiles, mp3BitrateKbps]);

  const stemCount = adapter.stems.length;
  const supportsStems = stemCount > 1;
  const effectiveStemSelection = selectedStemIds.length > 0
    ? selectedStemIds
    : adapter.stems.filter((stem) => stem.defaultSelected !== false).map((stem) => stem.id);
  const previewSeconds = adapter.estimateDurationSeconds(loopCount, effectiveStemSelection);
  const supportedFormats = EXPORT_FORMATS.filter((item) => adapter.supportsFormat(item.id));
  const canExport = supportedFormats.length > 0 && (format === 'midi' || effectiveStemSelection.length > 0);

  const handleToggleStem = (stemId: string) => {
    setSelectedStemIds((prev) => {
      if (prev.includes(stemId)) {
        return prev.filter((id) => id !== stemId);
      }
      return [...prev, stemId];
    });
  };

  const handleExport = async () => {
    if (!canExport || isExporting) return;
    setErrorMessage(null);
    setIsExporting(true);
    try {
      await executeExport({
        adapter,
        format,
        loopCount,
        selectedStemIds: effectiveStemSelection,
        separateStemFiles: separateStemFiles && supportsStems && format !== 'midi',
        quality: { mp3BitrateKbps },
      });
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{ paper: { className: `shared-export-popover shared-export-popover-${adapter.id}` } }}
    >
      <div className={`shared-export-panel shared-export-panel-${adapter.id}`}>
        <div className="shared-export-title">{adapter.title}</div>
        <div className="shared-export-subtitle">Export file type</div>
        <div className="shared-export-format-list">
          {EXPORT_FORMATS.map((item) => {
            const disabled = !adapter.supportsFormat(item.id);
            return (
              <label
                key={item.id}
                className={`shared-export-format-row ${disabled ? 'disabled' : ''}`}
                title={item.description}
              >
                <input
                  type="radio"
                  name={`shared-export-format-${adapter.id}`}
                  value={item.id}
                  checked={format === item.id}
                  disabled={disabled}
                  onChange={() => setFormat(item.id)}
                />
                <div className="shared-export-format-label">{item.label}</div>
              </label>
            );
          })}
        </div>

        <div className="shared-export-row shared-export-row-inline">
          <label htmlFor={`loops-${adapter.id}`}>Loops</label>
          <input
            id={`loops-${adapter.id}`}
            type="number"
            min={1}
            max={128}
            value={loopCount}
            onChange={(event) => {
              const next = Number.parseInt(event.target.value, 10);
              if (!Number.isNaN(next)) {
                setLoopCount(Math.max(1, Math.min(128, next)));
              }
            }}
          />
        </div>

        {format === 'mp3' ? (
          <div className="shared-export-row shared-export-row-inline">
            <label htmlFor={`mp3-bitrate-${adapter.id}`}>MP3 quality</label>
            <select
              id={`mp3-bitrate-${adapter.id}`}
              value={mp3BitrateKbps}
              onChange={(event) => setMp3BitrateKbps(Number(event.target.value))}
            >
              {[128, 160, 192, 256, 320].map((rate) => (
                <option key={rate} value={rate}>
                  {rate} kbps
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {supportsStems ? (
          <div className="shared-export-stems">
            <div className="shared-export-subtitle">Parts / stems</div>
            {adapter.stems.map((stem) => (
              <label key={stem.id} className="shared-export-stem-row">
                <input
                  type="checkbox"
                  checked={effectiveStemSelection.includes(stem.id)}
                  onChange={() => handleToggleStem(stem.id)}
                />
                <span>{stem.label}</span>
              </label>
            ))}
            {supportsStems && format !== 'midi' ? (
              <label className="shared-export-stem-row">
                <input
                  type="checkbox"
                  checked={separateStemFiles}
                  onChange={(event) => setSeparateStemFiles(event.target.checked)}
                />
                <span>Export selected stems as separate files</span>
              </label>
            ) : null}
          </div>
        ) : null}

        <div className="shared-export-preview">
          Preview duration: <strong>{formatDuration(previewSeconds)}</strong>
        </div>
        {errorMessage ? <div className="shared-export-error">{errorMessage}</div> : null}
        <button
          className="shared-export-action"
          type="button"
          onClick={() => void handleExport()}
          disabled={!canExport || isExporting}
        >
          {isExporting ? 'Exporting…' : 'Export'}
        </button>
      </div>
    </Popover>
  );
}
