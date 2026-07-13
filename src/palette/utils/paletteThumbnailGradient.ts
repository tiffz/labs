import type { PalettegenGalleryEntry } from '../hooks/usePalettegenGallery';

export function paletteThumbnailGradient(entry: PalettegenGalleryEntry): string {
  const stops = entry.palette.swatches.map((swatch, index, list) => {
    const start = (index / list.length) * 100;
    const end = ((index + 1) / list.length) * 100;
    return `${swatch.hex} ${start}% ${end}%`;
  });
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}
