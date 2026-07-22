/** Matches Encore {@link GOOGLE_SCOPES}, shared {@link LABS_GOOGLE_DRIVE_SESSION_SCOPES}, plus read for Zine Box import. */
export const LABS_GOOGLE_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/youtube.readonly',
].join(' ');

export const LABS_GOOGLE_OAUTH_DONE_PATH = '/google-oauth-done.html';
export const SESSION_COOKIE_NAME = 'labs_session';
export const OAUTH_STATE_TTL_SECONDS = 600;
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

/**
 * Minimal Cloudflare KV surface the BFF actually uses (get/put/delete). Declared
 * locally so these modules typecheck both in the worker build (which loads
 * `@cloudflare/workers-types`) and in the repo-root full typecheck (which does
 * not), where the ambient `KVNamespace` global is unavailable. The real runtime
 * binding is structurally compatible.
 */
export interface KVNamespaceLike {
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number; expiration?: number },
  ): Promise<void>;
  delete(key: string): Promise<void>;
}

export type Env = {
  SESSION_KV: KVNamespaceLike;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  SESSION_SIGNING_KEY: string;
  REFRESH_ENCRYPTION_KEY: string;
  ALLOWED_ORIGINS: string;
  /** Browser Drive API key — server-side only for guest snapshot proxy (never returned to clients). */
  GOOGLE_API_KEY?: string;
  /** Referer sent to Google Drive on proxied guest reads (must match API key HTTP referrer allowlist). */
  GOOGLE_DRIVE_REFERER?: string;
};

export type StoredSessionRecord = {
  sessionId: string;
  googleSub: string;
  email: string;
  displayName: string;
  encryptedRefresh: string;
  scope: string;
  createdAtMs: number;
};

export type OAuthStateRecord = {
  codeVerifier: string;
  returnOrigin: string;
  popup: boolean;
  expiresAtMs: number;
};

export type SessionCookiePayload = {
  sid: string;
  sub: string;
  exp: number;
  iat: number;
};
