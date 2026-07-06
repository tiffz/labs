export function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T;
}

export function clampBpm(value: number): number {
  return Math.max(40, Math.min(220, value));
}

export function getViewportMetrics(): { width: number; height: number } {
  const vv = window.visualViewport;
  if (vv) {
    return { width: vv.width, height: vv.height };
  }
  return { width: window.innerWidth, height: window.innerHeight };
}

export function getTemplateSyncopationScore(notation: string): number {
  const compact = notation.replace(/\s+/g, '');
  const length = compact.length > 0 ? compact.length : 16;
  let score = 0;
  for (let index = 0; index < compact.length; index += 1) {
    const token = compact[index];
    if (!token || token === '-' || token === '_') continue;
    const onQuarter = index % 4 === 0;
    const onEighth = index % 2 === 0;
    if (!onQuarter) score += 2;
    else if (!onEighth) score += 1;
  }
  return score / Math.max(1, length);
}

export function volumeIconName(isMuted: boolean): string {
  return isMuted ? 'volume_off' : 'volume_up';
}

export function snapBiasToLevel(raw: number): number {
  if (raw <= 25) return 0;
  if (raw <= 70) return 50;
  return 90;
}
