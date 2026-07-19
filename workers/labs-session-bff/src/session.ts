import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, type SessionCookiePayload, type StoredSessionRecord } from './constants';
import { decryptString, encryptString, randomToken, signSessionPayload, verifySessionPayload } from './crypto';

const encoder = new TextEncoder();

function sessionKvKey(sessionId: string): string {
  return `session:${sessionId}`;
}

function userKvKey(googleSub: string): string {
  return `user:${googleSub}`;
}

export async function createSessionCookie(
  payload: SessionCookiePayload,
  signingKeyHex: string,
): Promise<string> {
  const payloadJson = JSON.stringify(payload);
  const sig = await signSessionPayload(payloadJson, signingKeyHex);
  const value = `${bytesToBase64Url(encoder.encode(payloadJson))}.${sig}`;
  return `${SESSION_COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${SESSION_MAX_AGE_SECONDS}`;
}

export { SESSION_COOKIE_NAME } from './constants';

export async function parseSessionCookie(
  cookieHeader: string | null,
  signingKeyHex: string,
): Promise<SessionCookiePayload | null> {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`));
  const raw = match?.[1];
  if (!raw) return null;
  const [payloadPart, sigPart] = raw.split('.');
  if (!payloadPart || !sigPart) return null;
  const payloadJson = new TextDecoder().decode(base64UrlToBytes(payloadPart));
  const ok = await verifySessionPayload(payloadJson, sigPart, signingKeyHex);
  if (!ok) return null;
  const parsed = JSON.parse(payloadJson) as SessionCookiePayload;
  if (typeof parsed.sid !== 'string' || typeof parsed.sub !== 'string') return null;
  if (typeof parsed.exp !== 'number' || parsed.exp * 1000 <= Date.now()) return null;
  return parsed;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export async function storeSession(
  kv: KVNamespace,
  input: {
    googleSub: string;
    email: string;
    displayName: string;
    refreshToken: string;
    scope: string;
    encryptionKeyHex: string;
  },
): Promise<string> {
  const sessionId = randomToken(24);
  const encryptedRefresh = await encryptString(input.refreshToken, input.encryptionKeyHex);
  const record: StoredSessionRecord = {
    sessionId,
    googleSub: input.googleSub,
    email: input.email,
    displayName: input.displayName,
    encryptedRefresh,
    scope: input.scope,
    createdAtMs: Date.now(),
  };
  await kv.put(sessionKvKey(sessionId), JSON.stringify(record), {
    expirationTtl: SESSION_MAX_AGE_SECONDS,
  });
  await kv.put(userKvKey(input.googleSub), sessionId, { expirationTtl: SESSION_MAX_AGE_SECONDS });
  return sessionId;
}

export async function buildSessionCookie(
  sessionId: string,
  googleSub: string,
  signingKeyHex: string,
): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000);
  const payload: SessionCookiePayload = {
    sid: sessionId,
    sub: googleSub,
    iat: nowSec,
    exp: nowSec + SESSION_MAX_AGE_SECONDS,
  };
  return createSessionCookie(payload, signingKeyHex);
}

export async function loadSession(
  kv: KVNamespace,
  sessionId: string,
  encryptionKeyHex: string,
): Promise<(StoredSessionRecord & { refreshToken: string }) | null> {
  const raw = await kv.get(sessionKvKey(sessionId));
  if (!raw) return null;
  const record = JSON.parse(raw) as StoredSessionRecord;
  if (record.sessionId !== sessionId) return null;
  const refreshToken = await decryptString(record.encryptedRefresh, encryptionKeyHex);
  return { ...record, refreshToken };
}

/**
 * Refresh token from the user's most recent stored session. Used when Google
 * omits `refresh_token` on re-auth (`prompt=select_account` with an existing
 * grant) — the prior token remains valid, so sign-in continues seamlessly.
 */
export async function loadRefreshTokenForUser(
  kv: KVNamespace,
  googleSub: string,
  encryptionKeyHex: string,
): Promise<string | null> {
  const sessionId = await kv.get(userKvKey(googleSub));
  if (!sessionId) return null;
  const session = await loadSession(kv, sessionId, encryptionKeyHex).catch(() => null);
  return session?.refreshToken ?? null;
}

export async function deleteSession(kv: KVNamespace, sessionId: string, googleSub: string): Promise<void> {
  await kv.delete(sessionKvKey(sessionId));
  const mapped = await kv.get(userKvKey(googleSub));
  if (mapped === sessionId) await kv.delete(userKvKey(googleSub));
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0`;
}
