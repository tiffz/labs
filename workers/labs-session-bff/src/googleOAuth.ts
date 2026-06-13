import {
  LABS_GOOGLE_OAUTH_DONE_PATH,
  LABS_GOOGLE_OAUTH_SCOPES,
  OAUTH_STATE_TTL_SECONDS,
  type Env,
  type OAuthStateRecord,
} from './constants';
import { pkceChallengeFromVerifier, pkceVerifier, randomToken } from './crypto';
import { buildSessionCookie, clearSessionCookie, deleteSession, loadSession, parseSessionCookie, storeSession } from './session';
import { checkRefreshRateLimit } from './rateLimit';
import { clientIp, corsHeaders, jsonResponse, parseAllowedOrigins } from './http';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

function oauthStateKey(state: string): string {
  return `oauth:state:${state}`;
}

function isAllowedReturnOrigin(origin: string, env: Env): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    return parseAllowedOrigins(env.ALLOWED_ORIGINS).has(url.origin);
  } catch {
    return false;
  }
}

function callbackUrl(request: Request): string {
  const url = new URL(request.url);
  return `${url.origin}/v1/oauth/google/callback`;
}

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfo = {
  sub?: string;
  email?: string;
  name?: string;
};

async function exchangeGoogleCode(input: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    code: input.code,
    client_id: input.clientId,
    client_secret: input.clientSecret,
    redirect_uri: input.redirectUri,
    grant_type: 'authorization_code',
    code_verifier: input.codeVerifier,
  });
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  return (await res.json()) as GoogleTokenResponse;
}

async function refreshGoogleAccessToken(input: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    refresh_token: input.refreshToken,
    client_id: input.clientId,
    client_secret: input.clientSecret,
    grant_type: 'refresh_token',
  });
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  return (await res.json()) as GoogleTokenResponse;
}

async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Could not load Google profile.');
  return (await res.json()) as GoogleUserInfo;
}

function popupDoneRedirectUrl(returnOrigin: string, error?: string): string {
  const url = new URL(`${returnOrigin}${LABS_GOOGLE_OAUTH_DONE_PATH}`);
  if (error) url.searchParams.set('error', error);
  return url.toString();
}

function popupDoneResponse(input: {
  returnOrigin: string;
  popup: boolean;
  cookie?: string;
  error?: string;
  /** Legacy inline HTML when popup mode is off. */
  html?: string;
}): Response {
  const headers = new Headers();
  if (input.cookie) headers.append('Set-Cookie', input.cookie);

  if (input.popup) {
    headers.set('Location', popupDoneRedirectUrl(input.returnOrigin, input.error));
    return new Response(null, { status: 302, headers });
  }

  headers.set('Content-Type', 'text/html; charset=utf-8');
  return new Response(input.html ?? 'Sign-in finished.', { status: 200, headers });
}

export async function handleGoogleOAuthStart(request: Request, env: Env): Promise<Response> {
  const cors = corsHeaders(request, env);
  const url = new URL(request.url);
  const returnOrigin = url.searchParams.get('return_origin')?.trim() ?? '';
  const popup = url.searchParams.get('popup') === '1';

  if (!returnOrigin || !isAllowedReturnOrigin(returnOrigin, env)) {
    return jsonResponse({ error: 'Invalid return_origin.' }, 400, cors);
  }
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return jsonResponse({ error: 'Google OAuth is not configured on the session worker.' }, 503, cors);
  }

  const state = randomToken(24);
  const codeVerifier = pkceVerifier();
  const codeChallenge = await pkceChallengeFromVerifier(codeVerifier);
  const record: OAuthStateRecord = {
    codeVerifier,
    returnOrigin,
    popup,
    expiresAtMs: Date.now() + OAUTH_STATE_TTL_SECONDS * 1000,
  };
  await env.SESSION_KV.put(oauthStateKey(state), JSON.stringify(record), {
    expirationTtl: OAUTH_STATE_TTL_SECONDS,
  });

  const authUrl = new URL(GOOGLE_AUTH_URL);
  authUrl.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', callbackUrl(request));
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', LABS_GOOGLE_OAUTH_SCOPES);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('include_granted_scopes', 'true');

  return jsonResponse({ authUrl: authUrl.toString() }, 200, cors);
}

