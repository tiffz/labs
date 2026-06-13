import { describe, expect, it } from 'vitest';
import {
  base64UrlToBytes,
  bytesToBase64Url,
  decryptString,
  encryptString,
  parseHexKey,
  pkceChallengeFromVerifier,
  signSessionPayload,
  verifySessionPayload,
} from './crypto';

describe('crypto helpers', () => {
  const signingKey = 'a'.repeat(64);
  const encryptionKey = 'b'.repeat(64);

  it('round-trips AES-GCM encrypt/decrypt', async () => {
    const cipher = await encryptString('refresh-token-secret', encryptionKey);
    const plain = await decryptString(cipher, encryptionKey);
    expect(plain).toBe('refresh-token-secret');
  });

  it('signs and verifies session payloads', async () => {
    const payload = JSON.stringify({ sid: 'abc', sub: 'google-sub', exp: 9999999999, iat: 1 });
    const sig = await signSessionPayload(payload, signingKey);
    expect(await verifySessionPayload(payload, sig, signingKey)).toBe(true);
    expect(await verifySessionPayload(payload, sig, encryptionKey)).toBe(false);
  });

  it('parses 32-byte hex keys', () => {
    const bytes = parseHexKey(signingKey, 'test');
    expect(bytes).toHaveLength(32);
  });

  it('base64url round-trips bytes', () => {
    const original = new Uint8Array([1, 2, 3, 250, 251]);
    expect(base64UrlToBytes(bytesToBase64Url(original))).toEqual(original);
  });

  it('derives stable PKCE challenges', async () => {
    const challenge = await pkceChallengeFromVerifier('test-verifier-value');
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(await pkceChallengeFromVerifier('test-verifier-value')).toBe(challenge);
  });
});

describe('parseHexKey validation', () => {
  it('rejects invalid hex', () => {
    expect(() => parseHexKey('not-hex', 'KEY')).toThrow(/64 hex/);
  });
});
