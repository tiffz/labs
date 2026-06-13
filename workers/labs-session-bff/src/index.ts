import type { Env } from './constants';
import {
  handleGoogleAccessToken,
  handleGoogleOAuthCallback,
  handleGoogleOAuthPopupDone,
  handleGoogleOAuthStart,
  handleGoogleSignOut,
  handleOptions,
} from './googleOAuth';
import { corsHeaders, jsonResponse, withCors } from './http';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);

    if (request.method === 'OPTIONS') {
      return handleOptions(request, env);
    }

    try {
      if (url.pathname === '/health' && request.method === 'GET') {
        return jsonResponse({ ok: true, service: 'labs-session-bff' }, 200, cors);
      }

      if (url.pathname === '/v1/oauth/google/start' && request.method === 'GET') {
        return handleGoogleOAuthStart(request, env);
      }

      if (url.pathname === '/v1/oauth/google/callback' && request.method === 'GET') {
        return handleGoogleOAuthCallback(request, env);
      }

      if (url.pathname === '/v1/oauth/google/popup-done' && request.method === 'GET') {
        return handleGoogleOAuthPopupDone(request, env);
      }

      if (url.pathname === '/v1/session/google/access-token' && request.method === 'GET') {
        return handleGoogleAccessToken(request, env);
      }

      if (url.pathname === '/v1/session/google/sign-out' && request.method === 'POST') {
        return handleGoogleSignOut(request, env);
      }

      return withCors(jsonResponse({ error: 'Not found.' }, 404, cors), cors);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Internal error.';
      return withCors(jsonResponse({ error: message }, 500, cors), cors);
    }
  },
};
