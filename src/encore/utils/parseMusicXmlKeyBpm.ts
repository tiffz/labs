const MAJOR_KEYS = ['Cb', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];

/** Best-effort key and tempo from MusicXML text (partwise or timewise). */
export function parseMusicXmlKeyBpm(xml: string): { key?: string; bpm?: number } {
  const out: { key?: string; bpm?: number } = {};
  try {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const fifthsEl = doc.querySelector('key fifths, attributes key fifths');
    const modeEl = doc.querySelector('key mode, attributes key mode');
    const fifths = fifthsEl?.textContent != null ? Number.parseInt(fifthsEl.textContent.trim(), 10) : NaN;
    if (Number.isFinite(fifths)) {
      const mode = (modeEl?.textContent ?? 'major').toLowerCase().includes('minor') ? 'minor' : 'major';
      const idx = fifths + 7;
      if (idx >= 0 && idx < MAJOR_KEYS.length) {
        const root = MAJOR_KEYS[idx];
        out.key = mode === 'minor' ? `${root} minor` : `${root} major`;
      }
    }
    const sound = doc.querySelector('sound[tempo]');
    const tempoAttr = sound?.getAttribute('tempo');
    if (tempoAttr) {
      const t = Number.parseFloat(tempoAttr);
      if (Number.isFinite(t)) out.bpm = Math.round(t);
    }
    const perMin = doc.querySelector('per-minute');
    if (perMin?.textContent) {
      const t = Number.parseFloat(perMin.textContent.trim());
      if (Number.isFinite(t)) out.bpm = Math.round(t);
    }
  } catch {
    /* ignore */
  }
  return out;
}
