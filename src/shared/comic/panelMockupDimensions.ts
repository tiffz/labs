import { labsPrintSpecSummary, type LabsPrintSpec } from '../zine/labsPrintSpec';

const DEFAULT_WIDTH = 400;

export function mockupDimensionsForPrintSpec(
  printSpec?: LabsPrintSpec,
  maxWidth = DEFAULT_WIDTH,
): { width: number; height: number } {
  if (!printSpec) return { width: maxWidth, height: Math.round(maxWidth * (11 / 8.5)) };
  const { aspectRatio } = labsPrintSpecSummary(printSpec);
  return { width: maxWidth, height: Math.round(maxWidth / aspectRatio) };
}
