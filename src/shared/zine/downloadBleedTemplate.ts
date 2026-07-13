import { buildLabsDownloadFileName } from '../utils/labsDownloadFileName';
import {
  artworkDimensionsWithBleed,
  bleedForBinding,
  bleedValueInTrimUnits,
  convertPrintUnits,
  type BleedConfig,
  type MixamBindingType,
  type TrimSize,
} from './bleedConfig';

export type BleedTemplateDownloadInput = {
  trim: TrimSize;
  binding: MixamBindingType;
  bleed?: BleedConfig;
  dpi?: number;
  projectTitle?: string;
  presetName?: string;
};

/** High-contrast template colors — easy to see in Photoshop / Procreate; lower opacity in-app if needed. */
const TRIM_LINE = '#15803d';
const BLEED_EDGE = '#1d4ed8';
const QUIET_LINE = '#1e40af';
const GUTTER_FILL = '#fb923c';
const BLEED_FILL = '#f472b6';
const TRIM_FILL = '#ffffff';

function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function bleedTemplateFileName(input: BleedTemplateDownloadInput): string {
  const label = input.presetName?.trim() || 'Custom';
  const title = input.projectTitle?.trim() || 'Comic';
  return buildLabsDownloadFileName([title, `${label} Bleed Template`], 'png');
}

export async function downloadBleedTemplatePng(input: BleedTemplateDownloadInput): Promise<void> {
  const bleed = input.bleed ?? bleedForBinding(input.binding);
  const dpi = input.dpi ?? 300;
  const artwork = artworkDimensionsWithBleed(input.trim, bleed);
  const widthIn = convertPrintUnits(artwork.width, artwork.unit, 'in');
  const heightIn = convertPrintUnits(artwork.height, artwork.unit, 'in');
  const canvasWidth = Math.max(1, Math.round(widthIn * dpi));
  const canvasHeight = Math.max(1, Math.round(heightIn * dpi));

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  const bleedPx = bleedValueInTrimUnits(bleed, 'in') * dpi;
  const quietPx = convertPrintUnits(bleed.quietArea, bleed.unit === 'mm' ? 'mm' : 'in', 'in') * dpi;
  const gutterPx = bleed.gutter
    ? convertPrintUnits(bleed.gutter, bleed.unit === 'mm' ? 'mm' : 'in', 'in') * dpi
    : 0;
  const lineWidth = Math.max(2, Math.round(dpi / 100));
  const dash = Math.max(6, Math.round(dpi / 50));

  ctx.fillStyle = BLEED_FILL;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const trimX = bleedPx;
  const trimY = bleedPx;
  const trimW = canvasWidth - bleedPx * 2;
  const trimH = canvasHeight - bleedPx * 2;

  ctx.fillStyle = TRIM_FILL;
  ctx.fillRect(trimX, trimY, trimW, trimH);

  if (gutterPx > 0) {
    ctx.fillStyle = GUTTER_FILL;
    ctx.globalAlpha = 0.72;
    ctx.fillRect(trimX, trimY, gutterPx, trimH);
    ctx.globalAlpha = 1;
  }

  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = TRIM_LINE;
  ctx.strokeRect(trimX + lineWidth / 2, trimY + lineWidth / 2, trimW - lineWidth, trimH - lineWidth);

  ctx.strokeStyle = BLEED_EDGE;
  ctx.strokeRect(lineWidth / 2, lineWidth / 2, canvasWidth - lineWidth, canvasHeight - lineWidth);

  ctx.setLineDash([dash, dash]);
  ctx.strokeStyle = QUIET_LINE;
  ctx.strokeRect(
    trimX + quietPx + lineWidth / 2,
    trimY + quietPx + lineWidth / 2,
    trimW - quietPx * 2 - lineWidth,
    trimH - quietPx * 2 - lineWidth,
  );
  ctx.setLineDash([]);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error('Failed to export bleed template'));
    }, 'image/png');
  });

  triggerBlobDownload(blob, bleedTemplateFileName(input));
}
