/**
 * Cloudflare Worker (or any edge fetch runtime): same-origin proxy for Encore guest
 * Drive reads. Browsers cannot reliably read `files.get` + `alt=media` from
 * `googleapis.com` when Google redirects to `*.googleusercontent.com` (CORS).
 *
 * Deploy with a route like `labs.example.com/__encore/drive-public*` and
 * `labs.example.com/__encore/drive-public-meta*` (or a single `/__encore/*` route).
 *
 * Secrets / vars (Workers dashboard or wrangler.toml):
 *   - GOOGLE_API_KEY — same value as `VITE_GOOGLE_API_KEY` (Drive API enabled)
 *   - ENCORE_DRIVE_PROXY_REFERER (optional) — Referer sent to Google, must match an
 *     HTTP referrer allowlisted on that API key (e.g. `https://labs.example.com/encore/`)
 */
export default {
  /** @param {Request} request */
  /** @param {{ GOOGLE_API_KEY?: string; ENCORE_DRIVE_PROXY_REFERER?: string }} env */
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders(request) });
    }
    const url = new URL(request.url);
    const metaPrefix = '/__encore/drive-public-meta/';
    const mediaPrefix = '/__encore/drive-public/';
    const isMeta = url.pathname.startsWith(metaPrefix);
    const isMedia = url.pathname.startsWith(mediaPrefix);
    if (!isMeta && !isMedia) {
      return new Response('Not found', { status: 404, headers: corsHeaders(request) });
    }
    const prefix = isMeta ? metaPrefix : mediaPrefix;
    const pathPart = decodeURIComponent(url.pathname.slice(prefix.length));
    const fileId = pathPart.split('/')[0] ?? '';
    if (!/^[A-Za-z0-9_-]+$/.test(fileId)) {
      return new Response('Bad file id', { status: 400, headers: corsHeaders(request) });
    }
    const apiKey = (env.GOOGLE_API_KEY ?? '').trim();
    if (!apiKey) {
      return new Response('GOOGLE_API_KEY is not configured on the worker', {
        status: 503,
        headers: corsHeaders(request),
      });
    }
    const referer = (env.ENCORE_DRIVE_PROXY_REFERER ?? '').trim() || `${url.origin}/encore/`;
    const fields = encodeURIComponent('mimeType,name,shortcutDetails');
    const googleUrl = isMeta
      ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=${fields}&supportsAllDrives=false&key=${encodeURIComponent(apiKey)}`
      : `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=false&key=${encodeURIComponent(apiKey)}`;
    try {
      const r = await fetch(googleUrl, {
        cache: 'no-store',
        headers: { Referer: referer },
      });
      const headers = new Headers(corsHeaders(request));
      const ct = r.headers.get('content-type');
      if (ct) headers.set('Content-Type', ct);
      headers.set('Cache-Control', 'no-store');
      return new Response(r.body, { status: r.status, headers });
    } catch {
      return new Response('Upstream Drive request failed', {
        status: 502,
        headers: corsHeaders(request),
      });
    }
  },
};

/** @param {Request} request */
function corsHeaders(request) {
  const origin = request.headers.get('Origin');
  /** @type {Record<string, string>} */
  const h = {
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
  if (origin) {
    h['Access-Control-Allow-Origin'] = origin;
  } else {
    h['Access-Control-Allow-Origin'] = '*';
  }
  h['Access-Control-Max-Age'] = '86400';
  return h;
}
