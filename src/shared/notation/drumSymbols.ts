import type { DrumSound } from '../rhythm/types';

/**
 * SVG path data for drum symbols
 */
const DRUM_SYMBOL_PATHS = {
  // C-shape centered at x=0 (shifted left by 2 from original)
  dum: 'M 4 -7 Q -4 -7, -4 0 Q -4 7, 4 7 L 4 13',
  tak: 'M -6 6 L 0 -6 L 6 6',
  ka: 'M -6 -6 L 0 6 L 6 -6',
} as const;

export type DrawableDrumSound = Exclude<DrumSound, 'rest' | 'simile'>;

export const DRUMS_SYMBOL_LEGEND: ReadonlyArray<{ sound: DrawableDrumSound; label: string }> = [
  { sound: 'dum', label: 'Dum' },
  { sound: 'tak', label: 'Tak' },
  { sound: 'ka', label: 'Ka' },
  { sound: 'slap', label: 'Slap' },
];

export function drawDrumSymbolOnCanvas(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  sound: DrawableDrumSound,
  options: { color?: string; scale?: number } = {},
): void {
  const color = options.color ?? '#111827';
  const scale = options.scale ?? 0.85;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';

  if (sound === 'slap') {
    ctx.beginPath();
    ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.lineJoin = sound === 'dum' ? 'round' : 'miter';
    ctx.stroke(new Path2D(DRUM_SYMBOL_PATHS[sound]));
  }

  ctx.restore();
}

export function drawDrumsSymbolLegendOnCanvas(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  options: {
    symbolScale?: number;
    itemWidth?: number;
    fontSizePx?: number;
    labelOffsetY?: number;
  } = {},
): void {
  const symbolScale = options.symbolScale ?? 0.95;
  const itemWidth = options.itemWidth ?? 58;
  const fontSizePx = options.fontSizePx ?? 11;
  const labelOffsetY = options.labelOffsetY ?? 10;

  ctx.fillStyle = '#4b5563';
  ctx.font = `${fontSizePx}px system-ui, -apple-system, Segoe UI, sans-serif`;

  const symbolY = y - 8;
  const labelY = y + labelOffsetY;

  for (let index = 0; index < DRUMS_SYMBOL_LEGEND.length; index += 1) {
    const item = DRUMS_SYMBOL_LEGEND[index];
    const centerX = x + index * itemWidth + itemWidth / 2;
    drawDrumSymbolOnCanvas(ctx, centerX, symbolY, item.sound, { scale: symbolScale, color: '#374151' });
    ctx.textAlign = 'center';
    ctx.fillText(item.label, centerX, labelY);
  }

  ctx.textAlign = 'left';
}

/**
 * Draw a drum symbol on an SVG element
 * @param svg - The SVG element to draw on
 * @param x - X coordinate
 * @param y - Y coordinate (note head position)
 * @param sound - The drum sound type
 * @param color - Optional color override (default: black)
 * @param scale - Optional scale factor (default: 0.85)
 * @param yOffset - Optional Y offset to position symbol above notehead (default: -40 for standard notation)
 */
export function drawDrumSymbol(
  svg: SVGSVGElement,
  x: number,
  y: number,
  sound: DrumSound,
  color: string = 'black',
  scale: number = 0.85,
  yOffset: number = -40
): SVGGElement | null {
  if (sound === 'rest' || sound === 'simile') return null;

  const symbolGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  // Position symbol with configurable Y offset (default: -40 to place above notehead)
  symbolGroup.setAttribute('transform', `translate(${x}, ${y + yOffset}) scale(${scale})`);
  symbolGroup.setAttribute('class', `drum-symbol drum-symbol-${sound}`);

  if (sound === 'slap') {
    // Slap is a filled circle
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '0');
    circle.setAttribute('cy', '0');
    circle.setAttribute('r', '7.5');
    circle.setAttribute('fill', color);
    circle.setAttribute('stroke', 'none');
    symbolGroup.appendChild(circle);
  } else {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', DRUM_SYMBOL_PATHS[sound]);
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', '2.2');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', sound === 'dum' ? 'round' : 'miter');
    symbolGroup.appendChild(path);
  }

  svg.appendChild(symbolGroup);
  return symbolGroup;
}

/**
 * Get the symbol character for a drum sound (for text display)
 */
export function getDrumSymbolChar(sound: DrumSound): string {
  switch (sound) {
    case 'dum':
      return 'D';
    case 'tak':
      return 'T';
    case 'ka':
      return 'K';
    case 'slap':
      return 'S';
    case 'rest':
      return '·';
    default:
      return '?';
  }
}
