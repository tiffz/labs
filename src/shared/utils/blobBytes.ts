/**
 * TS 5.9+ DOM lib types `BlobPart` as requiring `ArrayBuffer`-backed views
 * (`Uint8Array<ArrayBuffer>`), while many encoders return
 * `Uint8Array<ArrayBufferLike>`. Runtime-narrow (copying only in the
 * SharedArrayBuffer case, which never happens for our encoders) so
 * `new Blob([...])` stays type-safe without per-site casts.
 */
export function labsBlobBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  return bytes.buffer instanceof ArrayBuffer
    ? (bytes as Uint8Array<ArrayBuffer>)
    : new Uint8Array(bytes);
}