export async function handleGoogleOAuthCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  if (!state) {
    return new Response('Missing OAuth state.', { status: 400 });
  }

  const rawState = await env.SESSION_KV.get(oauthStateKey(state));
  await env.SESSION_KV.delete(oauthStateKey(state));
  if (!rawState) {
    return new Response('OAuth state expired. Try signing in again.', { status: 400 });
  }
  const stateRecord = JSON.parse(rawState) as OAuthStateRecord;
  if (stateRecord.expiresAtMs <= Date.now()) {
    return new Response('OAuth state expired. Try signing in again.', { status: 400 });
  }

  if (oauthError || !code) {
    return popupDoneResponse({
      returnOrigin: stateRecord.returnOrigin,
      popup: stateRecord.popup,
      error: oauthError ?? 'Sign-in was cancelled.',
    });
  }

  const token = await exchangeGoogleCode({
    code,
    codeVerifier: stateRecord.codeVerifier,
    redirectUri: callbackUrl(request),
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  });

  if (!token.access_token) {
    return popupDoneResponse({
      returnOrigin: stateRecord.returnOrigin,
      popup: stateRecord.popup,
      error: token.error_description ?? token.error ?? 'Token exchange failed.',
    });
  }

  const profile = await fetchGoogleUserInfo(token.access_token);
  if (!profile.sub || !profile.email) {
    return popupDoneResponse({
      returnOrigin: stateRecord.returnOrigin,
      popup: stateRecord.popup,
      error: 'Google profile missing required fields.',
    });
  }

  if (!token.refresh_token) {
    return popupDoneResponse({
      returnOrigin: stateRecord.returnOrigin,
      popup: stateRecord.popup,
      error:
        'Google did not return a refresh token. Revoke app access in Google Account settings and try again.',
    });
  }

  const sessionId = await storeSession(env.SESSION_KV, {
    googleSub: profile.sub,
    email: profile.email,
    displayName: profile.name?.trim() || profile.email,
    refreshToken: token.refresh_token,
    scope: token.scope ?? LABS_GOOGLE_OAUTH_SCOPES,
    encryptionKeyHex: env.REFRESH_ENCRYPTION_KEY,
  });
  const cookie = await buildSessionCookie(sessionId, profile.sub, env.SESSION_SIGNING_KEY);

  return popupDoneResponse({
    returnOrigin: stateRecord.returnOrigin,
    popup: stateRecord.popup,
    cookie,
  });
}

export async function handleGoogleAccessToken(request: Request, env: Env): Promise<Response> {
  const cors = corsHeaders(request, env);
  const cookiePayload = await parseSessionCookie(request.headers.get('Cookie'), env.SESSION_SIGNING_KEY);
  if (!cookiePayload) {
    return jsonResponse({ error: 'Not signed in.' }, 401, cors);
  }

  const rate = await checkRefreshRateLimit(env.SESSION_KV, cookiePayload.sid, clientIp(request));
  if (!rate.allowed) {
    return jsonResponse({ error: rate.reason ?? 'Rate limited.' }, 429, cors);
  }

  const session = await loadSession(env.SESSION_KV, cookiePayload.sid, env.REFRESH_ENCRYPTION_KEY);
  if (!session) {
    return jsonResponse({ error: 'Session expired.' }, 401, cors);
  }

  const token = await refreshGoogleAccessToken({
    refreshToken: session.refreshToken,
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  });

  if (!token.access_token) {
    return jsonResponse(
      { error: token.error_description ?? token.error ?? 'Refresh failed.' },
      401,
      cors,
    );
  }

  const expiresIn = token.expires_in ?? 3600;
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
  return jsonResponse(
    {
      access_token: token.access_token,
      expires_in: expiresIn,
      expires_at: expiresAt,
      email: session.email,
      display_name: session.displayName,
    },
    200,
    cors,
  );
}

export async function handleGoogleSignOut(request: Request, env: Env): Promise<Response> {
  const cors = corsHeaders(request, env);
  const cookiePayload = await parseSessionCookie(request.headers.get('Cookie'), env.SESSION_SIGNING_KEY);
  if (cookiePayload) {
    await deleteSession(env.SESSION_KV, cookiePayload.sid, cookiePayload.sub);
  }
  const headers = new Headers(cors);
  headers.append('Set-Cookie', clearSessionCookie());
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers,
  });
}

export function handleOptions(request: Request, env: Env): Response {
  return withCors(new Response(null, { status: 204 }), corsHeaders(request, env));
}
