async function bufferToHex(buffer: ArrayBuffer): Promise<string> {
  const hashArray = Array.from(new Uint8Array(buffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256Fingerprint(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', arrayBuffer);
  return bufferToHex(digest);
}
