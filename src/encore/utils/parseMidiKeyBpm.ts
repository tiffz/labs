const MAJOR_KEYS = ['Cb', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];

function readStr(u8: Uint8Array, o: number, n: number): string {
  return String.fromCharCode(...u8.slice(o, o + n));
}

function readU32BE(u8: Uint8Array, o: number): number {
  return ((u8[o]! << 24) | (u8[o + 1]! << 16) | (u8[o + 2]! << 8) | u8[o + 3]!) >>> 0;
}

/** Scan first MTrk meta events for key signature and set tempo (SMF). */
export function parseMidiKeyBpm(buffer: ArrayBuffer): { key?: string; bpm?: number } {
  const out: { key?: string; bpm?: number } = {};
  const u8 = new Uint8Array(buffer);
  if (u8.length < 22) return out;
  if (readStr(u8, 0, 4) !== 'MThd') return out;
  const hdrLen = readU32BE(u8, 4);
  let o = 8 + hdrLen;
  if (o + 8 > u8.length) return out;
  if (readStr(u8, o, 4) !== 'MTrk') return out;
  o += 4;
  const trkLen = readU32BE(u8, o);
  o += 4;
  const end = o + trkLen;
  let status = 0;
  while (o < end) {
    while (o < end && u8[o]! & 0x80) o++;
    if (o >= end) break;
    o++;
    if (o >= end) break;
    let b = u8[o]!;
    if (b < 0x80) {
      b = status;
      o--;
    } else {
      status = b;
      o++;
    }
    if (b === 0xff) {
      const meta = u8[o]!;
      o++;
      let ml = 0;
      while (o < end) {
        const x = u8[o]!;
        o++;
        ml = (ml << 7) | (x & 0x7f);
        if (!(x & 0x80)) break;
      }
      const data = u8.slice(o, o + ml);
      o += ml;
      if (meta === 0x51 && data.length === 3 && out.bpm == null) {
        const uspq = (data[0]! << 16) | (data[1]! << 8) | data[2]!;
        if (uspq > 0) out.bpm = Math.round(60_000_000 / uspq);
      }
      if (meta === 0x59 && data.length >= 2 && out.key == null) {
        const sf = data[0]! > 127 ? data[0]! - 256 : data[0]!;
        const minor = data[1] === 1;
        const idx = sf + 7;
        if (idx >= 0 && idx < MAJOR_KEYS.length) {
          const root = MAJOR_KEYS[idx];
          out.key = minor ? `${root} minor` : `${root} major`;
        }
      }
      continue;
    }
    if (b >= 0x80 && b !== 0xff) {
      const op = b & 0xf0;
      if (op === 0x80 || op === 0x90 || op === 0xa0 || op === 0xb0 || op === 0xe0) {
        o += 2;
      } else if (op === 0xc0 || op === 0xd0) {
        o += 1;
      }
    }
  }
  return out;
}
