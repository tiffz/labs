export class DriveHttpError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: string,
  ) {
    super(message);
    this.name = 'DriveHttpError';
  }
}

/** Extract a human-readable line from a Drive v3 JSON error body (falls back to trimmed text). */
export function summarizeDriveApiErrorBody(body: string, maxLen = 320): string {
  const t = body.trim();
  if (!t) return '';
  try {
    const j = JSON.parse(t) as {
      error?: { message?: string; errors?: Array<{ message?: string; reason?: string }> };
    };
    const primary = j.error?.errors?.[0]?.message || j.error?.message;
    if (primary) return primary.length > maxLen ? `${primary.slice(0, maxLen)}…` : primary;
  } catch {
    /* not JSON */
  }
  return t.length > maxLen ? `${t.slice(0, maxLen)}…` : t;
}

export function isTransientDriveHttpStatus(status: number): boolean {
  return status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

export function formatDriveRequestFailure(method: string, path: string, status: number, body: string): string {
  const detail = summarizeDriveApiErrorBody(body);
  const head = `Drive ${method} ${path} (${status})`;
  if (!detail) return head;
  if (status === 403 && /insufficient|scope|authentication|access denied|forbidden/i.test(detail)) {
    return `${head}: ${detail} If you recently changed Google permissions for Encore, open Account → Sign in again, or Disconnect then sign in.`;
  }
  if (status === 401) {
    return `${head}: ${detail} Open Account (top right), then under Google choose Sign in again.`;
  }
  return `${head}: ${detail}`;
}
