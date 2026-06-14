/** Chunk size when hashing large blobs in the browser (2 MiB). */
const HASH_CHUNK_BYTES = 2 * 1024 * 1024;

/** MD5 hex digest aligned with Google Drive `md5Checksum` (lowercase hex). */
export async function computeFileMd5Hex(blob: Blob): Promise<string> {
  const hasher = new Md5ArrayBufferHasher();
  let offset = 0;
  while (offset < blob.size) {
    const chunk = blob.slice(offset, offset + HASH_CHUNK_BYTES);
    const buffer = await readBlobBytes(chunk);
    hasher.append(buffer);
    offset += HASH_CHUNK_BYTES;
  }
  return hasher.endHex();
}

async function readBlobBytes(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') {
    return blob.arrayBuffer();
  }
  return readBlobWithFileReader(blob);
}

function readBlobWithFileReader(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file bytes.'));
    reader.readAsArrayBuffer(blob);
  });
}

const HEX = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'] as const;

/** Incremental MD5 for binary data (SparkMD5.ArrayBuffer, MIT). */
class Md5ArrayBufferHasher {
  private buff = new Uint8Array(0);
  private length = 0;
  private hash = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];

  append(arr: ArrayBuffer): void {
    const incoming = new Uint8Array(arr);
    const combined = new Uint8Array(this.buff.length + incoming.length);
    combined.set(this.buff);
    combined.set(incoming, this.buff.length);
    this.length += incoming.length;

    let i = 64;
    while (i <= combined.length) {
      md5Cycle(this.hash, md5BlockArray(combined.subarray(i - 64, i)));
      i += 64;
    }
    this.buff = i - 64 < combined.length ? combined.subarray(i - 64) : new Uint8Array(0);
  }

  endHex(): string {
    const tail = new Array<number>(16).fill(0);
    const length = this.buff.length;
    for (let i = 0; i < length; i += 1) {
      tail[i >> 2]! |= this.buff[i]! << ((i % 4) << 3);
    }
    tail[length >> 2]! |= 0x80 << ((length % 4) << 3);
    if (length > 55) {
      md5Cycle(this.hash, tail);
      for (let i = 0; i < 16; i += 1) tail[i] = 0;
    }

    const bitLength = this.length * 8;
    const lo = bitLength & 0xffffffff;
    const hi = Math.floor(bitLength / 0x100000000);
    tail[14] = lo;
    tail[15] = hi;
    md5Cycle(this.hash, tail);

    return this.hash.map((word) => rhex(word)).join('');
  }
}

function rhex(value: number): string {
  let out = '';
  for (let j = 0; j < 4; j += 1) {
    out +=
      HEX[(value >> (j * 8 + 4)) & 0x0f]! +
      HEX[(value >> (j * 8)) & 0x0f]!;
  }
  return out;
}

function md5BlockArray(bytes: Uint8Array): number[] {
  const blocks: number[] = [];
  for (let i = 0; i < 64; i += 4) {
    blocks[i >> 2] =
      bytes[i]! + (bytes[i + 1]! << 8) + (bytes[i + 2]! << 16) + (bytes[i + 3]! << 24);
  }
  return blocks;
}

