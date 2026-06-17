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

export type Env = {
  SESSION_KV: KVNamespace;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  SESSION_SIGNING_KEY: string;
  REFRESH_ENCRYPTION_KEY: string;
  ALLOWED_ORIGINS: string;
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
