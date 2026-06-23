import type { Env } from './constants';
import { clientIp } from './http';
import { jsonResponse } from './http';

const DRIVE_FILE_ID = /^[A-Za-z0-9_-]+$/;

export function parsePublicDriveFileId(pathname: string, suffix: 'media' | 'meta'): string | null {
  const match = pathname.match(new RegExp(`^/v1/public-drive/files/([^/]+)/${suffix}$`));
  if (!match?.[1]) return null;
  try {
    const fileId = decodeURIComponent(match[1]);
    return DRIVE_FILE_ID.test(fileId) ? fileId : null;
  } catch {
    return null;
  }
}

function supportsAllDrivesParam(url: URL): 'true' | 'false' {
  return url.searchParams.get('supportsAllDrives') === 'true' ? 'true' : 'false';
}

async function checkPublicDriveRateLimit(kv: KVNamespace, ip: string): Promise<boolean> {
  const nowMs = Date.now();
  const hourStart = Math.floor(nowMs / 3_600_000) * 3_600_000;
  const key = `ratelimit:public-drive:${ip}:${hourStart}`;
  const raw = await kv.get(key);
  const count = raw ? Number.parseInt(raw, 10) : 0;
  if (!Number.isFinite(count) || count >= 300) return false;
  await kv.put(key, String(count + 1), { expirationTtl: 7200 });
  return true;
}

async function fetchGoogleDrive(
  env: Env,
  googleUrl: string,
): Promise<Response> {
  const referer = env.GOOGLE_DRIVE_REFERER?.trim() || 'https://labs.tiffzhang.com/encore/';
  return fetch(googleUrl, {
    redirect: 'follow',
    headers: { Referer: referer },
  });
}

export async function handlePublicDriveMedia(
  request: Request,
  env: Env,
  cors: Headers,
): Promise<Response> {
  const fileId = parsePublicDriveFileId(new URL(request.url).pathname, 'media');
  if (!fileId) {
    return jsonResponse({ error: 'Bad file id.' }, 400, cors);
  }

  const apiKey = env.GOOGLE_API_KEY?.trim();
  if (!apiKey) {
    return jsonResponse({ error: 'Drive proxy is not configured (missing GOOGLE_API_KEY).' }, 503, cors);
  }

  const ip = clientIp(request);
  if (!(await checkPublicDriveRateLimit(env.SESSION_KV, ip))) {
    return jsonResponse({ error: 'Too many Drive requests. Try again later.' }, 429, cors);
  }

  const supportsAllDrives = supportsAllDrivesParam(new URL(request.url));
  const googleUrl =
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}` +
    `?alt=media&supportsAllDrives=${supportsAllDrives}&key=${encodeURIComponent(apiKey)}`;

  const upstream = await fetchGoogleDrive(env, googleUrl);
  const body = await upstream.arrayBuffer();
  const headers = new Headers(cors);
  headers.set('Cache-Control', 'no-store');
  const contentType = upstream.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);
  return new Response(body, { status: upstream.status, headers });
}

export async function handlePublicDriveMeta(
  request: Request,
  env: Env,
  cors: Headers,
): Promise<Response> {
  const fileId = parsePublicDriveFileId(new URL(request.url).pathname, 'meta');
  if (!fileId) {
    return jsonResponse({ error: 'Bad file id.' }, 400, cors);
  }

  const apiKey = env.GOOGLE_API_KEY?.trim();
  if (!apiKey) {
    return jsonResponse({ error: 'Drive proxy is not configured (missing GOOGLE_API_KEY).' }, 503, cors);
  }

  const ip = clientIp(request);
  if (!(await checkPublicDriveRateLimit(env.SESSION_KV, ip))) {
    return jsonResponse({ error: 'Too many Drive requests. Try again later.' }, 429, cors);
  }

  const supportsAllDrives = supportsAllDrivesParam(new URL(request.url));
  const fields = encodeURIComponent('mimeType,name,shortcutDetails');
  const googleUrl =
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}` +
    `?fields=${fields}&supportsAllDrives=${supportsAllDrives}&key=${encodeURIComponent(apiKey)}`;

  const upstream = await fetchGoogleDrive(env, googleUrl);
  const body = await upstream.text();
  const headers = new Headers(cors);
  headers.set('Cache-Control', 'no-store');
  headers.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(body, { status: upstream.status, headers });
}