function md5Cycle(state: number[], block: number[]): void {
  let a = state[0]!;
  let b = state[1]!;
  let c = state[2]!;
  let d = state[3]!;

  a = ff(a, b, c, d, block[0]!, 7, -680876936);
  d = ff(d, a, b, c, block[1]!, 12, -389564586);
  c = ff(c, d, a, b, block[2]!, 17, 606105819);
  b = ff(b, c, d, a, block[3]!, 22, -1044525330);
  a = ff(a, b, c, d, block[4]!, 7, -176418897);
  d = ff(d, a, b, c, block[5]!, 12, 1200080426);
  c = ff(c, d, a, b, block[6]!, 17, -1473231341);
  b = ff(b, c, d, a, block[7]!, 22, -45705983);
  a = ff(a, b, c, d, block[8]!, 7, 1770035416);
  d = ff(d, a, b, c, block[9]!, 12, -1958414417);
  c = ff(c, d, a, b, block[10]!, 17, -42063);
  b = ff(b, c, d, a, block[11]!, 22, -1990404162);
  a = ff(a, b, c, d, block[12]!, 7, 1804603682);
  d = ff(d, a, b, c, block[13]!, 12, -40341101);
  c = ff(c, d, a, b, block[14]!, 17, -1502002290);
  b = ff(b, c, d, a, block[15]!, 22, 1236535329);

  a = gg(a, b, c, d, block[1]!, 5, -165796510);
  d = gg(d, a, b, c, block[6]!, 9, -1069501632);
  c = gg(c, d, a, b, block[11]!, 14, 643717713);
  b = gg(b, c, d, a, block[0]!, 20, -373897302);
  a = gg(a, b, c, d, block[5]!, 5, -701558691);
  d = gg(d, a, b, c, block[10]!, 9, 38016083);
  c = gg(c, d, a, b, block[15]!, 14, -660478335);
  b = gg(b, c, d, a, block[4]!, 20, -405537848);
  a = gg(a, b, c, d, block[9]!, 5, 568446438);
  d = gg(d, a, b, c, block[14]!, 9, -1019803690);
  c = gg(c, d, a, b, block[3]!, 14, -187363961);
  b = gg(b, c, d, a, block[8]!, 20, 1163531501);
  a = gg(a, b, c, d, block[13]!, 5, -1444681467);
  d = gg(d, a, b, c, block[2]!, 9, -51403784);
  c = gg(c, d, a, b, block[7]!, 14, 1735328473);
  b = gg(b, c, d, a, block[12]!, 20, -1926607734);

  a = hh(a, b, c, d, block[5]!, 4, -378558);
  d = hh(d, a, b, c, block[8]!, 11, -2022574463);
  c = hh(c, d, a, b, block[11]!, 16, 1839030562);
  b = hh(b, c, d, a, block[14]!, 23, -35309556);
  a = hh(a, b, c, d, block[1]!, 4, -1530992060);
  d = hh(d, a, b, c, block[4]!, 11, 1272893353);
  c = hh(c, d, a, b, block[7]!, 16, -155497632);
  b = hh(b, c, d, a, block[10]!, 23, -1094730640);
  a = hh(a, b, c, d, block[13]!, 4, 681279174);
  d = hh(d, a, b, c, block[0]!, 11, -358537222);
  c = hh(c, d, a, b, block[3]!, 16, -722521979);
  b = hh(b, c, d, a, block[6]!, 23, 76029189);
  a = hh(a, b, c, d, block[9]!, 4, -640364487);
  d = hh(d, a, b, c, block[12]!, 11, -421815835);
  c = hh(c, d, a, b, block[15]!, 16, 530742520);
  b = hh(b, c, d, a, block[2]!, 23, -995338651);

  a = ii(a, b, c, d, block[0]!, 6, -198630844);
  d = ii(d, a, b, c, block[7]!, 10, 1126891415);
  c = ii(c, d, a, b, block[14]!, 15, -1416354905);
  b = ii(b, c, d, a, block[5]!, 21, -57434055);
  a = ii(a, b, c, d, block[12]!, 6, 1700485571);
  d = ii(d, a, b, c, block[3]!, 10, -1894986606);
  c = ii(c, d, a, b, block[10]!, 15, -1051523);
  b = ii(b, c, d, a, block[1]!, 21, -2054922799);
  a = ii(a, b, c, d, block[8]!, 6, 1873313359);
  d = ii(d, a, b, c, block[15]!, 10, -30611744);
  c = ii(c, d, a, b, block[6]!, 15, -1560198380);
  b = ii(b, c, d, a, block[13]!, 21, 1309151649);
  a = ii(a, b, c, d, block[4]!, 6, -145523070);
  d = ii(d, a, b, c, block[11]!, 10, -1120210379);
  c = ii(c, d, a, b, block[2]!, 15, 718787259);
  b = ii(b, c, d, a, block[9]!, 21, -343485551);

  state[0] = (a + state[0]!) | 0;
  state[1] = (b + state[1]!) | 0;
  state[2] = (c + state[2]!) | 0;
  state[3] = (d + state[3]!) | 0;
}

function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
  const n = a + ((b & c) | (~b & d)) + x + t;
  return ((n << s) | (n >>> (32 - s))) + b;
}

function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
  const n = a + ((b & d) | (c & ~d)) + x + t;
  return ((n << s) | (n >>> (32 - s))) + b;
}

function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
  const n = a + (b ^ c ^ d) + x + t;
  return ((n << s) | (n >>> (32 - s))) + b;
}

function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
  const n = a + (c ^ (b | ~d)) + x + t;
  return ((n << s) | (n >>> (32 - s))) + b;
}
