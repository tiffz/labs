export function computeMaxLineWidth(
  containerPixelWidth: number,
  zoomLevel: number,
  leftPad: number,
  rightPad: number,
  wrapSafetyPx: number
): number {
  const clampedZoom = Math.max(0.75, Math.min(1.75, zoomLevel));
  const effectiveContainerWidth = Math.max(320, containerPixelWidth || 960);
  const availableWidth = Math.max(320, effectiveContainerWidth / clampedZoom);
  return Math.max(180, availableWidth - leftPad - rightPad - wrapSafetyPx);
}

export function wrapMeasureIndexes(
  measureWidths: number[],
  maxLineWidth: number
): number[][] {
  const lines: number[][] = [];
  let currentLine: number[] = [];
  let currentWidth = 0;

  measureWidths.forEach((width, measureIndex) => {
    if (currentLine.length > 0 && currentWidth + width > maxLineWidth) {
      lines.push(currentLine);
      currentLine = [measureIndex];
      currentWidth = width;
    } else {
      currentLine.push(measureIndex);
      currentWidth += width;
    }
  });

  if (currentLine.length > 0) lines.push(currentLine);
  return lines;
}

