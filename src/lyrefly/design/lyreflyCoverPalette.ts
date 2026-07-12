export type LyreflyCoverPalette = {
  wash: string;
};

const COVER_PALETTES: LyreflyCoverPalette[] = [
  {
    wash: 'linear-gradient(160deg, rgba(255,45,149,0.14), rgba(0,212,170,0.1) 55%, rgba(255,212,0,0.08))',
  },
  {
    wash: 'linear-gradient(155deg, rgba(0,212,170,0.12), rgba(255,45,149,0.1) 50%, rgba(220,38,38,0.06))',
  },
  {
    wash: 'linear-gradient(140deg, rgba(255,212,0,0.12), rgba(255,45,149,0.09) 48%, rgba(0,212,170,0.08))',
  },
  {
    wash: 'linear-gradient(165deg, rgba(220,38,38,0.08), rgba(255,45,149,0.11) 46%, rgba(0,212,170,0.09))',
  },
  {
    wash: 'linear-gradient(130deg, rgba(255,45,149,0.11), rgba(255,212,0,0.09) 42%, rgba(0,212,170,0.1))',
  },
];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function coverPaletteForProject(projectId: string): LyreflyCoverPalette {
  return COVER_PALETTES[hashString(projectId) % COVER_PALETTES.length] ?? COVER_PALETTES[0]!;
}

export function coverInitialFromTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
}
