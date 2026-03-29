import { encodeAudioBuffer } from './audioCodecs';
import { EXPORT_FORMATS, type ExportExecutionRequest, type ExportExecutionResult, type ExportFormat } from './exportTypes';

function extensionForFormat(format: ExportFormat): string {
  return EXPORT_FORMATS.find((item) => item.id === format)?.extension ?? format;
}

function sanitizeBaseName(value: string): string {
  return value
    .trim()
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'export';
}

function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function downloadAudioBlob(
  buffer: AudioBuffer,
  format: ExportFormat,
  fileName: string,
  mp3BitrateKbps: number
): Promise<void> {
  const blob = await encodeAudioBuffer(buffer, format, { mp3BitrateKbps });
  triggerDownload(blob, fileName);
}

export async function executeExport(
  request: ExportExecutionRequest
): Promise<ExportExecutionResult> {
  const {
    adapter,
    format,
    loopCount,
    selectedStemIds,
    separateStemFiles,
    quality,
  } = request;
  const stemIds = selectedStemIds.length > 0
    ? selectedStemIds
    : adapter.stems.filter((stem) => stem.defaultSelected !== false).map((stem) => stem.id);
  const downloadedFiles: string[] = [];
  const base = sanitizeBaseName(adapter.fileBaseName || adapter.title || adapter.id);
  const ext = extensionForFormat(format);

  if (format === 'midi') {
    if (!adapter.renderMidi) {
      throw new Error('This source does not support MIDI export.');
    }
    const bytes = await adapter.renderMidi({ loopCount, selectedStemIds: stemIds });
    const blob = new Blob([bytes], { type: 'audio/midi' });
    const fileName = `${base}.${ext}`;
    triggerDownload(blob, fileName);
    downloadedFiles.push(fileName);
    return { downloadedFiles };
  }

  if (!adapter.renderAudio) {
    throw new Error('This source does not support audio export.');
  }

  const rendered = await adapter.renderAudio({
    loopCount,
    selectedStemIds: stemIds,
    quality,
  });

  if (separateStemFiles && rendered.stems && stemIds.length > 0) {
    for (const stemId of stemIds) {
      const stemBuffer = rendered.stems[stemId];
      if (!stemBuffer) continue;
      const fileName = `${base}-${sanitizeBaseName(stemId)}.${ext}`;
      await downloadAudioBlob(stemBuffer, format, fileName, quality.mp3BitrateKbps);
      downloadedFiles.push(fileName);
    }
    if (downloadedFiles.length > 0) {
      return { downloadedFiles };
    }
  }

  if (!rendered.mix) {
    throw new Error('No mixed audio data was returned for export.');
  }
  const mixName = `${base}.${ext}`;
  await downloadAudioBlob(rendered.mix, format, mixName, quality.mp3BitrateKbps);
  downloadedFiles.push(mixName);
  return { downloadedFiles };
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${minutes}m ${rem.toFixed(0)}s`;
}
