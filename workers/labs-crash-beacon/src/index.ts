export type Env = {
  CRASH_KV: KVNamespace;
  ALLOWED_ORIGINS: string;
};

type CrashPayload = {
  appId?: string;
  source?: string;
  message?: string;
  route?: string;
  timestamp?: number;
};

function corsHeaders(request: Request, env: Env): HeadersInit {
  const origin = request.headers.get('Origin') ?? '';
  const allowed = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  const match = allowed.includes(origin) ? origin : allowed[0] ?? '';
  return {
    'Access-Control-Allow-Origin': match,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

function json(data: unknown, status: number, cors: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

function sanitizePayload(raw: CrashPayload): Required<Pick<CrashPayload, 'appId' | 'source' | 'message' | 'route'>> & {
  timestamp: number;
} {
  return {
    appId: (raw.appId ?? 'unknown').slice(0, 64),
    source: (raw.source ?? 'unknown').slice(0, 64),
    message: (raw.message ?? 'Unknown error').slice(0, 500),
    route: (raw.route ?? '/').slice(0, 256),
    timestamp: typeof raw.timestamp === 'number' ? raw.timestamp : Date.now(),
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(request, env);
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname === '/health' && request.method === 'GET') {
      return json({ ok: true, service: 'labs-crash-beacon' }, 200, cors);
    }

    if (url.pathname === '/v1/crash' && request.method === 'POST') {
      let body: CrashPayload;
      try {
        body = (await request.json()) as CrashPayload;
      } catch {
        return json({ error: 'Invalid JSON' }, 400, cors);
      }

      const entry = sanitizePayload(body);
      const day = new Date(entry.timestamp).toISOString().slice(0, 10);
      const countKey = `count:${day}:${entry.appId}:${entry.source}`;
      const existing = await env.CRASH_KV.get(countKey);
      const next = String(Number(existing ?? '0') + 1);
      await env.CRASH_KV.put(countKey, next, { expirationTtl: 60 * 60 * 24 * 90 });

      const logKey = `log:${day}:${crypto.randomUUID()}`;
      await env.CRASH_KV.put(logKey, JSON.stringify(entry), { expirationTtl: 60 * 60 * 24 * 30 });

      return json({ ok: true }, 202, cors);
    }

    return json({ error: 'Not found' }, 404, cors);
  },
};
