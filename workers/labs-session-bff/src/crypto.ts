const encoder = new TextEncoder();

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export function parseHexKey(hex: string, label: string): Uint8Array {
  const normalized = hex.trim();
  if (!/^[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error(`${label} must be 64 hex characters (32 bytes).`);
  }
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    out[i] = parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

async function importHmacKey(hex: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', parseHexKey(hex, 'SESSION_SIGNING_KEY'), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

async function importAesKey(hex: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', parseHexKey(hex, 'REFRESH_ENCRYPTION_KEY'), { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

export async function signSessionPayload(payloadJson: string, signingKeyHex: string): Promise<string> {
  const key = await importHmacKey(signingKeyHex);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadJson));
  return bytesToBase64Url(new Uint8Array(sig));
}

export async function verifySessionPayload(
  payloadJson: string,
  signature: string,
  signingKeyHex: string,
): Promise<boolean> {
  const key = await importHmacKey(signingKeyHex);
  return crypto.subtle.verify('HMAC', key, base64UrlToBytes(signature), encoder.encode(payloadJson));
}

export async function encryptString(plaintext: string, encryptionKeyHex: string): Promise<string> {
  const key = await importAesKey(encryptionKeyHex);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plaintext));
  const combined = new Uint8Array(iv.length + cipher.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipher), iv.length);
  return bytesToBase64Url(combined);
}

export async function decryptString(ciphertext: string, encryptionKeyHex: string): Promise<string> {
  const key = await importAesKey(encryptionKeyHex);
  const combined = base64UrlToBytes(ciphertext);
  if (combined.length < 13) throw new Error('Invalid ciphertext');
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return new TextDecoder().decode(plain);
}

export function randomToken(byteLength = 32): string {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

/** PKCE S256 code challenge from verifier. */
export async function pkceChallengeFromVerifier(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(verifier));
  return bytesToBase64Url(new Uint8Array(digest));
}

export function pkceVerifier(): string {
  return randomToken(32);
}
