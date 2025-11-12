import type { DrumSound } from '../types';

/**
 * Shared SVG path data for drum symbols
 * Used internally by drawDrumSymbol
 */
const DRUM_SYMBOL_PATHS = {
  dum: 'M 6 -7 Q -2 -7, -2 0 Q -2 7, 6 7 L 6 13',
  tak: 'M -6 6 L 0 -6 L 6 6',
  ka: 'M -6 -6 L 0 6 L 6 -6',
} as const;

/**
 * Draw a drum symbol on an SVG element
 * @param svg - The SVG element to draw on
 * @param x - X coordinate
 * @param y - Y coordinate (note head position)
 * @param sound - The drum sound type
 */
export function drawDrumSymbol(
  svg: SVGSVGElement,
  x: number,
  y: number,
  sound: DrumSound
): void {
  if (sound === 'rest') return;

  const symbolGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  // Scale down by 0.85 and position higher to avoid collision with staff
  symbolGroup.setAttribute('transform', `translate(${x}, ${y - 40}) scale(0.85)`);

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', DRUM_SYMBOL_PATHS[sound]);
  path.setAttribute('stroke', 'black');
  path.setAttribute('stroke-width', '2.2'); // Slightly thinner for smaller size
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', sound === 'dum' ? 'round' : 'miter');

  symbolGroup.appendChild(path);
  svg.appendChild(symbolGroup);
}

