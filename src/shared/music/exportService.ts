import { buildLabsDownloadFileName, labsDownloadFileNameWithExtension, sanitizeLabsDownloadFileStem } from '../utils/labsDownloadFileName';
import { encodeAudioBuffer } from './audioCodecs';
import { EXPORT_FORMATS, isScoreExportFormat, type ExportExecutionRequest, type ExportExecutionResult, type ExportFormat } from './exportTypes';
import { triggerBlobDownload } from '../utils/triggerBlobDownload';

function extensionForFormat(format: ExportFormat): string {
  return EXPORT_FORMATS.find((item) => item.id === format)?.extension ?? format;
}

function exportFileStem(adapter: ExportExecutionRequest['adapter']): string {
  return sanitizeLabsDownloadFileStem(adapter.fileBaseName || adapter.title || adapter.id) || 'Export';
}

async function downloadAudioBlob(
  buffer: AudioBuffer,
  format: ExportFormat,
  fileName: string,
  mp3BitrateKbps: number
): Promise<void> {
  const blob = await encodeAudioBuffer(buffer, format, { mp3BitrateKbps });
  triggerBlobDownload(blob, fileName);
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
  const base = exportFileStem(adapter);
  const ext = extensionForFormat(format);

  if (isScoreExportFormat(format)) {
    if (!adapter.renderScoreSheet) {
      throw new Error('This source does not support score sheet export.');
    }
    const scoreTitle = request.scoreTitle?.trim()
      || adapter.defaultScoreTitle?.trim()
      || adapter.fileBaseName
      || adapter.title;
    const blob = await adapter.renderScoreSheet({ format, title: scoreTitle });
    const scoreStem = sanitizeLabsDownloadFileStem(scoreTitle) || exportFileStem(adapter);
    const fileName = labsDownloadFileNameWithExtension(scoreStem, ext);
    triggerBlobDownload(blob, fileName);
    downloadedFiles.push(fileName);
    return { downloadedFiles };
  }

  if (format === 'midi') {
    if (!adapter.renderMidi) {
      throw new Error('This source does not support MIDI export.');
    }
    const bytes = await adapter.renderMidi({ loopCount, selectedStemIds: stemIds });
    const blob = new Blob([bytes], { type: 'audio/midi' });
    const fileName = labsDownloadFileNameWithExtension(base, ext);
    triggerBlobDownload(blob, fileName);
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
      const stemLabel =
        adapter.stems.find((stem) => stem.id === stemId)?.label ?? stemId;
      const fileName = labsDownloadFileNameWithExtension(
        buildLabsDownloadFileName([base, stemLabel]),
        ext,
      );
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
  const mixName = labsDownloadFileNameWithExtension(base, ext);
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
